/**
 * PRD §11/§18 - ComfyLocalProvider。
 * Comfy MCP-specific 代码只允许存在于本文件附近（PRD §48-6）。
 * 通过注入的 call() 调 mcp__comfy__* 原始工具（由 dsh-mcp-client 注册）。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type { MediaAsset, MediaCapability, MediaExecution, MediaExecutionState } from '../core/index.js'
import { MediaError, toMediaError } from '../core/index.js'
import type { CapabilityRegistry, RecipeRegistry, AssetRegistry } from '../core/index.js'
import type { MappingTarget, Recipe, WorkflowNodeMapping } from '../core/index.js'

export interface ProviderHealth {
  online: boolean
  detail: string
  serverInfo?: Record<string, unknown>
}

export interface MediaExecutionRequest {
  stepId: string
  taskId: string
  recipe: Recipe
  workflowPath: string
  inputs: Record<string, unknown>
  /** 管理页配置的 recipe 级默认值；step inputs 未给的字段用它兜底。 */
  defaults?: Record<string, unknown>
  /** 上游资产路径映射：slotName -> 本地文件路径（来自 Asset Registry resolve）。 */
  assetInputs: Record<string, string>
}

export interface MediaExecutionHandle {
  providerExecutionId: string
  state: MediaExecutionState
  /** 上传到 ComfyUI input 目录的资产：slot -> 文件名（供 workflow 引用）。 */
  assetUploads?: Record<string, string>
}

export interface ComfyProviderOptions {
  serverName: string
  call: (tool: string, args?: Record<string, unknown>) => Promise<unknown>
  listTools: () => string[]
  assetRegistry: AssetRegistry
  workflowsDir: string
  /** 图片等快速工作流也异步执行，仅 fetch 时同步（PRD §18）。 */
  pollIntervalMs?: number
  jobTimeoutMs?: number
  /** ComfyUI HTTP API 基址（直连优先于 MCP：零子进程，Windows 不弹终端）。 */
  comfyBaseUrl?: () => string
}

/** 兼容函数：不同 comfy-mcp 版本字段名有差异，做防御性取值。 */
function pick<T>(obj: unknown, keys: string[]): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    const v = o[k]
    if (v !== undefined && v !== null) return v as T
  }
  return undefined
}

interface WorkflowNode {
  class_type: string
  inputs: Record<string, unknown>
}

export interface WorkflowInjectionResult {
  workflow: Record<string, WorkflowNode>
  applied: string[]
}

/** 槽位顺序：image=1, image2=2, image10=10 ... */
function slotOrder(slot: string): number {
  const m = slot.match(/(\d+)$/)
  return m ? Number(m[1]) : 1
}

/** 启发式注入：把上传文件名按序写入 LoadImage 类节点（图生图/参考图）。 */
function injectAssetFilenames(workflow: Record<string, WorkflowNode>, uploads: Record<string, string>): number {
  let applied = 0
  const loadImageNodes = Object.values(workflow).filter(
    (n) => n && typeof n.class_type === 'string' && (n.class_type.startsWith('LoadImage') || n.class_type.includes('ImageLoader')),
  )
  const slots = Object.keys(uploads)
    .filter((s) => s.startsWith('image'))
    .sort((a, b) => slotOrder(a) - slotOrder(b))
  for (const [i, slot] of slots.entries()) {
    const node = loadImageNodes[i]
    if (node?.inputs && (typeof node.inputs['image'] === 'string' || node.inputs['image'] === undefined)) {
      node.inputs['image'] = uploads[slot] ?? ''
      applied++
    }
  }
  return applied
}

/**
 * PRD §27 inputs 契约：把 step inputs 注入 API 格式 workflow。
 * 纯函数（深拷贝后修改，不落盘、不动模板）。识别策略：
 * 从 KSampler(Advanced) 节点的 positive/negative/latent_image 连接反查目标节点，
 * 找不到连接时对 EmptyLatentImage / 首个 CLIPTextEncode 兜底；尽力注入，缺失项跳过。
 */
export function applyInputsToWorkflow(
  raw: unknown,
  inputs: Record<string, unknown>,
  uploads: Record<string, string> = {},
): WorkflowInjectionResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new MediaError('WORKFLOW_INVALID', 'workflow 不是 API 格式 JSON 对象', { retryable: false })
  }
  const workflow = structuredClone(raw) as Record<string, WorkflowNode>
  const applied: string[] = []
  const entries = Object.entries(workflow)

  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined

  // 1. 主采样器节点（多采样器如 hires-fix 时，第一个决定正/负槽语义）
  const samplerEntry = entries.find(
    ([, n]) => n && typeof n.class_type === 'string' && n.class_type.startsWith('KSampler'),
  )
  const sampler = samplerEntry?.[1]

  // 2. 正/负 prompt：沿采样器的 positive/negative 连接找 CLIPTextEncode / 文本提示词节点
  const linkedTextEncode = (slot: string): WorkflowNode | undefined => {
    const link = sampler?.inputs?.[slot]
    if (!Array.isArray(link) || link.length < 2) return undefined
    const target = workflow[String(link[0])]
    return target && (target.class_type === 'CLIPTextEncode' || target.class_type?.includes('TextEncode')) ? target : undefined
  }
  const pos = str(inputs['prompt'])
  if (pos !== undefined) {
    const node =
      linkedTextEncode('positive') ??
      entries.find(([, n]) => n && (n.class_type === 'CLIPTextEncode' || n.class_type?.includes('TextEncode')))?.[1]
    if (node?.inputs) {
      node.inputs['text'] = pos
      applied.push('prompt')
    } else {
      // 增强启发式：支持 CR Prompt Text, PromptText, StringLiteral 等各类自定义提示词节点
      const textNode = entries.find(
        ([, n]) =>
          n?.inputs &&
          (typeof n.inputs['text'] === 'string' || typeof n.inputs['prompt'] === 'string') &&
          !n.class_type?.includes('Save') &&
          !n.class_type?.includes('Preview'),
      )?.[1]
      if (textNode?.inputs) {
        if ('prompt' in textNode.inputs) {
          textNode.inputs['prompt'] = pos
          applied.push('prompt')
        } else if ('text' in textNode.inputs) {
          textNode.inputs['text'] = pos
          applied.push('prompt')
        }
      }
    }
  }
  const neg = str(inputs['negative_prompt'])
  if (neg !== undefined) {
    const node = linkedTextEncode('negative')
    if (node?.inputs) {
      node.inputs['text'] = neg
      applied.push('negative_prompt')
    }
  }

  // 3. 尺寸：latent_image 连接 → 带 width/height 输入的节点（EmptyLatentImage 等）
  const w = num(inputs['width'])
  const h = num(inputs['height'])
  if (w !== undefined || h !== undefined) {
    let latent: WorkflowNode | undefined
    const link = sampler?.inputs?.['latent_image']
    if (Array.isArray(link) && link.length >= 2) latent = workflow[String(link[0])]
    latent ??= entries.find(([, n]) => n && n.class_type === 'EmptyLatentImage')?.[1]
    if (latent?.inputs) {
      if (w !== undefined && typeof latent.inputs['width'] === 'number') {
        latent.inputs['width'] = w
        applied.push('width')
      }
      if (h !== undefined && typeof latent.inputs['height'] === 'number') {
        latent.inputs['height'] = h
        applied.push('height')
      }
    }
  }

  // 4. seed：KSampler.seed / KSamplerAdvanced.noise_seed
  const seed = num(inputs['seed'])
  if (seed !== undefined && sampler?.inputs) {
    const key = sampler.class_type === 'KSamplerAdvanced' ? 'noise_seed' : 'seed'
    if (typeof sampler.inputs[key] === 'number') {
      sampler.inputs[key] = seed
      applied.push('seed')
    }
  }

  // 5. 模型覆盖：管理页 defaults.model → 带 ckpt_name/unet_name 输入的加载节点
  const model = str(inputs['model'])
  if (model !== undefined) {
    const loader = entries.find(
      ([, n]) =>
        typeof n?.inputs?.['ckpt_name'] === 'string' ||
        typeof n?.inputs?.['unet_name'] === 'string',
    )?.[1]
    if (loader) {
      if (typeof loader.inputs['ckpt_name'] === 'string') loader.inputs['ckpt_name'] = model
      else loader.inputs['unet_name'] = model
      applied.push('model')
    }
  }

  // 6. 采样参数：steps / cfg / sampler / scheduler 写到主采样器节点
  if (sampler?.inputs) {
    const steps = num(inputs['steps'])
    if (steps !== undefined && typeof sampler.inputs['steps'] === 'number') {
      sampler.inputs['steps'] = steps
      applied.push('steps')
    }
    const cfg = num(inputs['cfg'])
    if (cfg !== undefined && typeof sampler.inputs['cfg'] === 'number') {
      sampler.inputs['cfg'] = cfg
      applied.push('cfg')
    }
    const samplerName = str(inputs['sampler'])
    if (samplerName !== undefined && typeof sampler.inputs['sampler_name'] === 'string') {
      sampler.inputs['sampler_name'] = samplerName
      applied.push('sampler')
    }
    const sched = str(inputs['scheduler'])
    if (sched !== undefined && typeof sampler.inputs['scheduler'] === 'string') {
      sampler.inputs['scheduler'] = sched
      applied.push('scheduler')
    }
  }

  // 7. 参考资产注入：图生图/参考图上传文件名写入 LoadImage 节点
  if (uploads && Object.keys(uploads).length > 0) {
    const injected = injectAssetFilenames(workflow, uploads)
    if (injected > 0) applied.push('assets')
  }

  // 8. 自适应节点适配（ResolutionSelector / CR Prompt Text / 自定义参数）
  const params = (typeof inputs['params'] === 'object' && inputs['params'] !== null ? inputs['params'] : {}) as Record<string, unknown>
  const allInputs = { ...params, ...inputs }

  const resNode = entries.find(([, n]) => n && (n.class_type === 'ResolutionSelector' || n.class_type?.includes('ResolutionSelector') || n.class_type?.includes('Resolution')))?.[1]
  if (resNode?.inputs) {
    const rawRatio = allInputs['aspect_ratio'] ?? allInputs['ratio']
    if (rawRatio !== undefined && rawRatio !== null && rawRatio !== '') {
      // 枚举标签映射：与已装 ComfyUI ResolutionSelector 的合法枚举对齐
      // （旧值 '9:16 (Vertical)' 等会被 /prompt 校验拒绝：Value not in list）。
      // 同比例防覆盖：节点当前值已是目标比例（任意标签变体）时保持原标签，防不同 ComfyUI 版本枚举漂移。
      const ratioMap: Record<string, string> = {
        '16:9': '16:9 (Widescreen)',
        '1:1': '1:1 (Square)',
        '9:16': '9:16 (Portrait Widescreen)',
        '4:3': '4:3 (Standard)',
        '3:4': '3:4 (Portrait Standard)',
        '21:9': '21:9 (Ultrawide)',
      }
      const raw = String(rawRatio)
      const ratioKey = ratioMap[raw] ? raw : (raw.split(' ')[0] ?? '')
      const cur = String(resNode.inputs['aspect_ratio'] ?? '')
      const curKey = ratioMap[cur] ? cur : cur.split(' ')[0] ?? ''
      if (ratioKey && curKey === ratioKey) {
        // 比例一致：保持节点原标签（已是该节点合法枚举值）
      } else {
        resNode.inputs['aspect_ratio'] = ratioMap[ratioKey] ?? raw
      }
      applied.push('aspect_ratio')
    }
    const mp = allInputs['megapixels'] ?? allInputs['mp']
    if (mp !== undefined && mp !== null && mp !== '') {
      resNode.inputs['megapixels'] = Number(mp)
      applied.push('megapixels')
    }
  }

  const crPromptNode = entries.find(([, n]) => n && (n.class_type === 'CR Prompt Text' || n.class_type?.includes('CR_PromptText')))?.[1]
  if (crPromptNode?.inputs && pos !== undefined && pos !== '') {
    crPromptNode.inputs['prompt'] = pos
    if ('text' in crPromptNode.inputs) crPromptNode.inputs['text'] = pos
    applied.push('cr_prompt')
  }

  return { workflow, applied }
}

/**
 * 显式节点映射注入（用户自定义工作流导入时生成；优先于启发式 applyInputsToWorkflow）。
 * 纯函数（深拷贝后修改）；资产槽位值取上传后的 ComfyUI input 文件名，
 * 槽位约定：image / image2 / image3 ... 与 task-runner 的多图槽位命名一致。
 */
export function applyNodeMappingToWorkflow(
  raw: unknown,
  mapping: WorkflowNodeMapping,
  inputs: Record<string, unknown>,
  uploads: Record<string, string>,
): WorkflowInjectionResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new MediaError('WORKFLOW_INVALID', 'workflow 不是 API 格式 JSON 对象', { retryable: false })
  }
  const workflow = structuredClone(raw) as Record<string, WorkflowNode>
  const applied: string[] = []
  const setField = (target: MappingTarget | undefined, fallbackField: string, value: unknown, tag: string): void => {
    if (!target || value === undefined || value === null || value === '') return
    const node = workflow[String(target.node)]
    if (!node?.inputs) return
    node.inputs[String(target.field ?? fallbackField)] = value
    applied.push(tag)
  }
  setField(mapping.prompt, 'text', inputs['prompt'], 'prompt')
  setField(mapping.negativePrompt, 'text', inputs['negative_prompt'], 'negative_prompt')
  mapping.images?.forEach((t, i) =>
    setField(t, 'image', uploads[i === 0 ? 'image' : `image${i + 1}`], i === 0 ? 'image' : `image${i + 1}`),
  )
  mapping.audios?.forEach((t, i) =>
    setField(t, 'audio', uploads[i === 0 ? 'audio' : `audio${i + 1}`], i === 0 ? 'audio' : `audio${i + 1}`),
  )
  mapping.videos?.forEach((t, i) =>
    setField(t, 'video', uploads[i === 0 ? 'video' : `video${i + 1}`], i === 0 ? 'video' : `video${i + 1}`),
  )
  for (const [k, t] of Object.entries(mapping.params ?? {})) {
    setField(t, k, inputs[k] ?? (inputs['params'] as Record<string, unknown>)?.[k], k)
  }

  // 注入用户显式指定的暴露节点参数 (exposedParams)
  if (Array.isArray(mapping.exposedParams)) {
    for (const p of mapping.exposedParams) {
      const val =
        inputs[p.id] ??
        inputs[p.field] ??
        (inputs['params'] as Record<string, unknown>)?.[p.id] ??
        (inputs['params'] as Record<string, unknown>)?.[p.field] ??
        p.default
      if (val !== undefined && val !== null && val !== '') {
        const nid = String(p.nodeId || (p as unknown as { node?: string }).node)
        const node = workflow[nid]
        if (node?.inputs) {
          let finalVal = val
          if (p.field === 'aspect_ratio') {
            // 同 ResolutionSelector 枚举适配：旧标签/裸比例统一映射到已装合法枚举；
            // 节点当前值比例与目标一致时保持原标签（防枚举漂移）。
            const ratioMap: Record<string, string> = {
              '16:9': '16:9 (Widescreen)',
              '1:1': '1:1 (Square)',
              '9:16': '9:16 (Portrait Widescreen)',
              '4:3': '4:3 (Standard)',
              '3:4': '3:4 (Portrait Standard)',
              '21:9': '21:9 (Ultrawide)',
            }
            const raw = String(val)
            const ratioKey = ratioMap[raw] ? raw : (raw.split(' ')[0] ?? '')
            const cur = String(node.inputs['aspect_ratio'] ?? '')
            const curKey = ratioMap[cur] ? cur : cur.split(' ')[0] ?? ''
            if (!ratioKey || curKey !== ratioKey) {
              finalVal = ratioMap[ratioKey] ?? raw
            } else {
              finalVal = cur || ratioMap[ratioKey] || raw
            }
          }
          node.inputs[p.field] = finalVal
          applied.push(`${nid}.${p.field}`)
        }
      }
    }
  }

  return { workflow, applied }
}

export class ComfyLocalProvider {
  readonly id = 'comfy-local'
  private pollIntervalMs: number
  private jobTimeoutMs: number

  constructor(private readonly opts: ComfyProviderOptions) {
    this.pollIntervalMs = opts.pollIntervalMs ?? 2000
    this.jobTimeoutMs = opts.jobTimeoutMs ?? 60 * 60 * 1000 // 视频任务上限 1h
  }

  private tool(name: string): string {
    return `mcp__${this.opts.serverName}__${name}`
  }

  /** 供管理页网关等复用的底层调用桥（mcp__comfy__* 原始工具）。 */
  callTool(tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return this.opts.call(tool, args)
  }

  private hasTool(name: string): boolean {
    return this.opts.listTools().includes(this.tool(name))
  }

  /** PRD §18 第 1 步：server_info。ComfyUI 离线 → PROVIDER_OFFLINE。 */
  async healthCheck(): Promise<ProviderHealth> {
    try {
      const res = (await this.opts.call('server_info', {})) as Record<string, unknown>
      const online = pick<boolean>(res, ['online', 'running', 'is_running']) ?? true
      return { online, detail: JSON.stringify(res).slice(0, 400), serverInfo: res }
    } catch (err) {
      return { online: false, detail: toMediaError(err).message }
    }
  }

  /** ── ComfyUI 直连 HTTP API（优先于 MCP：不经 comfy-cli 子进程，Windows 不弹终端）───── */

  private baseUrl(): string {
    return this.opts.comfyBaseUrl?.() ?? 'http://127.0.0.1:8188'
  }

  private async apiFetch(path: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
    return fetch(`${this.baseUrl()}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  }

  /** 探活：/system_stats 可达即直连。 */
  private async apiAvailable(): Promise<boolean> {
    try {
      const res = await this.apiFetch('/system_stats', undefined, 1500)
      return res.ok
    } catch {
      return false
    }
  }

  /** 上传参考资产到 ComfyUI input 目录，返回 workflow 引用名（含子目录前缀）。 */
  private async apiUpload(localPath: string): Promise<string> {
    const bytes = await readFile(localPath)
    const fd = new FormData()
    fd.append('image', new Blob([new Uint8Array(bytes)]), basename(localPath))
    fd.append('subfolder', '')
    fd.append('type', 'input')
    fd.append('overwrite', 'false')
    const res = await this.apiFetch('/upload/image', { method: 'POST', body: fd }, 30000)
    if (!res.ok) {
      throw new MediaError('EXECUTION_FAILED', `/upload/image HTTP ${res.status}`, { retryable: true })
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const stored = typeof json['name'] === 'string' && json['name'] ? json['name'] : basename(localPath)
    const sub = typeof json['subfolder'] === 'string' && json['subfolder'] ? `${json['subfolder']}/` : ''
    return `${sub}${stored}`
  }

  /** MCP 上传桥（server 离线回退路径用）。 */
  private async mcpUpload(localPath: string): Promise<string> {
    const ures = (await this.opts.call('upload_file', {
      files: [localPath],
      overwrite: false,
    })) as Record<string, unknown>
    return pick<string>(ures, ['name', 'filename', 'uploaded_name']) ?? ''
  }

  private async uploadAssets(
    assetInputs: Record<string, string>,
    upload: (p: string) => Promise<string>,
  ): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    for (const [slot, localPath] of Object.entries(assetInputs)) {
      try {
        const name = await upload(localPath)
        if (name) out[slot] = name
      } catch {
        // 上传失败不致命：workflow 内若引用同名文件仍可执行
      }
    }
    return out
  }

  /** POST /prompt 提交 API 格式 workflow，返回 prompt_id；400 映射 WORKFLOW_INVALID。 */
  private async apiSubmit(workflow: Record<string, unknown>): Promise<string> {
    const res = await this.apiFetch(
      '/prompt',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow, client_id: 'dsh-mmr' }),
      },
      15000,
    )
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const err = (json['error'] ?? {}) as Record<string, unknown>
      const msg = typeof err['message'] === 'string' ? err['message'] : JSON.stringify(json).slice(0, 300)
      throw new MediaError('WORKFLOW_INVALID', `ComfyUI /prompt 拒绝: ${msg}`, { retryable: false })
    }
    const promptId = typeof json['prompt_id'] === 'string' ? json['prompt_id'] : undefined
    if (!promptId) {
      throw new MediaError('EXECUTION_FAILED', '/prompt 未返回 prompt_id', { retryable: true })
    }
    return promptId
  }

  /** GET /history/<id> 单条记录；无记录返回 undefined。 */
  private async apiHistory(id: string): Promise<Record<string, unknown> | undefined> {
    const res = await this.apiFetch(`/history/${encodeURIComponent(id)}`, undefined, 8000)
    if (!res.ok) return undefined
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const entry = json ? json[id] : undefined
    return entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : undefined
  }

  /** history/queue → 统一 MediaExecution（API 路径；无进度数据，前端按已用时估算）。 */
  private apiStatusFrom(id: string, entry: Record<string, unknown> | undefined, queued: boolean, running: boolean): MediaExecution {
    let state: MediaExecutionState = 'waiting'
    let error: MediaExecution['error']
    if (entry) {
      const status = (entry['status'] ?? {}) as Record<string, unknown>
      const statusStr = String(status['status_str'] ?? '').toLowerCase()
      if (statusStr === 'error') {
        state = 'failed'
        const msgs = Array.isArray(status['messages']) ? JSON.stringify(status['messages']).slice(0, 300) : 'execution error'
        error = { code: 'EXECUTION_FAILED', message: msgs, retryable: true }
      } else {
        state = 'completed'
      }
    } else if (running) {
      state = 'running'
    } else if (queued) {
      state = 'queued'
    }
    return {
      id,
      provider: 'comfy-local',
      providerExecutionId: id,
      taskId: '',
      stepId: '',
      state,
      progress: undefined,
      error,
    }
  }

  /** 从 Recipe Registry 产出能力列表；带本机约束（模型/节点由 setup 阶段注入约束）。 */
  async getCapabilities(recipes: RecipeRegistry): Promise<MediaCapability[]> {
    const caps: MediaCapability[] = []
    for (const r of recipes.list()) {
      for (const type of r.capability) {
        caps.push({
          id: `${type}@${r.id}`,
          type,
          provider: 'comfy-local',
          recipeId: r.id,
          inputs: r.inputs,
          outputs: r.outputs,
          available: true,
          constraints: r.constraints,
        })
      }
    }
    return caps
  }

  /** PRD §27：把 step inputs（叠加 recipe defaults 兜底）注入 workflow 副本，不污染共享模板。无注入项时返回原路径。 */
  private async prepareWorkflow(
    request: MediaExecutionRequest,
    assetUploads: Record<string, string> = {},
  ): Promise<string> {
    // defaults 先铺底，step inputs 覆盖同名键
    const effective: Record<string, unknown> = { ...(request.defaults ?? {}) }
    for (const [k, v] of Object.entries(request.inputs ?? {})) {
      if (v !== undefined && v !== null) effective[k] = v
    }
    const injectable = [
      'prompt',
      'negative_prompt',
      'width',
      'height',
      'seed',
      'model',
      'steps',
      'cfg',
      'sampler',
      'scheduler',
    ]
    const hasInputs = injectable.some((k) => effective[k] !== undefined) || Object.keys(assetUploads).length > 0
    if (!hasInputs) return request.workflowPath
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(request.workflowPath, 'utf8'))
    } catch (err) {
      throw new MediaError(
        'WORKFLOW_INVALID',
        `workflow 文件不可读: ${request.workflowPath} (${String(err)})`,
        { retryable: false },
      )
    }
    const { workflow, applied } = applyInputsToWorkflow(raw, effective, assetUploads)
    if (applied.length === 0) return request.workflowPath
    const dir = join(tmpdir(), 'dsh-mmr-tasks')
    await mkdir(dir, { recursive: true })
    const outPath = join(dir, `${request.taskId}-${request.stepId}.json`)
    await writeFile(outPath, JSON.stringify(workflow, null, 2), 'utf8')
    return outPath
  }

  /**
   * 显式映射模式（recipe.nodeMapping 存在时启用）：上传上游资产 -> applyNodeMappingToWorkflow
   * 生成临时副本。返回 undefined 表示映射未命中任何输入值（回退到启发式注入路径）。
   * 上传通道由调用方注入（直连 API 或 MCP 回退）。
   */
  private async mapWorkflowIfConfigured(
    request: MediaExecutionRequest,
    assetUploads: Record<string, string>,
  ): Promise<string | undefined> {
    const mapping = request.recipe.nodeMapping
    if (!mapping) return undefined
    const effective: Record<string, unknown> = { ...(request.defaults ?? {}) }
    for (const [k, v] of Object.entries(request.inputs ?? {})) {
      if (v !== undefined && v !== null) effective[k] = v
    }
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(request.workflowPath, 'utf8'))
    } catch (err) {
      throw new MediaError(
        'WORKFLOW_INVALID',
        `workflow 文件不可读: ${request.workflowPath} (${String(err)})`,
        { retryable: false },
      )
    }
    const { workflow, applied } = applyNodeMappingToWorkflow(raw, mapping, effective, assetUploads)
    if (applied.length === 0) return undefined
    const dir = join(tmpdir(), 'dsh-mmr-tasks')
    await mkdir(dir, { recursive: true })
    const outPath = join(dir, `${request.taskId}-${request.stepId}-mapped.json`)
    await writeFile(outPath, JSON.stringify(workflow, null, 2), 'utf8')
    return outPath
  }
  /**
   * PRD §18 执行：输入注入 → 上传资产 → 提交。
   * 直连 ComfyUI HTTP API 优先（零子进程，不弹终端）；server 离线时回退 comfy-mcp
   * （由 comfy-cli 负责拉起本机 ComfyUI，此后各调用自动切回直连）。
   */
  async execute(request: MediaExecutionRequest): Promise<MediaExecutionHandle> {
    const viaApi = await this.apiAvailable()
    const upload = viaApi
      ? (p: string) => this.apiUpload(p)
      : async (p: string) => (this.hasTool('upload_file') ? this.mcpUpload(p) : '')
    // 1. 上游参考资产统一先上传到 ComfyUI input 目录（供显式映射与启发式注入共同使用）
    const assetUploads = await this.uploadAssets(request.assetInputs, upload)
    // 2. 显式节点映射（用户自定义工作流导入）优先：命中则改用映射后的 workflow 副本走同一提交流程。
    const mappedPath = await this.mapWorkflowIfConfigured(request, assetUploads)
    if (mappedPath) request = { ...request, workflowPath: mappedPath }
    // 3. 输入注入（PRD §27）：prompt/尺寸/seed 及图片文件名写入本次执行的 workflow 副本。
    const effectivePath = await this.prepareWorkflow(request, assetUploads)
    if (viaApi) {
      let raw: unknown
      try {
        raw = JSON.parse(await readFile(effectivePath, 'utf8'))
      } catch (err) {
        throw new MediaError(
          'WORKFLOW_INVALID',
          `workflow 文件不可读: ${effectivePath} (${String(err)})`,
          { retryable: false },
        )
      }
      const promptId = await this.apiSubmit(raw as Record<string, unknown>)
      return { providerExecutionId: promptId, state: 'queued', assetUploads }
    }
    // 4. MCP 回退路径：预校验与提交
    if (this.hasTool('validate_workflow')) {
      const vres = (await this.opts.call('validate_workflow', {
        workflow_path: effectivePath,
      })) as Record<string, unknown>
      if (pick<boolean>(vres, ['valid']) === false) {
        const errors = Array.isArray(vres.errors) ? vres.errors.join('; ') : JSON.stringify(vres).slice(0, 300)
        throw new MediaError('WORKFLOW_INVALID', `validate_workflow 未通过: ${errors}`, { retryable: false })
      }
    }

    // 提交异步作业（wait=false，长任务不阻塞 Tool Call，PRD §18）
    const rres = (await this.opts.call('run_workflow', {
      workflow_path: effectivePath,
      wait: false,
    })) as Record<string, unknown>
    const promptId = pick<string>(rres, ['prompt_id', 'promptId', 'id', 'execution_id'])
    if (!promptId) {
      throw new MediaError('EXECUTION_FAILED', `run_workflow 未返回 prompt_id: ${JSON.stringify(rres).slice(0, 300)}`, {
        retryable: true,
      })
    }
    return { providerExecutionId: promptId, state: 'queued', assetUploads }
  }

  /** 查询 job 状态：直连 history/queue 优先；API 不可达回退 comfy-mcp `job(action=status)`。 */
  async getStatus(providerExecutionId: string): Promise<MediaExecution> {
    try {
      const entry = await this.apiHistory(providerExecutionId)
      if (!entry) {
        const qres = await this.apiFetch('/queue', undefined, 5000)
        if (!qres.ok) throw new Error(`queue HTTP ${qres.status}`)
        const q = (await qres.json().catch(() => ({}))) as Record<string, unknown>
        const idsOf = (v: unknown): string[] =>
          Array.isArray(v)
            ? v.map((e) => (Array.isArray(e) ? String(e[1] ?? '') : String((e as Record<string, unknown>)['prompt_id'] ?? '')))
            : []
        const running = idsOf(q['queue_running']).includes(providerExecutionId)
        const queued = idsOf(q['queue_pending']).includes(providerExecutionId)
        return this.apiStatusFrom(providerExecutionId, undefined, queued, running)
      }
      return this.apiStatusFrom(providerExecutionId, entry, false, false)
    } catch {
      return this.mcpStatus(providerExecutionId)
    }
  }

  /** MCP 状态桥（原 getStatus 实现）。 */
  private async mcpStatus(providerExecutionId: string): Promise<MediaExecution> {
    const res = (await this.opts.call('job', {
      action: 'status',
      prompt_id: providerExecutionId,
    })) as Record<string, unknown>
    return this.normalizeStatus(res, providerExecutionId)
  }

  /** 阻塞等待完成：直连时纯 HTTP 轮询；否则优先 job(action=wait)，失败降级轮询。 */
  async waitFor(providerExecutionId: string): Promise<MediaExecution> {
    if (!(await this.apiAvailable())) {
      try {
        const res = (await this.opts.call('job', {
          action: 'wait',
          prompt_id: providerExecutionId,
          timeout_seconds: Math.min(this.jobTimeoutMs / 1000, 600),
        })) as Record<string, unknown>
        const st = this.normalizeStatus(res, providerExecutionId)
        if (st.state !== 'waiting' && st.state !== 'queued') return st
      } catch {
        // wait action 不可用时降级为轮询
      }
    }
    const deadline = Date.now() + this.jobTimeoutMs
    for (;;) {
      const st = await this.getStatus(providerExecutionId)
      if (st.state === 'completed' || st.state === 'failed' || st.state === 'cancelled') return st
      if (Date.now() > deadline) {
        throw new MediaError('TIMEOUT', `等待执行 ${providerExecutionId} 超时`, { retryable: true })
      }
      await new Promise((r) => setTimeout(r, this.pollIntervalMs))
    }
  }

  /** 取消：直连 interrupt + 队列删除；API 不可达回退 job(action=cancel)。 */
  async cancel(providerExecutionId: string): Promise<void> {
    try {
      await this.apiFetch(
        '/interrupt',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
        5000,
      )
      await this.apiFetch(
        '/queue',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delete: [providerExecutionId] }),
        },
        5000,
      )
      return
    } catch {
      // 直连不可达 → MCP 兜底
    }
    await this.opts.call('job', { action: 'cancel', prompt_id: providerExecutionId })
  }

  /** 产出落盘：直连 history.outputs -> /view 下载；API 不可达回退 comfy-mcp fetch_outputs。 */
  async fetchOutputs(
    providerExecutionId: string,
    outDir: string,
    meta: { provider: string; recipeId?: string; prompt?: string; parentAssets: string[] },
  ): Promise<MediaAsset[]> {
    try {
      const entry = await this.apiHistory(providerExecutionId)
      if (!entry) return this.mcpFetchOutputs(providerExecutionId, outDir, meta)
      const files: Array<{ filename: string; subfolder: string; type: string }> = []
      const outputs = (entry['outputs'] ?? {}) as Record<string, Record<string, unknown>>
      for (const o of Object.values(outputs)) {
        for (const key of ['images', 'gifs', 'videos', 'audio', '3d']) {
          const arr = Array.isArray(o[key]) ? (o[key] as Array<Record<string, unknown>>) : []
          for (const f of arr) {
            const filename = typeof f['filename'] === 'string' ? f['filename'] : ''
            if (filename) {
              files.push({
                filename,
                subfolder: typeof f['subfolder'] === 'string' ? f['subfolder'] : '',
                type: typeof f['type'] === 'string' ? f['type'] : 'output',
              })
            }
          }
        }
      }
      if (files.length === 0) {
        throw new MediaError('OUTPUT_MISSING', `history 无产出文件（prompt ${providerExecutionId}）`, { retryable: true })
      }
      await mkdir(outDir, { recursive: true })
      const assets: MediaAsset[] = []
      let n = 0
      for (const f of files) {
        const qs = new URLSearchParams({ filename: f.filename, subfolder: f.subfolder, type: f.type })
        const res = await this.apiFetch(`/view?${qs.toString()}`, undefined, 60000)
        if (!res.ok) continue
        const local = join(outDir, `${++n}-${basename(f.filename)}`)
        await writeFile(local, Buffer.from(await res.arrayBuffer()))
        const type = inferMediaType(local)
        assets.push(
          this.opts.assetRegistry.register({
            type,
            localPath: local,
            provider: meta.provider,
            recipeId: meta.recipeId,
            executionId: providerExecutionId,
            prompt: meta.prompt,
            parentAssets: meta.parentAssets,
          }),
        )
      }
      if (assets.length === 0) {
        throw new MediaError('OUTPUT_MISSING', `/view 下载失败（prompt ${providerExecutionId}）`, { retryable: true })
      }
      await this.opts.assetRegistry.persist()
      return assets
    } catch (err) {
      if (err instanceof MediaError) throw err
      // API 不可达（连接失败等非 MediaError）→ MCP 兜底
      return this.mcpFetchOutputs(providerExecutionId, outDir, meta)
    }
  }

  /** MCP 产出桥（原 fetch_outputs 实现）。 */
  private async mcpFetchOutputs(
    providerExecutionId: string,
    outDir: string,
    meta: { provider: string; recipeId?: string; prompt?: string; parentAssets: string[] },
  ): Promise<MediaAsset[]> {
    if (!this.hasTool('fetch_outputs')) {
      throw new MediaError('OUTPUT_MISSING', 'comfy-mcp 未暴露 fetch_outputs', { retryable: false })
    }
    const res = (await this.opts.call('fetch_outputs', {
      prompt_id: providerExecutionId,
      out_dir: outDir,
    })) as Record<string, unknown>

    const files = extractOutputPaths(res)
    if (files.length === 0) {
      throw new MediaError('OUTPUT_MISSING', `fetch_outputs 未返回任何文件（prompt ${providerExecutionId}）`, {
        retryable: true,
      })
    }
    const assets: MediaAsset[] = []
    for (const f of files) {
      const type = inferMediaType(f)
      assets.push(
        this.opts.assetRegistry.register({
          type,
          localPath: f,
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

  /** comfy-mcp 返回结构 → 统一 MediaExecution。 */
  private normalizeStatus(res: unknown, id: string): MediaExecution {
    const raw = res as Record<string, unknown>
    const status = String(pick(res, ['status', 'state', 'job_status']) ?? 'unknown').toLowerCase()
    const progressRaw = pick<number>(res, ['progress', 'percent', 'percentage'])
    const errorMsg = pick<string>(res, ['error', 'failure', 'verdict', 'message'])

    let state: MediaExecutionState
    if (['completed', 'success', 'done', 'finished'].includes(status)) state = 'completed'
    else if (['failed', 'error', 'failure'].includes(status)) state = 'failed'
    else if (['cancelled', 'canceled', 'killed', 'stopped'].includes(status)) state = 'cancelled'
    else if (['running', 'processing', 'executing'].includes(status)) state = 'running'
    else if (['queued', 'pending', 'waiting'].includes(status)) state = 'queued'
    else state = 'waiting'

    return {
      id,
      provider: 'comfy-local',
      providerExecutionId: id,
      taskId: String(pick(raw, ['task_id', 'taskId']) ?? ''),
      stepId: String(pick(raw, ['step_id', 'stepId']) ?? ''),
      state,
      progress: typeof progressRaw === 'number' ? progressRaw : undefined,
      error:
        state === 'failed' && errorMsg
          ? { code: classifyFailure(errorMsg), message: String(errorMsg), retryable: true }
          : undefined,
    }
  }
}

/** 从 fetch_outputs 结果提取本地文件路径（兼容多种返回形状）。 */
function extractOutputPaths(res: unknown): string[] {
  const out: string[] = []
  const collect = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const x of v) collect(x)
      return
    }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      const path = pick<string>(o, ['local_path', 'path', 'file', 'filename', 'output_path', 'url'])
      if (path && looksLocal(path)) {
        out.push(path)
        return
      }
      for (const x of Object.values(o)) collect(x)
    }
    if (typeof v === 'string' && looksLocal(v)) out.push(v)
  }
  collect(res)
  return [...new Set(out)]
}

function looksLocal(p: string): boolean {
  if (p.startsWith('http://') || p.startsWith('https://')) return false
  return /\.(png|jpe?g|webp|gif|bmp|mp4|mov|webm|mkv|wav|mp3|flac|m4a|ogg|glb|gltf|fbx|obj)$/i.test(p)
}

function inferMediaType(path: string): MediaAsset['type'] {
  if (/\.(mp4|mov|webm|mkv|avi)$/i.test(path)) return 'video'
  if (/\.(wav|mp3|flac|m4a|ogg|aac)$/i.test(path)) return 'audio'
  if (/\.(glb|gltf|fbx|obj|stl)$/i.test(path)) return '3d'
  return 'image'
}

function classifyFailure(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('out of memory') || m.includes('oom')) return 'OUT_OF_MEMORY'
  if (m.includes('model') && m.includes('missing')) return 'MODEL_MISSING'
  if (m.includes('node') || m.includes('custom node')) return 'NODE_MISSING'
  if (m.includes('timeout')) return 'TIMEOUT'
  if (m.includes('cancel')) return 'USER_CANCELLED'
  return 'EXECUTION_FAILED'
}
