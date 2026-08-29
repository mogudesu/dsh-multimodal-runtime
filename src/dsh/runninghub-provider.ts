/**
 * RunningHubProvider - RunningHub 云端 GPU 执行（双模式）：
 * A) 自定义工作流：POST /task/openapi/create {apiKey, workflow, nodeInfoList:[{nodeId,fieldName,fieldValue}]}
 *    状态 /task/openapi/status -> data.taskStatus（QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELED）
 *    输出 /task/openapi/outputs -> data.outputs（fileUrl/fileType）
 * B) 标准模型端点：POST /openapi/v2/{recipe.run.endpoint}（Bearer）-> data.taskId，
 * C) 应用：POST /task/openapi/createTaskById {apiKey, taskId=appId, nodeInfo:[{nodeId,fieldName,fieldValue}]}，
 *    状态/输出复用 task/openapi/status 与 outputs（句柄 rh-app:{taskId}）。
 *    状态 /openapi/v2/query {taskId} -> status SUCCESS/FAILED + results[]
 * 认证双轨：v2/* 与 accountStatus 走 Bearer 头；task/* 走 body apiKey 字段。
 * 资产上传：input 引用走 /task/openapi/upload（表单）；端点入参走 /openapi/v2/media/upload/binary。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { MediaAsset, MediaCapability, MediaExecution, MediaExecutionState } from '../core/index.js'
import { MediaError } from '../core/index.js'
import type { AssetRegistry, MappingTarget, RecipeRegistry, WorkflowNodeMapping } from '../core/index.js'
import type { MediaExecutionHandle, MediaExecutionRequest, ProviderHealth } from './comfy-provider.js'
import { applyInputsToWorkflow } from './comfy-provider.js'
import type { FetchOutputsMeta, MediaProvider } from './media-provider.js'
import { extFromUrlOrType } from './media-provider.js'

export interface RhNodeInfo {
  nodeId: string
  fieldName: string
  fieldValue: string
}

export interface RunningHubProviderOptions {
  apiKey?: string
  /** 动态取 Key（管理页保存后热生效，优先于静态 apiKey）。 */
  /** 动态取 Key（scope=consumer 走工作流/AI 应用；enterprise 走模型 API v2）。 */
  resolveApiKey?: (scope: 'consumer' | 'enterprise', region?: RunningHubRegion) => string | undefined
  resolveBaseUrl?: (region: RunningHubRegion) => string | undefined
  baseUrl?: string
  assetRegistry: AssetRegistry
  pollIntervalMs?: number
  jobTimeoutMs?: number
}

export type RunningHubRegion = 'cn' | 'global'

interface WorkflowNode {
  class_type: string
  inputs?: Record<string, unknown>
}

function strOf(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

/** 积分/余额不足语义判定（RH code 433 或消息匹配；含 code=433 形态的消息）。 */
export function isInsufficientCredits(msgOrCode: string | number): boolean {
  if (typeof msgOrCode === 'number') return msgOrCode === 433
  return /积分|余额不足|insufficient\s*(credit|balance)?|not\s*enough\s*credit|code\s*=\s*433/i.test(msgOrCode)
}

/** 积分不足错误消息追加中文指引（不得静默换工作流重试）。 */
export function decorateInsufficient(msg: string): string {
  if (!isInsufficientCredits(msg)) return msg
  // 已含指引的错误消息（如轮询阶段的 errorMsg 已装饰过）不再重复追加
  if (msg.includes('充值') || msg.includes('请勿改用其他工作流')) return msg
  return `${msg}（RunningHub 积分/余额不足，请前往 RunningHub 控制台充值后重试；请勿改用其他工作流或工具重试）`
}

/** 槽位顺序：image=1, image2=2, image10=10 ... */
function slotOrder(slot: string): number {
  const m = slot.match(/(\d+)$/)
  return m ? Number(m[1]) : 1
}

/** 显式映射 -> nodeInfoList：标量取 effective inputs，资产槽位取上传后的 RH 文件名。 */
export function buildNodeInfoList(
  mapping: WorkflowNodeMapping,
  inputs: Record<string, unknown>,
  uploads: Record<string, string>,
): RhNodeInfo[] {
  const list: RhNodeInfo[] = []
  const push = (t: MappingTarget | undefined, fieldFallback: string, value: unknown): void => {
    if (!t || value === undefined || value === null || value === '') return
    list.push({ nodeId: String(t.node), fieldName: String(t.field ?? fieldFallback), fieldValue: String(value) })
  }
  push(mapping.prompt, 'text', inputs['prompt'])
  push(mapping.negativePrompt, 'text', inputs['negative_prompt'])
  mapping.images?.forEach((t, i) => push(t, 'image', uploads[i === 0 ? 'image' : `image${i + 1}`]))
  mapping.audios?.forEach((t, i) => push(t, 'audio', uploads[i === 0 ? 'audio' : `audio${i + 1}`]))
  mapping.videos?.forEach((t, i) => push(t, 'video', uploads[i === 0 ? 'video' : `video${i + 1}`]))
  for (const [k, t] of Object.entries(mapping.params ?? {})) {
    push(t, k, inputs[k])
  }
  return list
}


/** 暴露参数默认值补齐：effective 缺失/空值的键用 exposedParams.default 兜底（云端模型参数自动解析配套）。 */
export function applyExposedDefaults(
  mapping: WorkflowNodeMapping | null | undefined,
  effective: Record<string, unknown>,
): void {
  const list = mapping?.exposedParams
  if (!Array.isArray(list)) return
  for (const p of list) {
    if (!p || !p.field) continue
    const cur = effective[p.field]
    if (cur === undefined || cur === null || cur === '') {
      const d = p.default
      if (d !== undefined && d !== null && d !== '') effective[p.field] = d
    }
  }
}

/** 端点资产对位：第 n 个同类媒体 schema ↔ 第 n 个同类资产槽位（image/image2/...，slotOrder 排序）。 */
export function endpointAssetSlots(
  schemas: Array<{ name: string; type: string }>,
  assetInputs: Record<string, string>,
): Array<{ name: string; localPath: string }> {
  const byType = new Map<string, Array<{ slot: string; path: string }>>()
  for (const [slot, path] of Object.entries(assetInputs)) {
    const t = slot.replace(/\d+$/, '') || 'image'
    byType.set(t, [...(byType.get(t) ?? []), { slot, path }])
  }
  for (const list of byType.values()) list.sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot))
  const counters = new Map<string, number>()
  const out: Array<{ name: string; localPath: string }> = []
  for (const s of schemas) {
    const t = s.type
    if (t !== 'image' && t !== 'video' && t !== 'audio') continue
    const list = byType.get(t)
    if (!list || list.length === 0) continue
    const n = counters.get(t) ?? 0
    const item = list[n]
    if (item) out.push({ name: s.name, localPath: item.path })
    counters.set(t, n + 1)
  }
  return out
}

/** 无显式映射的应用兜底：约定 nodeId 39（RunningHub 应用通用输入节点），prompt→text、图片按序→image。 */
export function defaultAppNodeInfo(effective: Record<string, unknown>, uploads: Record<string, string>): RhNodeInfo[] {
  const list: RhNodeInfo[] = []
  const prompt = effective['prompt']
  if (typeof prompt === 'string' && prompt.length > 0) {
    list.push({ nodeId: '39', fieldName: 'text', fieldValue: prompt })
  }
  const imageSlots = Object.keys(uploads)
    .filter((s) => s.startsWith('image'))
    .sort((a, b) => slotOrder(a) - slotOrder(b))
  for (const slot of imageSlots) {
    list.push({ nodeId: '39', fieldName: 'image', fieldValue: uploads[slot] ?? '' })
  }
  return list
}
/** 无显式映射时的兜底：把上传文件名按序写入 LoadImage 类节点（img2img 最常见场景）。 */
function injectAssetFilenames(workflow: Record<string, WorkflowNode>, uploads: Record<string, string>): number {
  let applied = 0
  const loadImageNodes = Object.values(workflow).filter(
    (n) => n && typeof n.class_type === 'string' && n.class_type.startsWith('LoadImage'),
  )
  const slots = Object.keys(uploads)
    .filter((s) => s.startsWith('image'))
    .sort((a, b) => slotOrder(a) - slotOrder(b))
  for (const [i, slot] of slots.entries()) {
    const node = loadImageNodes[i]
    if (node?.inputs && typeof node.inputs['image'] === 'string') {
      node.inputs['image'] = uploads[slot] ?? ''
      applied++
    }
  }
  return applied
}

function collectFileResults(v: unknown, out: Array<{ url: string; type?: string }>): void {
  if (Array.isArray(v)) {
    for (const x of v) collectFileResults(x, out)
    return
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const url = strOf(o, ['url', 'fileUrl', 'file_url', 'download_url', 'resultUrl'])
    if (url && /^https?:\/\//.test(url)) {
      out.push({ url, type: strOf(o, ['fileType', 'file_type', 'type']) })
      return
    }
    for (const x of Object.values(o)) collectFileResults(x, out)
    return
  }
  if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push({ url: v })
}

function inferMediaType(path: string): MediaAsset['type'] {
  if (/\.(mp4|mov|webm|mkv|avi)$/i.test(path)) return 'video'
  if (/\.(wav|mp3|flac|m4a|ogg|aac)$/i.test(path)) return 'audio'
  if (/\.(glb|gltf|fbx|obj|stl)$/i.test(path)) return '3d'
  return 'image'
}

function classifyFailure(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('apikey') || m.includes('api key') || m.includes('401')) return 'MODEL_MISSING'
  if (m.includes('timeout')) return 'TIMEOUT'
  return 'EXECUTION_FAILED'
}

export class RunningHubProvider implements MediaProvider {
  readonly id = 'runninghub'
  private readonly baseUrl: string
  private readonly pollIntervalMs: number
  private readonly jobTimeoutMs: number

  constructor(private readonly opts: RunningHubProviderOptions) {
    this.baseUrl = (opts.baseUrl ?? 'https://www.runninghub.cn').replace(/\/$/, '')
    this.pollIntervalMs = opts.pollIntervalMs ?? 3000
    this.jobTimeoutMs = opts.jobTimeoutMs ?? 60 * 60 * 1000
  }

  /** 现取 Key：管理页保存 / 环境变量变化后无需重启即生效。scope 决定消费级/企业级槽位。 */
  private key(scope: 'consumer' | 'enterprise' = 'consumer', region: RunningHubRegion = 'cn'): string | undefined {
    return this.opts.resolveApiKey?.(scope, region) ?? this.opts.apiKey
  }

  private base(region: RunningHubRegion): string {
    const resolved = this.opts.resolveBaseUrl?.(region) ?? (region === 'global' ? 'https://www.runninghub.ai' : this.baseUrl)
    return resolved.replace(/\/+$/, '')
  }

  /** RH 响应统一 {code, msg, data}；网络层失败抛 PROVIDER_OFFLINE。 */
  private async post(
    pathname: string,
    body: Record<string, unknown>,
    withBearer: boolean,
    scope: 'consumer' | 'enterprise' = 'consumer',
    region: RunningHubRegion = 'cn',
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (withBearer) headers['Authorization'] = `Bearer ${this.key(scope, region)}`
    let res: Response
    try {
      res = await fetch(`${this.base(region)}${pathname}`, { method: 'POST', headers, body: JSON.stringify(body) })
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `RunningHub ${pathname} 请求失败: ${String(err)}`, { retryable: true })
    }
    return (await res.json().catch(() => ({}))) as Record<string, unknown>
  }

  private expectOk(json: Record<string, unknown>, action: string): Record<string, unknown> {
    const code = Number(json['code'] ?? -1)
    if (code !== 0) {
      const msg = String(json['msg'] ?? json['message'] ?? JSON.stringify(json).slice(0, 200))
      // 积分/余额不足（RH code 433 或语义匹配）：显式中文指引，且不可重试
      //（用户要求：积分不足必须直接报错，不得静默换其他工作流/生成器）
      const insufficient = isInsufficientCredits(code) || isInsufficientCredits(msg)
      const suffix = insufficient ? '（RunningHub 积分/余额不足，请前往 RunningHub 控制台充值后重试；请勿改用其他工作流或工具重试）' : ''
      throw new MediaError('EXECUTION_FAILED', `RunningHub ${action} 失败(code=${code}): ${msg}${suffix}`, {
        retryable: !insufficient && code >= 500,
      })
    }
    const d = json['data']
    if (typeof d === 'string') return { taskStatus: d }
    return (d ?? {}) as Record<string, unknown>
  }

  async healthCheck(): Promise<ProviderHealth> {
    const apiKey = this.key('consumer')
    if (!apiKey) {
      return { online: false, detail: '未配置 RunningHub API Key（管理页填写或设环境变量 RUNNINGHUB_API_KEY / RUNNINGHUB_ENTERPRISE_API_KEY）' }
    }
    try {
      // 注意：accountStatus 的 key 字段为全小写 apikey，且同时需带 Bearer 头（与 rh_cli 行为一致）。
      const data = this.expectOk(await this.post('/uc/openapi/accountStatus', { apikey: apiKey }, true, 'consumer', 'cn'), 'accountStatus')
      const moneyRaw = data['remainMoney']
      const tasksRaw = data['currentTaskCounts']
      const money = typeof moneyRaw === 'number' || typeof moneyRaw === 'string' ? String(moneyRaw) : '?'
      const detail =
        typeof tasksRaw === 'number' || typeof tasksRaw === 'string' ? `余额 ${money}；进行中任务 ${tasksRaw}` : `余额 ${money}`
      return { online: true, detail, serverInfo: data }
    } catch (err) {
      return { online: false, detail: err instanceof Error ? err.message : String(err) }
    }
  }

  async getCapabilities(recipes: RecipeRegistry): Promise<MediaCapability[]> {
    const caps: MediaCapability[] = []
    for (const r of recipes.list()) {
      if (r.provider !== this.id) continue
      for (const type of r.capability) {
        const region = r.run?.region ?? 'cn'
        caps.push({
          id: `${type}@${r.id}`,
          type,
          provider: this.id,
          recipeId: r.id,
          inputs: r.inputs,
          outputs: r.outputs,
          available: Boolean(this.key('consumer', region) || this.key('enterprise', region)),
          constraints: r.constraints,
        })
      }
    }
    return caps
  }

  async execute(request: MediaExecutionRequest): Promise<MediaExecutionHandle> {
    const preferredRegion = request.recipe.run?.region ?? 'cn'
    const needEnterprise = Boolean(request.recipe.run?.endpoint)
    const scope = needEnterprise ? 'enterprise' : 'consumer'
    // 区域兜底：配方 region 没配 Key 而另一区域有时，切到有 Key 的区域执行——
    // 实测国际版用户导入的配方带 region=cn 旧默认值时，请求会打到 .cn 站导致
    // 应用不存在/任务失败，而国际版控制台查不到任何记录。
    let region = preferredRegion
    if (!this.key(scope, region)) {
      const alternate: RunningHubRegion = region === 'cn' ? 'global' : 'cn'
      if (this.key(scope, alternate)) region = alternate
    }
    if (!this.key(scope, region)) {
      throw new MediaError(
        'MODEL_MISSING',
        needEnterprise
          ? 'RunningHub 企业级 API Key 未配置（模型 API 仅支持企业级-共享 Key，管理页填写或设环境变量 RUNNINGHUB_ENTERPRISE_API_KEY）'
          : 'RunningHub API Key 未配置（管理页或环境变量 RUNNINGHUB_API_KEY）',
        { retryable: false },
      )
    }
    const effective: Record<string, unknown> = { ...(request.defaults ?? {}) }
    for (const [k, v] of Object.entries(request.inputs ?? {})) {
      if (v !== undefined && v !== null) effective[k] = v
    }
    // recipe.run.endpoint 优先（标准模型端点模式 B）；其次平台工作流模板（workflowId，
    // 当前 create 主契约）；本地裸 JSON 仅作旧版兜底——RH 网关已收紧，裸 JSON 提交返回
    // code 404 NOT_FOUND（实测），必须使用平台模板 ID。
    if (request.recipe.run?.appId) return this.executeApp(request, effective, region)
    if (request.recipe.run?.endpoint) return this.executeEndpoint(request, effective, region)
    if (request.recipe.run?.workflowId) return this.executeWorkflowById(request, effective, region)
    return this.executeWorkflow(request, effective, region)
  }

  /** 模式 A2：平台工作流模板执行（/task/openapi/create + workflowId，当前主契约）。 */
  private async executeWorkflowById(
    request: MediaExecutionRequest,
    effective: Record<string, unknown>,
    region: RunningHubRegion,
  ): Promise<MediaExecutionHandle> {
    const workflowId = String(request.recipe.run?.workflowId ?? '').trim()
    if (!workflowId) {
      throw new MediaError('INPUT_INVALID', `Recipe ${request.recipe.id} 缺少 RunningHub 工作流模板 ID（run.workflowId）`, {
        retryable: false,
      })
    }
    applyExposedDefaults(request.recipe.nodeMapping, effective)
    const uploads: Record<string, string> = {}
    for (const [slot, localPath] of Object.entries(request.assetInputs)) {
      uploads[slot] = await this.uploadInput(localPath, region)
    }
    const nodeInfoList = request.recipe.nodeMapping
      ? buildNodeInfoList(request.recipe.nodeMapping as WorkflowNodeMapping, effective, uploads)
      : defaultAppNodeInfo(effective, uploads)
    const data = this.expectOk(
      await this.post('/task/openapi/create', {
        apiKey: this.key('consumer', region) ?? '',
        workflowId,
        nodeInfoList,
      }, true, 'consumer', region),
      'create',
    )
    const tid = strOf(data, ['taskId', 'task_id', 'promptId', 'prompt_id'])
    if (!tid) {
      throw new MediaError('EXECUTION_FAILED', `/task/openapi/create 未返回 taskId: ${JSON.stringify(data).slice(0, 200)}`, {
        retryable: true,
      })
    }
    return { providerExecutionId: `rh-${region}-task:${tid}`, state: 'queued', assetUploads: uploads }
  }

  /** 模式 A：自定义 ComfyUI 工作流云执行（/task/openapi/create）。 */
  private async executeWorkflow(
    request: MediaExecutionRequest,
    effective: Record<string, unknown>,
    region: RunningHubRegion,
  ): Promise<MediaExecutionHandle> {
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(request.workflowPath, 'utf8'))
    } catch (err) {
      throw new MediaError('WORKFLOW_INVALID', `RunningHub 工作流不可读: ${request.workflowPath} (${String(err)})`, {
        retryable: false,
      })
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new MediaError('WORKFLOW_INVALID', 'workflow 不是 API 格式 JSON 对象', { retryable: false })
    }
    const uploads: Record<string, string> = {}
    for (const [slot, localPath] of Object.entries(request.assetInputs)) {
      uploads[slot] = await this.uploadInput(localPath, region)
    }
    let payload: unknown = raw
    let nodeInfoList: RhNodeInfo[] = []
    if (request.recipe.nodeMapping) {
      // 显式映射：workflow 保持原样，字段覆盖全部交给 nodeInfoList。
      nodeInfoList = buildNodeInfoList(request.recipe.nodeMapping, effective, uploads)
    } else {
      // 兜底：启发式注入 prompt/尺寸/seed 等 + LoadImage 文件名，nodeInfoList 为空。
      const injected = applyInputsToWorkflow(raw, effective)
      injectAssetFilenames(injected.workflow, uploads)
      payload = injected.workflow
    }
    const data = this.expectOk(
      await this.post('/task/openapi/create', { apiKey: this.key('consumer', region) ?? '', workflow: payload, nodeInfoList }, false, 'consumer', region),
      'create',
    )
    const tid = strOf(data, ['taskId', 'task_id', 'promptId', 'prompt_id'])
    if (!tid) {
      throw new MediaError('EXECUTION_FAILED', `/task/openapi/create 未返回 taskId: ${JSON.stringify(data).slice(0, 200)}`, {
        retryable: true,
      })
    }
    return { providerExecutionId: `rh-${region}-task:${tid}`, state: 'queued', assetUploads: uploads }
  }

  /** 模式 C：应用云执行（/task/openapi/createTaskById）。nodeInfo 由 nodeMapping 构建，缺省约定 nodeId 39。 */
  private async executeApp(
    request: MediaExecutionRequest,
    effective: Record<string, unknown>,
    region: RunningHubRegion,
  ): Promise<MediaExecutionHandle> {
    const appId = String(request.recipe.run?.appId ?? '')
    if (!appId) {
      throw new MediaError('INPUT_INVALID', `Recipe ${request.recipe.id} 缺少 RunningHub 应用 ID`, { retryable: false })
    }
    applyExposedDefaults(request.recipe.nodeMapping, effective)
    // 旧映射 duration-like 参数键（如'秒数'/seconds）别名兜底：前端时长滑块统一提交
    // inputs.duration，这里复制到 duration-like 参数键——旧 recipe 无需重新导入即可让
    // 用户设置的时长到达节点（否则节点用默认 1s 生成）。
    if (!Array.isArray(request.recipe.nodeMapping)) {
      for (const [k, t] of Object.entries(
        (request.recipe.nodeMapping as WorkflowNodeMapping | undefined)?.params ?? {},
      )) {
        const field = (t as { field?: string } | undefined)?.field ?? k
        if (/秒|second|duration/i.test(field) && !/resolution|rate|speed/i.test(field)) {
          const dv = effective['duration']
          if (dv !== undefined && effective[k] === undefined) effective[k] = dv
        }
      }
    }
    const uploads: Record<string, string> = {}
    for (const [slot, localPath] of Object.entries(request.assetInputs)) {
      uploads[slot] = await this.uploadInput(localPath, region)
    }
    const nodeInfo = Array.isArray(request.recipe.nodeMapping)
      ? (request.recipe.nodeMapping as RhNodeInfo[]).map((item) => {
          if (item.fieldName === 'image' && uploads['image']) {
            return { ...item, fieldValue: uploads['image'] }
          }
          return item
        })
      : request.recipe.nodeMapping
        ? buildNodeInfoList(request.recipe.nodeMapping as WorkflowNodeMapping, effective, uploads)
        : defaultAppNodeInfo(effective, uploads)
    let data: unknown
    try {
      data = this.expectOk(
        await this.post('/task/openapi/ai-app/run', {
          apiKey: this.key('consumer', region) ?? '',
          webappId: appId,
          nodeInfoList: nodeInfo,
        }, false, 'consumer', region),
        'ai-app/run',
      )
    } catch {
      data = this.expectOk(
        await this.post('/task/openapi/createTaskById', {
          apiKey: this.key('consumer', region) ?? '',
          taskId: appId,
          nodeInfo,
        }, false, 'consumer', region),
        'createTaskById',
      )
    }
    const tid = strOf(data, ['taskId', 'task_id', 'promptId', 'prompt_id'])
    if (!tid) {
      throw new MediaError('EXECUTION_FAILED', `RunningHub AI 应用未返回 taskId: ${JSON.stringify(data).slice(0, 200)}`, {
        retryable: true,
      })
    }
    return { providerExecutionId: `rh-${region}-app:${tid}`, state: 'queued', assetUploads: uploads }
  }
  /** 模式 B：标准模型端点（/openapi/v2/{endpoint}）。recipe.inputs[].name 即 API 参数名。 */
  private async executeEndpoint(
    request: MediaExecutionRequest,
    effective: Record<string, unknown>,
    region: RunningHubRegion,
  ): Promise<MediaExecutionHandle> {
    applyExposedDefaults(request.recipe.nodeMapping, effective)
    const endpoint = String(request.recipe.run?.endpoint ?? '').replace(/^\/+/, '')
    const input: Record<string, unknown> = {}
    // 资产 schema 按类型对位：第 n 个同类 schema ↔ 第 n 个同类资产（image/image2/...），uploadBinary 换 URL。
    for (const { name, localPath } of endpointAssetSlots(request.recipe.inputs, request.assetInputs)) {
      const url = /^https?:\/\//.test(localPath) ? localPath : await this.uploadBinary(localPath, region)
      // RH 模型 API 约定：字段名以 Urls 结尾（imageUrls/audioUrls...）传数组，单数传字符串
      input[name] = /urls$/i.test(name) ? [url] : url
    }
    for (const schema of request.recipe.inputs) {
      if (input[schema.name] !== undefined) continue
      // prompt 别名：schema 名 prompt-like（非 negative）但 effective 缺失时回退 effective['prompt']。
      const promptLike = /prompt|text/i.test(schema.name) && !/negative/i.test(schema.name)
      const v = promptLike && (effective[schema.name] === undefined || effective[schema.name] === null || effective[schema.name] === '')
        ? effective['prompt']
        : effective[schema.name]
      if (v === undefined || v === null || v === '') continue
      if (schema.type === 'image' || schema.type === 'video' || schema.type === 'audio') {
        const s = String(v)
        input[schema.name] = /^https?:\/\//.test(s) ? s : await this.uploadBinary(s, region)
      } else if (schema.type === 'boolean') {
        // BOOLEAN 字符串 'true'/'false' 归真布尔（暴露参数 select 提交的是字符串）。
        input[schema.name] = v === true || v === 'true'
      } else {
        input[schema.name] = v
      }
    }
    for (const [k, v] of Object.entries(effective)) {
      if (k.startsWith('__')) continue
      if (input[k] !== undefined) continue
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') input[k] = v
    }
    const model = request.recipe.run?.model ?? (typeof effective['model'] === 'string' ? effective['model'] : undefined)
    if (model) input['model'] = model
    // v2 模型端点的响应没有 code 字段（{taskId,status,errorCode,errorMessage,...}），
    // 不能走 expectOk——实测 v2 创建成功（QUEUED）会被误判为 code=-1 失败，云端留下
    // 孤儿任务、本地报 EXECUTION_FAILED。
    const json = await this.post(`/openapi/v2/${endpoint}`, input, true, 'enterprise', region)
    const v2 = (Array.isArray(json) ? json[0] : json) as Record<string, unknown>
    const v2Error = strOf(v2, ['errorMessage', 'errorCode', 'msg'])
    const tid = strOf(v2, ['taskId', 'task_id', 'id'])
    if (!tid || v2Error) {
      throw new MediaError(
        'EXECUTION_FAILED',
        `RunningHub openapi/v2/${endpoint} 失败: ${JSON.stringify(json).slice(0, 260)}`,
        { retryable: false },
      )
    }
    return { providerExecutionId: `rh-${region}-v2:${tid}`, state: 'queued' }
  }

  /** 上传本地资产到 RH input 目录（表单 apiKey + fileType=input + file -> data.fileName）。 */
  private async uploadInput(localPath: string, region: RunningHubRegion): Promise<string> {
    const buf = await readFile(localPath).catch(() => {
      throw new MediaError('OUTPUT_MISSING', `资产文件不可读: ${localPath}`, { retryable: false })
    })
    const fd = new FormData()
    fd.append('apiKey', this.key('consumer', region) ?? '')
    fd.append('fileType', 'input')
    fd.append('file', new Blob([new Uint8Array(buf)]), basename(localPath))
    let res: Response
    try {
      res = await fetch(`${this.base(region)}/task/openapi/upload`, { method: 'POST', body: fd })
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `RunningHub upload 请求失败: ${String(err)}`, { retryable: true })
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const name = strOf(this.expectOk(json, 'upload'), ['fileName', 'file_name'])
    if (!name) {
      throw new MediaError('EXECUTION_FAILED', 'upload 未返回 fileName', { retryable: true })
    }
    return name
  }

  /** 二进制上传供 v2 端点引用（Bearer；file 字段 -> data.download_url）。 */
  private async uploadBinary(localPath: string, region: RunningHubRegion): Promise<string> {
    const buf = await readFile(localPath).catch(() => {
      throw new MediaError('OUTPUT_MISSING', `资产文件不可读: ${localPath}`, { retryable: false })
    })
    const fd = new FormData()
    fd.append('file', new Blob([new Uint8Array(buf)]), basename(localPath))
    let res: Response
    try {
      res = await fetch(`${this.base(region)}/openapi/v2/media/upload/binary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.key('enterprise', region)}` },
        body: fd,
      })
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `RunningHub media/upload 请求失败: ${String(err)}`, { retryable: true })
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const url = strOf(this.expectOk(json, 'media/upload/binary'), ['download_url', 'downloadUrl', 'url'])
    if (!url) {
      throw new MediaError('EXECUTION_FAILED', 'media/upload 未返回 download_url', { retryable: true })
    }
    return url
  }

  /** 句柄格式 rh-task:{id} / rh-v2:{id}。 */
  private splitHandle(providerExecutionId: string): { mode: string; tid: string; region: RunningHubRegion } {
    const regional = providerExecutionId.match(/^rh-(cn|global)-(task|app|v2):(.+)$/)
    if (regional) return { region: regional[1] as RunningHubRegion, mode: `rh-${regional[2]}`, tid: regional[3] ?? '' }
    const sep = providerExecutionId.indexOf(':')
    if (sep <= 0) {
      throw new MediaError('INPUT_INVALID', `未知 RunningHub 执行句柄: ${providerExecutionId}`, { retryable: false })
    }
    return { mode: providerExecutionId.slice(0, sep), tid: providerExecutionId.slice(sep + 1), region: 'cn' }
  }

  async getStatus(providerExecutionId: string): Promise<MediaExecution> {
    const { mode, tid, region } = this.splitHandle(providerExecutionId)
    let state: MediaExecutionState = 'waiting'
    let errorMsg: string | undefined
    if (mode === 'rh-task' || mode === 'rh-app') {
      const data = this.expectOk(
        await this.post('/task/openapi/status', { apiKey: this.key('consumer', region) ?? '', taskId: tid }, false, 'consumer', region),
        'status',
      )
      const st = String(data['taskStatus'] ?? '').toUpperCase()
      if (st === 'SUCCEEDED' || st === 'SUCCESS') state = 'completed'
      else if (st === 'RUNNING') state = 'running'
      else if (st === 'QUEUED' || st === 'PENDING') state = 'queued'
      else if (st === 'FAILED' || st === 'CANCELED' || st === 'CANCELLED') {
        state = st === 'FAILED' ? 'failed' : 'cancelled'
        errorMsg = strOf(data, ['taskStatusMsg', 'msg'])
      }
    } else if (mode === 'rh-v2') {
      // v2 query 响应无 code 字段，不能走 expectOk（会把成功当 code=-1 失败）
      const json = await this.post('/openapi/v2/query', { taskId: tid }, true, 'enterprise', region)
      const payload = (Array.isArray(json) ? json[0] : json) as Record<string, unknown>
      const st = String(payload?.['status'] ?? '').toUpperCase()
      if (st === 'SUCCESS') state = 'completed'
      else if (st.startsWith('RUNNING')) state = 'running'
      else if (st.includes('QUEUE') || st === 'PENDING') state = 'queued'
      else if (st === 'FAILED' || st === 'ERROR') {
        state = 'failed'
        errorMsg = strOf(payload, ['errorMessage', 'message', 'error'])
      }
    } else {
      throw new MediaError('INPUT_INVALID', `未知 RunningHub 执行句柄: ${providerExecutionId}`, { retryable: false })
    }
    return {
      id: providerExecutionId,
      provider: this.id,
      providerExecutionId,
      taskId: '',
      stepId: '',
      state,
      error:
        errorMsg !== undefined && (state === 'failed' || state === 'cancelled')
          ? { code: classifyFailure(errorMsg), message: decorateInsufficient(errorMsg), retryable: state === 'failed' && !isInsufficientCredits(errorMsg) }
          : undefined,
    }
  }

  async waitFor(providerExecutionId: string): Promise<MediaExecution> {
    const deadline = Date.now() + this.jobTimeoutMs
    for (;;) {
      const st = await this.getStatus(providerExecutionId)
      if (st.state === 'completed' || st.state === 'failed' || st.state === 'cancelled') return st
      if (Date.now() > deadline) {
        throw new MediaError('TIMEOUT', `等待 RunningHub 执行 ${providerExecutionId} 超时`, { retryable: true })
      }
      await new Promise((r) => setTimeout(r, this.pollIntervalMs))
    }
  }

  /** RH 公开 OpenAPI 未提供任务取消端点（rh_cli 亦未封装）：no-op，不阻塞 runner 流程。 */
  async cancel(_providerExecutionId: string): Promise<void> {}

  async fetchOutputs(providerExecutionId: string, outDir: string, meta: FetchOutputsMeta): Promise<MediaAsset[]> {
    await mkdir(outDir, { recursive: true })
    const files = await this.collectOutputFiles(providerExecutionId)
    if (files.length === 0) {
      throw new MediaError('OUTPUT_MISSING', `RunningHub 未返回任何输出（${providerExecutionId}）`, { retryable: true })
    }
    const assets: MediaAsset[] = []
    for (const [i, f] of files.entries()) {
      const localPath = join(outDir, `${randomUUID().slice(0, 8)}-${i + 1}.${extFromUrlOrType(f.url, f.type)}`)
      const res = await fetch(f.url).catch((err) => {
        throw new MediaError('OUTPUT_MISSING', `下载输出失败 ${f.url}: ${String(err)}`, { retryable: true })
      })
      if (!res.ok) throw new MediaError('OUTPUT_MISSING', `下载输出失败 ${f.url}: HTTP ${res.status}`, { retryable: true })
      const contentType = res.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
      if (contentType === 'text/html' || contentType === 'application/json') {
        throw new MediaError('OUTPUT_MISSING', `RunningHub 输出不是媒体文件（${contentType}）`, { retryable: true })
      }
      const ext = extFromUrlOrType(f.url, f.type || contentType)
      const typedPath = localPath.replace(/\.[^.\\/]+$/, `.${ext}`)
      await writeFile(typedPath, Buffer.from(await res.arrayBuffer()))
      assets.push(
        this.opts.assetRegistry.register({
          type: inferMediaType(typedPath),
          localPath: typedPath,
          provider: meta.provider,
          recipeId: meta.recipeId,
          executionId: providerExecutionId,
          prompt: meta.prompt,
          parentAssets: meta.parentAssets,
        }),
      )
    }
    await this.opts.assetRegistry.persist()
    return assets
  }

  private async collectOutputFiles(providerExecutionId: string): Promise<Array<{ url: string; type?: string }>> {
    const { mode, tid, region } = this.splitHandle(providerExecutionId)
    const out: Array<{ url: string; type?: string }> = []
    if (mode === 'rh-task' || mode === 'rh-app') {
      const data = this.expectOk(
        await this.post('/task/openapi/outputs', { apiKey: this.key('consumer', region) ?? '', taskId: tid }, false, 'consumer', region),
        'outputs',
      )
      collectFileResults(data['outputs'] ?? data['fileUrls'] ?? data, out)
    } else {
      // v2 query 响应无 code 字段，不能走 expectOk（同 getStatus 的 rh-v2 分支）
      const json = await this.post('/openapi/v2/query', { taskId: tid }, true, 'enterprise', region)
      const payload = Array.isArray(json) ? json[0] : json
      collectFileResults((payload as Record<string, unknown>)?.['results'] ?? payload, out)
    }
    return out
  }
}
