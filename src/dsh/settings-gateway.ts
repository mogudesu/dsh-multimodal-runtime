/**
 * 媒体管理设置网关 —— 宿主半区 Typert 远程服务（namespace "mediaSettings"）。
 * 结构镜像 dsh-skill-viewer：MANIFEST 注册到 API 网关，方法挂在服务类上；
 * client 半区（client.js）用同名 CONTRIBUTION 描述符调用。
 */
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { CapabilityType, ExposedParam, MediaTask, Recipe, WorkflowNodeMapping } from '../core/index.js'
import { MediaError } from '../core/index.js'
import type { MediaSettingsData, MediaSettingsStore, RecipeDefaults } from './settings.js'
import { detectCapabilities } from './user-workflows.js'
import type { ImportWorkflowPayload, UserWorkflow } from './user-workflows.js'

// ── wire 模式（zod）───────────────────────────────────────────────────────
const codec = (symbol: string, schema: z.ZodTypeAny) => ({ mode: 'strict' as const, typeSymbol: symbol, schema })

const exposedParamSchema = z.object({
  id: z.string(),
  label: z.string(),
  nodeId: z.string(),
  nodeTitle: z.string().optional(),
  field: z.string(),
  type: z.enum(['select', 'slider', 'number', 'text']),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  default: z.unknown().optional(),
})

const recipeDefaultsSchema = z.object({
  model: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  steps: z.number().optional(),
  cfg: z.number().optional(),
  sampler: z.string().optional(),
  scheduler: z.string().optional(),
  duration: z.number().optional(),
  minDuration: z.number().optional(),
  maxDuration: z.number().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  exposedParams: z.array(exposedParamSchema).optional(),
})

const workflowNodeInputFieldSchema = z.object({
  field: z.string(),
  type: z.string(),
  value: z.unknown(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
})

const workflowNodeInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  classType: z.string(),
  inputs: z.array(workflowNodeInputFieldSchema),
})

const inspectWorkflowNodesPayloadSchema = z.any()
const inspectWorkflowNodesResultSchema = z.any()

const recipeRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  workflowFile: z.string().nullable(),
  workflowExists: z.boolean(),
  region: z.enum(['cn', 'global']).nullable(),
  defaults: recipeDefaultsSchema.nullable().optional(),
  capability: z.array(z.string()).optional(),
})
const capabilityGroupSchema = z.object({
  type: z.string(),
  label: z.string(),
  recipes: z.array(recipeRowSchema),
})
const overviewResultSchema = z.object({
  providerOnline: z.boolean(),
  workflows: z.array(z.string()),
  models: z.object({
    checkpoints: z.array(z.string()),
    samplers: z.array(z.string()),
    schedulers: z.array(z.string()),
  }),
  capabilities: z.array(capabilityGroupSchema),
  /** 远程探测仍在后台进行（结果未就绪，当前值为缓存/空表）。 */
  probing: z.boolean().optional(),
})
const setEnabledPayloadSchema = z.object({ recipeId: z.string(), enabled: z.boolean() })
const setEnabledResultSchema = z.object({ recipeId: z.string(), enabled: z.boolean() })
const setDefaultPayloadSchema = z.object({
  capability: z.string(),
  recipeId: z.string().nullable(),
})
const setDefaultResultSchema = z.object({ capability: z.string(), recipeId: z.string().nullable() })
const updatePayloadSchema = z.object({
  recipeId: z.string(),
  name: z.string().optional(),
  workflowFile: z.string().nullable().optional(),
  defaults: recipeDefaultsSchema.nullable().optional(),
})
const updateResultSchema = z.object({ recipeId: z.string() })
const updateRecipeMetaPayloadSchema = z.object({
  recipeId: z.string(),
  capability: z.array(z.string()).optional(),
})
const updateRecipeMetaResultSchema = z.object({ recipeId: z.string(), capability: z.array(z.string()) })
const deleteRecipePayloadSchema = z.object({ recipeId: z.string() })
const deleteRecipeResultSchema = z.object({ recipeId: z.string() })

const providerRowSchema = z.object({
  id: z.string(),
  configured: z.boolean(),
})
const listProvidersResultSchema = z.object({ providers: z.array(providerRowSchema) })
const setProviderConfigPayloadSchema = z.object({
  provider: z.enum(['runninghub', 'runninghub-enterprise', 'runninghub-cn', 'runninghub-global', 'openrouter']),
  scope: z.enum(['consumer', 'enterprise']).optional(),
  region: z.enum(['cn', 'global']).optional(),
  apiKey: z.string().nullable(),
})
const setProviderConfigResultSchema = z.object({ provider: z.string(), configured: z.boolean() })
const importWorkflowPayloadSchema = z.object({
  name: z.string(),
  capability: z.array(z.string()),
  provider: z.string().optional(),
  workflowJson: z.unknown(),
  nodeMapping: z.unknown().nullable().optional(),
  setAsDefault: z.boolean().optional(),
  region: z.enum(['cn', 'global']).optional(),
})
const importWorkflowResultSchema = z.object({ recipeId: z.string() })
const rhCatalogEndpointSchema = z.object({
  endpoint: z.string(),
  name: z.string(),
  task: z.string(),
  output: z.string(),
  cap: z.string(),
  pop: z.number(),
})
const refreshRhCatalogResultSchema = z.object({
  version: z.string(),
  count: z.number(),
  endpoints: z.array(rhCatalogEndpointSchema),
  region: z.enum(['cn', 'global']),
})
const refreshRhCatalogPayloadSchema = z.object({ region: z.enum(['cn', 'global']).optional() })
/** 草稿参考图（composer 附件，客户端 serializeDraftImages 序列化的 base64 载荷）。 */
const quickCreateImageSchema = z.object({
  mediaType: z.string(),
  data: z.string(),
  name: z.string().optional(),
})
const quickCreatePayloadSchema = z.object({
  capability: z.string(),
  recipeId: z.string().optional(),
  prompt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  aspect_ratio: z.string().optional(),
  megapixels: z.number().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  voice: z.string().optional(),
  images: z.array(quickCreateImageSchema).max(4).optional(),
  videos: z.array(quickCreateImageSchema).max(2).optional(),
  // 拖入素材路径交接（file-intake 已落盘到会话工作区 .dsh/uploads/）：传工作区相对路径而非
  // base64，绕开大文件过 JSON 通道的体积与耗时问题；服务端按 workspaceDir 解析并三重护栏校验
  imagePaths: z.array(z.string().min(1)).max(4).optional(),
  videoPaths: z.array(z.string().min(1)).max(2).optional(),
})
const quickCreateResultSchema = z.object({ taskId: z.string(), state: z.string() })
/** 芯片素材摄入（ingestMedia）：落盘 .dsh/uploads 并返回 rel，后续走路径交接。 */
const ingestMediaPayloadSchema = z.object({
  name: z.string().min(1),
  base64: z.string().min(1),
  kind: z.enum(['image', 'video']).optional(),
})
const ingestMediaResultSchema = z.object({ rel: z.string(), path: z.string(), size: z.number() })
/** 素材预览/打开/定位（芯片点击与右键）。 */
const mediaTargetPayloadSchema = z.object({ rel: z.string().optional(), path: z.string().optional() })
const previewMediaResultSchema = z.object({
  path: z.string(),
  name: z.string(),
  mime: z.string(),
  size: z.number(),
  dataUrl: z.string(),
})
const openMediaResultSchema = z.object({ started: z.boolean(), path: z.string() })
const revealMediaResultSchema = z.object({ path: z.string() })
/** 芯片选择上报（setComposerSelection）。 */
const composerSelectionPayloadSchema = z.object({
  mode: z.string().nullable().optional(),
  capability: z.string().nullable().optional(),
  recipeId: z.string().nullable().optional(),
  recipeName: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  ratio: z.string().nullable().optional(),
  params: z.record(z.string(), z.unknown()).nullable().optional(),
})
const composerSelectionResultSchema = z.object({ ok: z.boolean() })
/** mediaType → 扩展名（草稿参考图/参考视频落盘命名用）。 */
function mediaTypeExt(mediaType: string): string {
  const t = String(mediaType || '').toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg'
  if (t.includes('webp')) return 'webp'
  if (t.includes('gif')) return 'gif'
  if (t.includes('mp4')) return 'mp4'
  if (t.includes('webm')) return 'webm'
  if (t.includes('quicktime') || t.includes('mov')) return 'mov'
  if (t.includes('x-matroska') || t.includes('mkv')) return 'mkv'
  return ''
}
/** 素材摄入文件名护栏（与 dsh-file-intake sanitizeName 同语义）：去路径成分/危险字符，限长保扩展名。 */
function ingestSanitizeName(raw: unknown): string {
  let base = String(raw ?? '').split(/[\\/]/).pop() ?? ''
  base = base
    .replace(/[<>:"|?\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .trim()
  if (base === '' || base === '.') base = 'file'
  if (base.length > 100) {
    const dot = base.lastIndexOf('.')
    const ext = dot > 0 ? base.slice(dot) : ''
    base = base.slice(0, 100 - ext.length) + ext
  }
  return base
}

function ingestDateFolder(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const taskSnapshotPayloadSchema = z.object({ taskId: z.string() })
const taskSnapshotStepSchema = z.object({
  id: z.string(),
  capability: z.string(),
  state: z.string(),
  recipeId: z.string().nullable(),
  error: z.string().nullable(),
  progress: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
})
const taskSnapshotOutputSchema = z.object({
  stepId: z.string(),
  assetId: z.string(),
  kind: z.string(),
  path: z.string(),
  dataUrl: z.string().optional(),
})
/** 输入素材（拖入/参考媒体）：卡片「输入」区展示，可预览/打开/定位。 */
const taskSnapshotInputSchema = z.object({
  stepId: z.string(),
  assetId: z.string(),
  kind: z.string(),
  name: z.string(),
  path: z.string(),
  dataUrl: z.string().optional(),
})
const taskSnapshotResultSchema = z.object({
  taskId: z.string(),
  goal: z.string(),
  state: z.string(),
  percent: z.number(),
  done: z.number(),
  total: z.number(),
  steps: z.array(taskSnapshotStepSchema),
  outputs: z.array(taskSnapshotOutputSchema),
  inputs: z.array(taskSnapshotInputSchema).optional(),
})
const assetPayloadSchema = z.object({ assetId: z.string() })
const assetDataResultSchema = z.object({
  assetId: z.string(),
  filename: z.string(),
  mime: z.string(),
  dataUrl: z.string(),
})
const assetRevealResultSchema = z.object({ assetId: z.string(), path: z.string() })

const autoImportComfyPayloadSchema = z.object({ name: z.string().optional() })
const autoImportResultSchema = z.object({
  recipeId: z.string(),
  name: z.string(),
  capability: z.array(z.string()),
  source: z.string(),
})
const autoImportRunningHubPayloadSchema = z.object({
  workflowUrl: z.string(),
  name: z.string().optional(),
  region: z.enum(['cn', 'global']).optional(),
})
const addOpenRouterPayloadSchema = z.object({ model: z.string(), capability: z.string().optional() })
const addRunningHubAppPayloadSchema = z.object({
  appUrl: z.string(),
  name: z.string().optional(),
  nodeId: z.string().optional(),
  capability: z.string().optional(),
  region: z.enum(['cn', 'global']).optional(),
})
const addRunningHubEndpointPayloadSchema = z.object({
  endpoint: z.string(),
  name: z.string().optional(),
  capability: z.string().optional(),
  region: z.enum(['cn', 'global']).optional(),
})
const verifyRunningHubKeyPayloadSchema = z.object({
  apiKey: z.string().optional(),
  provider: z.string().optional(),
  region: z.enum(['cn', 'global']).optional(),
})
const verifyRunningHubKeyResultSchema = z.object({
  valid: z.boolean(),
  apiType: z.string().optional(),
  apiTypeLabel: z.string().optional(),
  balance: z.string().optional(),
  currency: z.string().optional(),
  runningTasks: z.string().optional(),
  message: z.string().optional(),
})
const resolveOpenRouterModelPayloadSchema = z.object({ model: z.string() })
const resolveOpenRouterModelResultSchema = z.object({
  model: z.string(),
  name: z.string(),
  capability: z.string(),
  modalities: z.array(z.string()),
})

/** 能力类型展示名。 */
const CAPABILITY_LABELS: Record<string, { zh: string; en: string }> = {
  'text-to-image': { zh: '文生图', en: 'Text to Image' },
  'image-to-video': { zh: '图生视频', en: 'Image to Video' },
  'text-to-video': { zh: '文生视频', en: 'Text to Video' },
  'first-last-frame-video': { zh: '首尾帧视频', en: 'First-Last Frame Video' },
  'video-to-audio': { zh: '视频配音', en: 'Video to Audio' },
  'text-to-audio': { zh: '文本配音', en: 'Text to Audio' },
  'text-to-music': { zh: '文生音乐', en: 'Text to Music' },
  'image-to-image': { zh: '图片重绘', en: 'Image to Image' },
  'multi-image-to-video': { zh: '多参生视频', en: 'Multi-Param to Video' },
  'image-and-video-to-video': { zh: '图+视频生视频', en: 'Image+Video to Video' },
  'image-upscale': { zh: '图片超分', en: 'Image Upscale' },
  'video-upscale': { zh: '视频超分', en: 'Video Upscale' },
  'remove-background': { zh: '抠图去背景', en: 'Remove Background' },
  'image-to-3d': { zh: '图片转3D', en: 'Image to 3D' },
}

export interface MediaSettingsGatewayOptions {
  settings: MediaSettingsStore
  /** 设置变化后的回调（把 enabled 同步到能力表）。 */
  onChange: () => void
  /** 复用 Provider 的 mcp__comfy__* 调用桥（search_models / server_info / nodes）。 */
  providerCall: (tool: string, args?: Record<string, unknown>) => Promise<unknown>
  recipes: () => Recipe[]
  workflowsDir: string
  pkgRoot: string
  /** 用户自定义工作流目录（~/.dsh/media-workflows）：下拉列表数据源与覆盖文件存在性基准。 */
  userWorkflowsDir?: string
  /** 用户工作流文件级管理（update 改能力分类 / remove 删除）；缺省时对应方法报未启用。 */
  manageUserWorkflow?: (
    action: 'update' | 'remove',
    payload: { id: string; changes?: { name?: string; capability?: string[] } },
  ) => Promise<UserWorkflow | null>
  /** 快速直调任务工厂（输入框芯片条模式：客户端不经 LLM 直接创建任务）。 */
  taskFactory?: {
    create: (spec: {
      goal: string
      steps: Array<{ id: string; capability: CapabilityType; dependsOn?: string[]; recipeId?: string; inputs?: Record<string, unknown> }>
    }) => MediaTask
  }
  /** 任务启动器（quickCreateTask 创建后立即后台执行）。 */
  startTask?: (task: MediaTask) => void
  /** 工作区根目录：拖入素材路径交接（imagePaths/videoPaths）的解析与越界校验基准。 */
  workspaceDir?: string
  /** 输入框芯片选择镜像（客户端持续上报，media_capabilities 读给 LLM；与 tools deps 共享同一对象）。 */
  composerSelection?: { at: number; data: Record<string, unknown> | null }
  /** 任务快照源（对话内进度卡片轮询用）；缺省时 taskSnapshot 报任务不存在。 */
  taskSource?: {
    get: (taskId: string) =>
      | {
          id: string
          goal: string
          state: string
          steps: Array<{
            id: string
            capability: string
            state: string
            recipeId?: string
            error?: unknown
            /** Provider 上报的执行进度（0-100，运行中有效）。 */
            progress?: number
            inputs?: Record<string, unknown>
            outputs?: Array<{ id: string }>
          }>
        }
      | undefined
  }
  /** 资产查询源（快照产出预览用）。 */
  assetSource?: {
    get: (assetId: string) => { id: string; type: string; localPath: string } | undefined
  }
  /** 草稿参考图落盘目录（quickCreateTask images 解码后写入；缺省时忽略 images）。 */
  uploadsDir?: string
  /** 输入参考图资产登记（与 TaskRunner/assetSource 同一注册表；注册后立即可被 assets.get 解析）。 */
  registerAsset?: (input: {
    type: string
    localPath: string
    provider: string
    prompt?: string
  }) => { id: string }
  /** 各 Provider 配置状态（管理页展示）。 */
  providersInfo?: () => Array<{ id: string; configured: boolean }>
  /** 用户自定义工作流导入（落盘 + 注册），返回新 recipe id。 */
  importWorkflow?: (payload: ImportWorkflowPayload) => Promise<string>
  /** ComfyUI 服务基础 URL（自动读取当前工作流用，缺省 http://127.0.0.1:8188）。 */
  comfyBaseUrl?: () => string
  /** 云端 Provider Key 解析（自动读取 RunningHub 工作流 / 校验 OpenRouter 时现取）。 */
  resolveProviderKey?: (providerId: string, region?: 'cn' | 'global') => string | undefined
}

/** 兜底采样器/调度器表（动态获取失败时用）。 */
const FALLBACK_SAMPLERS = [
  'euler',
  'euler_ancestral',
  'heun',
  'lms',
  'dpm_2',
  'dpm_2_ancestral',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_3m_sde',
  'ddim',
  'uni_pc',
  'uni_pc_bh2',
  'lcm',
]
const FALLBACK_SCHEDULERS = [
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
  'beta',
  'linear_quadratic',
]

export class MediaSettingsGateway extends TypertRemoteService {
  private opts: MediaSettingsGatewayOptions

  constructor(ctx: object, opts: MediaSettingsGatewayOptions) {
    super(ctx as never, 'mediaSettings')
    this.opts = opts
  }

  private get data(): MediaSettingsData {
    return this.opts.settings.data
  }

  /** 会话工作区（与 dsh-file-intake 的 .dsh/uploads 落盘根同源）；取不到返回 undefined。 */
  private sessionCwd(sessionId: string | undefined): string | undefined {
    if (sessionId === undefined || sessionId === null || String(sessionId).trim() === '') return undefined
    try {
      const sessions = (this.ctx as { sessions?: { get(id: string): { header?: { cwd?: string } } | undefined } }).sessions
      const cwd = sessions?.get(String(sessionId))?.header?.cwd
      return cwd === undefined || cwd === '' ? undefined : cwd
    } catch {
      return undefined
    }
  }

  private async persist(): Promise<void> {
    await this.opts.settings.save()
    this.opts.onChange()
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }

  /** 慢速远程探测缓存：comfy-cli 子进程自带网络新鲜度检查（comfy outdated，弱网可达 15s+），
   *  串行三连调用曾让媒体窗口白等 20–60s。缓存后窗口秒开：
   *  在线态 TTL 20s；离线态 TTL 4s（尽快反映"用户刚把 ComfyUI 点起来"）。 */
  private probeCache: {
    at: number
    online: boolean
    models: { checkpoints: string[]; samplers: string[]; schedulers: string[] }
  } | null = null

  /** 给 providerCall 加超时兜底：超时或失败都返回 fallback，绝不让设置页干等。 */
  private withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise<T>((resolve) => {
      let done = false
      const finish = (v: T) => {
        if (!done) {
          done = true
          clearTimeout(timer)
          resolve(v)
        }
      }
      const timer = setTimeout(() => finish(fallback), ms)
      p.then((v) => finish(v), () => finish(fallback))
    })
  }

  private async modelLists(): Promise<{
    checkpoints: string[]
    samplers: string[]
    schedulers: string[]
  }> {
    // 两个远程查询相互独立 → 并行；各自带快速超时，ComfyUI 离线时立即落到兜底表
    const [ckptRes, ksamplerRes] = await Promise.all([
      this.withTimeout(
        this.opts.providerCall('search_models', { folder: 'checkpoints' }) as Promise<{
          files?: Array<{ name?: string }>
        }>,
        1000,
        null,
      ),
      this.withTimeout(this.opts.providerCall('nodes', { action: 'get', name: 'KSampler' }).catch(() => undefined), 1000, undefined),
    ])
    const checkpoints: string[] = []
    for (const f of ckptRes?.files ?? []) if (typeof f.name === 'string') checkpoints.push(f.name)
    let samplers = FALLBACK_SAMPLERS
    let schedulers = FALLBACK_SCHEDULERS
    try {
      const found = extractEnums(ksamplerRes)
      if (found.samplers.length > 0) samplers = found.samplers
      if (found.schedulers.length > 0) schedulers = found.schedulers
    } catch {
      // 保持兜底表
    }
    return { checkpoints, samplers, schedulers }
  }

  /** 在线探测：server_info 走 comfy env → 800ms 超时兜底为离线。 */
  private async probeOnline(): Promise<boolean> {
    let res: Record<string, unknown> | null
    try {
      res = await this.withTimeout(
        this.opts.providerCall('server_info') as Promise<Record<string, unknown>>,
        800,
        null,
      )
    } catch {
      return false
    }
    // 超时兜底（null）≠ "响应缺 server 字段"：前者必须视为离线
    if (!res)
      return false
    const server = res['server'] as Record<string, unknown> | undefined
    return server ? server['running'] === true : true
  }

  async overview(): Promise<unknown> {
    // 工作流下拉列表 = 用户导入的工作流（~/.dsh/media-workflows），默认为空，等用户导入；
    // 内置模板不进入该列表（它们作为内置 Recipe 的缺省 workflow 继续生效）。
    let workflows: string[] = []
    try {
      workflows = (await readdir(this.opts.userWorkflowsDir ?? this.opts.workflowsDir))
        .filter((f) => f.endsWith('.json') && !f.endsWith('.recipe.json') && !f.endsWith('.mapping.json'))
        .sort()
    } catch {
      workflows = []
    }

    const recipes = this.opts.recipes()
    const byType = new Map<string, Recipe[]>()
    for (const r of recipes) {
      for (const t of r.capability) {
        const list = byType.get(t) ?? []
        list.push(r)
        byType.set(t, list)
      }
    }
    const capabilities = [...byType.entries()].map(([type, list]) => ({
      type,
      label: CAPABILITY_LABELS[type]?.zh ?? type,
      recipes: list.map((r) => {
        const s = this.data.recipes[r.id]
        const file = s?.workflowFile ?? basenameOf(r.workflow?.path ?? '')
        return {
          id: r.id,
          name: String(s?.name ?? r.name ?? r.id),
          provider: String(r.provider ?? 'comfy-local'),
          enabled: s?.enabled !== false,
          isDefault: this.data.capabilityDefault[type] === r.id,
          workflowFile: s?.workflowFile ?? null,
          workflowExists: false as boolean,
          region: r.run?.region ?? null,
          defaults: s?.defaults ?? (r.nodeMapping?.exposedParams ? { exposedParams: r.nodeMapping.exposedParams } : null),
          nodeMapping: r.nodeMapping ?? null,
          capability: r.capability,
        }
      }),
    }))
    // workflow 存在性：覆盖文件优先，否则 recipe 内置路径（pkgRoot 相对）；本地磁盘并行查
    await Promise.all(
      capabilities.flatMap((group) =>
        group.recipes.map(async (row) => {
          const recipe = recipes.find((r) => r.id === row.id)
          const declared = recipe?.workflow?.path ?? ''
          const abs = row.workflowFile
            ? join(this.opts.userWorkflowsDir ?? this.opts.workflowsDir, row.workflowFile)
            : declared
              ? join(this.opts.pkgRoot, declared)
              : ''
          row.workflowExists = abs !== '' && (await this.fileExists(abs))
        }),
      ),
    )

    // 远程部分（慢）：并行探测 + 超时 + TTL 缓存，本地部分每次现算保证设置即时生效
    const now = Date.now()
    const ttl = this.probeCache?.online === true ? 20_000 : 4_000
    if (!this.probeCache || now - this.probeCache.at > ttl) {
      const [online, models] = await Promise.all([this.probeOnline(), this.modelLists()])
      this.probeCache = { at: now, online, models }
    }
    return { providerOnline: this.probeCache.online, workflows, models: this.probeCache.models, capabilities }
  }

  /** 自省工作流节点参数：返回工作流的所有节点、输入属性及推荐暴露参数。 */
  async inspectWorkflowNodes(payload: { recipeId: string; workflowJson?: string }): Promise<unknown> {
    const recipes = this.opts.recipes()
    const recipe = recipes.find((r) => r.id === payload.recipeId)
    let raw: unknown = null
    if (payload.workflowJson) {
      try {
        raw = typeof payload.workflowJson === 'string' ? JSON.parse(payload.workflowJson) : payload.workflowJson
      } catch {
        // ignore
      }
    }
    const bases = [
      ...new Set(
        [
          this.opts.userWorkflowsDir,
          this.opts.workflowsDir,
          join(process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '', '.dsh'), 'media-workflows'),
        ].filter((b): b is string => Boolean(b)),
      ),
    ]
    for (const b of bases) {
      if (raw) break
      const candidates = [
        recipe?.workflow?.path,
        recipe?.workflow?.path && !recipe.workflow.path.endsWith('.json') ? `${recipe.workflow.path}.json` : null,
        `${payload.recipeId}.json`,
        payload.recipeId.replace(/-(text-to-image|image-to-image|image-to-video|text-to-video|first-last-frame-video|multi-image-to-video)$/, '.json'),
      ].filter((c): c is string => Boolean(c))
      for (const cand of candidates) {
        try {
          const abs = isAbsolute(cand) ? cand : join(b, cand)
          raw = JSON.parse(await readFile(abs, 'utf8'))
          if (raw) break
        } catch {
          // ignore
        }
      }
    }

    const { nodes, suggestedExposedParams } = extractWorkflowNodes(raw)
    return {
      recipeId: payload.recipeId,
      nodes,
      suggestedExposedParams,
    }
  }

  /**
   * 任务快照：对话内进度卡片轮询用（区别于 media_task_status 的模型视图）。
   * 百分比 = 已完成 step / 总 step；图片产出 ≤8MB 时内联 dataUrl 供 <img> 预览，
   * 视频/音频只给本地路径（卡片用宿主 openFile 打开）。
   */
  /**
   * 快速直调创建任务（输入框芯片条模式）：客户端按所选能力/工作流/尺寸直接创建单步任务，
   * 不经 LLM 推理。recipeId 显式指定时校验存在性与能力归属（与 media_create_task 同语义）。
   */
  async quickCreateTask(sessionId: string | undefined, payload: {
    capability: string
    recipeId?: string
    prompt: string
    width?: number
    height?: number
    duration?: number
    aspect_ratio?: string
    megapixels?: number
    params?: Record<string, unknown>
    voice?: string
    images?: Array<{ mediaType: string; data: string; name?: string }>
    videos?: Array<{ mediaType: string; data: string; name?: string }>
    imagePaths?: string[]
    videoPaths?: string[]
  }): Promise<unknown> {
    const prompt = payload.prompt.trim()
    if (!prompt) throw new MediaError('INPUT_INVALID', 'prompt 不能为空', { retryable: false })
    // 容错：capability 误填为 media_capabilities 条目 id（`${type}@${recipeId}`）时拆分归位
    //（显式 recipeId 优先；与 tools.ts normalizeStepsCapability 双保险）
    if (typeof payload.capability === 'string' && payload.capability.includes('@')) {
      const at = payload.capability.lastIndexOf('@')
      const type = payload.capability.slice(0, at).trim()
      const recipe = payload.capability.slice(at + 1).trim()
      if (type && recipe) {
        payload.capability = type
        if (!payload.recipeId || !String(payload.recipeId).trim()) payload.recipeId = recipe
      }
    }
    const rid = typeof payload.recipeId === 'string' ? payload.recipeId.trim() : ''
    if (rid) {
      const recipe = this.opts.recipes().find((r) => r.id === rid)
      if (!recipe) {
        throw new MediaError('INPUT_INVALID', '指定的 recipeId 不存在: ' + rid, { retryable: false })
      }
      if (!recipe.capability.includes(payload.capability as never)) {
        // 自适应容错：当用户附带图片导致 capability 提升为 image-to-image，
        // 但 recipe 只声明 text-to-image 时，降级回 recipe 声明的首个能力。
        // 图片仍作为 inputs.assets 传递给 TaskRunner（Runner 会解析并注入工作流）。
        if (recipe.capability.length > 0) {
          payload.capability = recipe.capability[0]!
        } else {
          throw new MediaError(
            'INPUT_INVALID',
            'recipeId ' + rid + ' 不支持能力 ' + payload.capability + '（声明: ' + recipe.capability.join(', ') + '）',
            { retryable: false },
          )
        }
      }
    }
    // 素材-能力匹配校验（双保险；前端已先拦）：不匹配直接报错，不得静默换能力/换工作流生成
    // 路径交接的拖入素材与 base64 参考媒体一样计入
    const assetErr = requiredAssetCheck(payload.capability, {
      imageCount: (Array.isArray(payload.images) ? payload.images.length : 0) + (Array.isArray(payload.imagePaths) ? payload.imagePaths.length : 0),
      videoCount: (Array.isArray(payload.videos) ? payload.videos.length : 0) + (Array.isArray(payload.videoPaths) ? payload.videoPaths.length : 0),
    })
    if (assetErr) throw new MediaError('INPUT_INVALID', assetErr, { retryable: false })
    const inputs: Record<string, unknown> = { prompt, __mmrComposer: true }
    if (typeof payload.width === 'number') inputs.width = payload.width
    if (typeof payload.height === 'number') inputs.height = payload.height
    if (typeof payload.duration === 'number') inputs.duration = payload.duration
    if (typeof payload.aspect_ratio === 'string' && payload.aspect_ratio.trim()) inputs.aspect_ratio = payload.aspect_ratio.trim()
    if (typeof payload.megapixels === 'number') inputs.megapixels = payload.megapixels
    if (payload.params && typeof payload.params === 'object') {
      inputs.params = { ...payload.params }
      Object.assign(inputs, payload.params)
    }
    if (typeof payload.voice === 'string' && payload.voice.trim()) inputs.voice = payload.voice.trim()
    // 草稿参考媒体（图片/视频）：base64 → 落盘 uploads（内容寻址去重）→ 登记资产 → inputs.assets
    // （TaskRunner 把 inputs.assets 按 asset.type 解析成 assetInputs.image / video 槽位 → Provider 上传注入工作流）
    // 拖入素材路径交接：工作区相对路径 → 三重护栏校验 → 读盘 → 同一条去重落盘/登记管线
    const mediaItems: Array<{ item: { mediaType: string; data: string; name?: string }; kind: 'image' | 'video' }> = []
    for (const img of Array.isArray(payload.images) ? payload.images.slice(0, 4) : [])
      mediaItems.push({ item: img, kind: 'image' })
    for (const vid of Array.isArray(payload.videos) ? payload.videos.slice(0, 2) : [])
      mediaItems.push({ item: vid, kind: 'video' })
    const pathItems: Array<{ abs: string; kind: 'image' | 'video'; name: string }> = []
    if (this.opts.workspaceDir || this.sessionCwd(sessionId)) {
      for (const rel of (Array.isArray(payload.imagePaths) ? payload.imagePaths : []).slice(0, 4)) {
        const abs = await this.resolveWorkspaceMedia(rel, sessionId)
        pathItems.push({ abs, kind: 'image', name: abs.split(/[\\/]/).pop() ?? 'image' })
      }
      for (const rel of (Array.isArray(payload.videoPaths) ? payload.videoPaths : []).slice(0, 2)) {
        const abs = await this.resolveWorkspaceMedia(rel, sessionId)
        pathItems.push({ abs, kind: 'video', name: abs.split(/[\\/]/).pop() ?? 'video' })
      }
    }
    if ((mediaItems.length > 0 || pathItems.length > 0) && this.opts.uploadsDir && this.opts.registerAsset) {
      const assetIds: string[] = []
      await mkdir(this.opts.uploadsDir, { recursive: true })
      let imgSeq = 0
      let vidSeq = 0
      for (const { item, kind } of mediaItems) {
        try {
          const b64 = String(item.data || '').replace(/^data:[^,]*,/, '')
          if (!b64) continue
          const bytes = Buffer.from(b64, 'base64')
          if (bytes.length === 0) continue
          const ext = mediaTypeExt(item.mediaType) || (kind === 'video' ? 'mp4' : 'png')
          const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
          const localPath = join(this.opts.uploadsDir, `ref-${digest}.${ext}`)
          await writeFile(localPath, bytes)
          const asset = this.opts.registerAsset({
            type: kind,
            localPath,
            provider: 'draft-upload',
            prompt: item.name || (kind === 'video' ? `参考视频${++vidSeq}` : `参考图${++imgSeq}`),
          })
          if (asset && asset.id) assetIds.push(asset.id)
        } catch {
          // 单个参考媒体失败不阻断任务创建（退化为纯文本生成）
        }
      }
      for (const { abs, kind, name } of pathItems) {
        try {
          const bytes = await readFile(abs)
          const ext = (abs.split('.').pop() ?? '').toLowerCase() || (kind === 'video' ? 'mp4' : 'png')
          const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
          const localPath = join(this.opts.uploadsDir, `ref-${digest}.${ext}`)
          // 来源与目标同盘（rel 已在 uploads/ 内）时去重落盘退化为原文件直登记
          if (localPath.replace(/[\\/]/g, '/').toLowerCase() !== abs.replace(/[\\/]/g, '/').toLowerCase())
            await writeFile(localPath, bytes)
          const asset = this.opts.registerAsset({
            type: kind,
            localPath,
            provider: 'file-intake',
            prompt: name,
          })
          if (asset && asset.id) assetIds.push(asset.id)
        } catch {
          // 单个拖入素材失败不阻断任务创建
        }
      }
      if (assetIds.length > 0) inputs.assets = assetIds
    }
    const task = this.opts.taskFactory!.create({
      goal: prompt.length > 60 ? prompt.slice(0, 60) + '…' : prompt,
      steps: [{ id: 'gen', capability: payload.capability as CapabilityType, recipeId: rid || undefined, inputs }],
    })
    this.opts.startTask?.(task)
    return { taskId: task.id, state: task.state }
  }

  /**
   * 拖入素材交接路径的护栏（与 dsh-file-intake resolveWorkspaceFile 同语义，外加任意路径支持）：
   * - 绝对路径：直接接受（本机桌面工具，用户可从任意目录拖入；文件必须真实存在）；
   * - 相对路径：只接收 .dsh/uploads/ 交接目录，逐段拒绝 .. 穿越，解析基准依次尝试
   *   【会话工作区（与 file-intake 落盘同源，主基准）→ workspaceDir（process.cwd() 兜底）】。
   * @param rawRel - file-intake 返回的工作区相对路径（如 .dsh/uploads/2026-08-28/a.mp4）或绝对路径。
   * @returns 绝对路径；路径不合法/文件缺失抛 INPUT_INVALID（消息含「素材」，客户端会拦下
   * 发送并展示——显式失败优于静默丢素材继续生成）。
   */
  private async resolveWorkspaceMedia(rawRel: string, sessionId?: string): Promise<string> {
    const clean = String(rawRel ?? '').trim().replace(/\\/g, '/')
    if (clean === '') throw new MediaError('INPUT_INVALID', '素材引用路径为空', { retryable: false })
    if (clean.startsWith('/') || /^[a-zA-Z]:/.test(clean)) {
      const abs = resolve(clean)
      const info = await stat(abs).catch(() => null)
      if (!info || !info.isFile()) {
        throw new MediaError('INPUT_INVALID', '素材文件不存在或已被移动: ' + clean, { retryable: false })
      }
      return abs
    }
    if (!clean.startsWith('.dsh/uploads/')) {
      throw new MediaError('INPUT_INVALID', '素材引用必须位于 .dsh/uploads/ 内: ' + clean, { retryable: false })
    }
    const segments = clean.split('/').filter((segment) => segment !== '' && segment !== '.')
    if (segments.some((segment) => segment === '..')) {
      throw new MediaError('INPUT_INVALID', '非法的素材引用路径: ' + clean, { retryable: false })
    }
    const bases: string[] = []
    const sessionBase = this.sessionCwd(sessionId)
    if (sessionBase) bases.push(sessionBase)
    if (this.opts.workspaceDir && (bases.length === 0 || resolve(bases[0]!) !== resolve(this.opts.workspaceDir))) {
      bases.push(this.opts.workspaceDir)
    }
    for (const base of bases) {
      const rootAbs = resolve(base)
      const abs = resolve(rootAbs, ...segments)
      if (!abs.startsWith(rootAbs + sep)) continue
      const info = await stat(abs).catch(() => null)
      if (info && info.isFile()) return abs
    }
    throw new MediaError('INPUT_INVALID', '素材文件不存在或已被移动: ' + clean, { retryable: false })
  }

  /** open/reveal/preview 共用目标解析：绝对 path 直查存在性；否则按 rel 走工作区护栏。 */
  private async resolveMediaTarget(sessionId: string | undefined, payload: { rel?: string; path?: string }): Promise<string> {
    if (typeof payload.path === 'string' && payload.path.trim() !== '') {
      const abs = resolve(payload.path.trim())
      const info = await stat(abs).catch(() => null)
      if (!info || !info.isFile()) {
        throw new MediaError('OUTPUT_MISSING', `文件不存在: ${abs}`, { retryable: false })
      }
      return abs
    }
    if (typeof payload.rel === 'string' && payload.rel.trim() !== '') {
      return this.resolveWorkspaceMedia(payload.rel, sessionId)
    }
    throw new MediaError('INPUT_INVALID', '缺少素材引用（rel 或 path）', { retryable: false })
  }

  /**
   * 芯片素材摄入（📎参考视频 / 拖入捕获的落盘入口）：把浏览器侧文件写入会话工作区
   * `.dsh/uploads/<day>/`（与 dsh-file-intake 同目录同名规则），返回 rel 供后续
   * 路径交接/预览/定位复用，避免大文件 base64 过 JSON 通道。
   */
  async ingestMedia(sessionId: string | undefined, payload: { name: string; base64: string; kind?: 'image' | 'video' }): Promise<unknown> {
    const raw = String(payload.base64 ?? '').replace(/^data:[^,]*,/, '')
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 0) throw new MediaError('INPUT_INVALID', '文件内容为空', { retryable: false })
    if (decoded.length > 200 * 1024 * 1024) throw new MediaError('INPUT_INVALID', '文件超过 200MB 上限', { retryable: false })
    const base = this.sessionCwd(sessionId) ?? this.opts.workspaceDir
    if (!base) throw new MediaError('INPUT_INVALID', '当前会话没有工作区，无法接收素材', { retryable: false })
    const name = ingestSanitizeName(payload.name)
    const day = ingestDateFolder()
    const dir = join(base, '.dsh', 'uploads', day)
    await mkdir(dir, { recursive: true })
    // 内容寻址去重：同一文件可能被多个入口各上传一份（实测 file-intake 与本插件的 drop
    // 监听顺序不稳定时同一拖入会落两份、消息出现两条 @引用）。sha256 一致即复用既有文件。
    const digest = createHash('sha256').update(decoded).digest('hex')
    const existing = await readdir(dir).catch(() => [] as string[])
    for (const candName of existing) {
      const cand = join(dir, candName)
      try {
        const candInfo = await stat(cand)
        if (!candInfo.isFile() || candInfo.size !== decoded.length) continue
        const candHash = createHash('sha256').update(await readFile(cand)).digest('hex')
        if (candHash === digest) {
          const rel = ['.dsh', 'uploads', day, candName].join('/')
          return { rel, path: cand, size: decoded.length }
        }
      } catch {
        // 单个候选文件不可读时跳过
      }
    }
    let final = join(dir, name)
    for (let i = 2; ; i++) {
      let exists = false
      try {
        exists = (await stat(final)).isFile()
      } catch {
        exists = false
      }
      if (!exists) break
      const dot = name.lastIndexOf('.')
      const stem = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      final = join(dir, `${stem}-${i}${ext}`)
    }
    await writeFile(final, decoded)
    const rel = ['.dsh', 'uploads', day, final.slice(dir.length + 1).replace(/\\/g, '/')].join('/')
    return { rel, path: final, size: decoded.length }
  }

  /** 素材内联预览（芯片点击）：≤24MB 直接回 dataUrl，超出明确报错引导右键定位。 */
  async previewMedia(sessionId: string | undefined, payload: { rel?: string; path?: string }): Promise<unknown> {
    const abs = await this.resolveMediaTarget(sessionId, payload)
    const info = await stat(abs)
    if (info.size > 24 * 1024 * 1024) {
      throw new MediaError('INPUT_INVALID', '文件超过 24MB，无法内联预览；请右键素材打开所在位置', { retryable: false })
    }
    const ext = (abs.split('.').pop() ?? '').toLowerCase()
    const mime = MIME_BY_EXT[ext]
      ?? (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'application/octet-stream')
    const data = await readFile(abs)
    return {
      path: abs,
      name: abs.split(/[\\/]/).pop() ?? 'media',
      mime,
      size: info.size,
      dataUrl: `data:${mime};base64,${data.toString('base64')}`,
    }
  }

  /** 用系统默认程序打开素材（芯片点击且无法内联预览时的兜底）。 */
  async openMedia(sessionId: string | undefined, payload: { rel?: string; path?: string }): Promise<unknown> {
    const abs = await this.resolveMediaTarget(sessionId, payload)
    const { spawn } = await import('node:child_process')
    if (process.platform === 'win32') {
      spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', 'Start-Process', '-FilePath', abs], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'darwin') {
      spawn('open', [abs], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('xdg-open', [abs], { detached: true, stdio: 'ignore' }).unref()
    }
    return { started: true, path: abs }
  }

  /** 在文件管理器中定位素材（芯片右键「打开所在位置」）。 */
  async revealMedia(sessionId: string | undefined, payload: { rel?: string; path?: string }): Promise<unknown> {
    const abs = await this.resolveMediaTarget(sessionId, payload)
    const { execFile } = await import('node:child_process')
    const { dirname } = await import('node:path')
    if (process.platform === 'win32') {
      execFile('explorer.exe', ['/select,', abs], { windowsHide: true }, () => {})
    } else if (process.platform === 'darwin') {
      execFile('open', ['-R', abs], { windowsHide: true }, () => {})
    } else {
      execFile('xdg-open', [dirname(abs)], { windowsHide: true }, () => {})
    }
    return { path: abs }
  }

  /**
   * 芯片选择上报（客户端在芯片状态变化时持续调用）：存内存镜像，media_capabilities
   * 读给 LLM——这样芯片直调之外的模式（如音频走 LLM 解析）也能按用户所选工作流生成，
   * 且完全不需要修改用户消息文本。
   */
  async setComposerSelection(
    sessionId: string | undefined,
    payload: {
      mode?: string | null
      capability?: string | null
      recipeId?: string | null
      recipeName?: string | null
      duration?: number | null
      ratio?: string | null
      params?: Record<string, unknown> | null
    },
  ): Promise<unknown> {
    const slot = this.opts.composerSelection
    if (!slot) return { ok: true }
    slot.data = payload && payload.mode ? { ...payload } : null
    slot.at = Date.now()
    return { ok: true }
  }

  async taskSnapshot(payload: { taskId: string }): Promise<unknown> {
    const t = this.opts.taskSource?.get(payload.taskId)
    if (!t) throw new MediaError('EXECUTION_FAILED', `任务不存在: ${payload.taskId}`, { retryable: false })
    const total = t.steps.length
    // 加权百分比：完成步计满，运行步按 provider 上报的 progress 折算（上限 99%，留白给收尾）。
    const stepFraction = (s: { state: string; progress?: number }): number => {
      const state = String(s.state ?? '').toUpperCase()
      if (state === 'SUCCEEDED' || state === 'DONE' || state === 'COMPLETED') return 1
      if (state === 'RUNNING' && typeof s.progress === 'number' && Number.isFinite(s.progress)) {
        return Math.min(0.99, Math.max(0, s.progress / 100))
      }
      return 0
    }
    const done = t.steps.filter((s) => {
      const state = String(s.state ?? '').toUpperCase()
      return state === 'SUCCEEDED' || state === 'DONE' || state === 'COMPLETED'
    }).length
    const weighted = t.steps.reduce((acc, s) => acc + stepFraction(s), 0)
    const percent = total === 0 ? 0 : Math.min(100, Math.round((weighted / total) * 100))
    const outputs: Array<{ stepId: string; assetId: string; kind: string; path: string; dataUrl?: string }> = []
    for (const s of t.steps) {
      for (const ref of s.outputs ?? []) {
        const a = this.opts.assetSource?.get(ref.id)
        if (!a) continue
        const entry: { stepId: string; assetId: string; kind: string; path: string; dataUrl?: string } = {
          stepId: s.id,
          assetId: a.id,
          kind: a.type,
          path: a.localPath,
        }
        if (a.type === 'image') {
          const url = await inlineFileDataUrl(a.localPath, 8 * 1024 * 1024)
          if (url) entry.dataUrl = url
        } else if (a.type === 'audio') {
          // 音频内联（≤8MB）：对话卡片 <audio> 直接播放（mp3/wav 一般 1~3MB）
          const url = await inlineFileDataUrl(a.localPath, 8 * 1024 * 1024)
          if (url) entry.dataUrl = url
        } else if (a.type === 'video') {
          // 视频内联（≤20MB）：对话卡片 <video> 直接播放；超限退化为"打开文件"按钮
          const url = await inlineFileDataUrl(a.localPath, 20 * 1024 * 1024)
          if (url) entry.dataUrl = url
        }
        outputs.push(entry)
      }
    }
    // 输入素材（拖入/参考媒体）：卡片「输入」区展示（预览/打开/定位），方便用户核对自己
    // 提交的素材（实测反馈：输入视频在对话里不可见、无法预览/定位）
    const inputs: Array<{ stepId: string; assetId: string; kind: string; name: string; path: string; dataUrl?: string }> = []
    const seenAssets = new Set<string>()
    for (const s of t.steps) {
      const aids = Array.isArray(s.inputs?.['assets']) ? (s.inputs!['assets'] as unknown[]) : []
      for (const aid of aids) {
        const id = String(aid)
        if (seenAssets.has(id)) continue
        seenAssets.add(id)
        const a = this.opts.assetSource?.get(id)
        if (!a) continue
        const entry: { stepId: string; assetId: string; kind: string; name: string; path: string; dataUrl?: string } = {
          stepId: s.id,
          assetId: a.id,
          kind: a.type,
          name: a.localPath.split(/[\\/]/).pop() ?? a.id,
          path: a.localPath,
        }
        if (a.type === 'image' || a.type === 'audio') {
          const url = await inlineFileDataUrl(a.localPath, 8 * 1024 * 1024)
          if (url) entry.dataUrl = url
        } else if (a.type === 'video') {
          const url = await inlineFileDataUrl(a.localPath, 20 * 1024 * 1024)
          if (url) entry.dataUrl = url
        }
        inputs.push(entry)
      }
    }
    return {
      taskId: t.id,
      goal: t.goal,
      state: t.state,
      percent,
      done,
      total,
      steps: t.steps.map((s) => ({
        id: s.id,
        capability: s.capability,
        state: s.state,
        recipeId: s.recipeId ?? null,
        error: errorMessageOf(s.error),
        progress: typeof s.progress === 'number' ? s.progress : null,
        width: typeof s.inputs?.['width'] === 'number' ? (s.inputs['width'] as number) : null,
        height: typeof s.inputs?.['height'] === 'number' ? (s.inputs['height'] as number) : null,
      })),
      outputs,
      inputs,
    }
  }

  /** 供对话媒体卡下载完整本地资产；小于快照内联上限的文件仍优先直接使用 dataUrl。 */
  async assetData(payload: { assetId: string }): Promise<unknown> {
    const asset = this.opts.assetSource?.get(payload.assetId)
    if (!asset) throw new MediaError('OUTPUT_MISSING', `资产不存在: ${payload.assetId}`, { retryable: false })
    const st = await stat(asset.localPath).catch(() => null)
    if (!st || !st.isFile()) throw new MediaError('OUTPUT_MISSING', `资产文件不存在: ${asset.localPath}`, { retryable: false })
    if (st.size > 128 * 1024 * 1024) throw new MediaError('OUTPUT_MISSING', '文件超过 128MB，无法从对话卡下载', { retryable: false })
    const ext = asset.localPath.split('.').pop()?.toLowerCase() ?? 'bin'
    const mime = MIME_BY_EXT[ext] ?? (asset.type === 'audio' ? 'audio/mpeg' : asset.type === 'video' ? 'video/mp4' : 'application/octet-stream')
    const data = await readFile(asset.localPath)
    return {
      assetId: asset.id,
      filename: asset.localPath.split(/[\\/]/).pop() ?? `${asset.type}.${ext}`,
      mime,
      dataUrl: `data:${mime};base64,${data.toString('base64')}`,
    }
  }

  /** 使用宿主系统打开资产所在位置，不经 shell 拼接，Windows 下不弹命令行窗口。 */
  async revealAsset(payload: { assetId: string }): Promise<unknown> {
    const asset = this.opts.assetSource?.get(payload.assetId)
    if (!asset) throw new MediaError('OUTPUT_MISSING', `资产不存在: ${payload.assetId}`, { retryable: false })
    const { execFile } = await import('node:child_process')
    const { dirname } = await import('node:path')
    if (process.platform === 'win32') {
      execFile('explorer.exe', ['/select,', asset.localPath], { windowsHide: true })
    } else {
      execFile('xdg-open', [dirname(asset.localPath)], { windowsHide: true })
    }
    return { assetId: asset.id, path: asset.localPath }
  }

  async setEnabled(payload: { recipeId: string; enabled: boolean }): Promise<unknown> {
    const cur = this.data.recipes[payload.recipeId] ?? {}
    cur.enabled = payload.enabled
    this.data.recipes[payload.recipeId] = cur
    await this.persist()
    return { recipeId: payload.recipeId, enabled: payload.enabled }
  }

  async setCapabilityDefault(payload: { capability: string; recipeId: string | null }): Promise<unknown> {
    if (payload.recipeId !== null) {
      const owns = this.opts
        .recipes()
        .some((r) => r.capability.includes(payload.capability as CapabilityType) && r.id === payload.recipeId)
      if (!owns) {
        throw new MediaError(
          'INPUT_INVALID',
          `Recipe ${payload.recipeId} 不属于能力 ${payload.capability}`,
          { retryable: false },
        )
      }
    }
    if (payload.recipeId === null) delete this.data.capabilityDefault[payload.capability]
    else this.data.capabilityDefault[payload.capability] = payload.recipeId
    await this.persist()
    return { capability: payload.capability, recipeId: payload.recipeId }
  }

  async updateRecipe(payload: {
    recipeId: string
    name?: string
    workflowFile?: string | null
    defaults?: RecipeDefaults | null
  }): Promise<unknown> {
    const cur = this.data.recipes[payload.recipeId] ?? {}
    if (payload.name !== undefined) {
      const n = payload.name.trim()
      if (n) cur.name = n
      else delete cur.name
    }
    if (payload.workflowFile !== undefined) {
      if (payload.workflowFile === null) delete cur.workflowFile
      else cur.workflowFile = payload.workflowFile
    }
    if (payload.defaults !== undefined) {
      if (payload.defaults === null) delete cur.defaults
      else {
        const merged = { ...(cur.defaults ?? {}) }
        for (const [k, v] of Object.entries(payload.defaults)) {
          if (v === undefined || v === null || v === '') delete merged[k as keyof RecipeDefaults]
          else merged[k as keyof RecipeDefaults] = v as never
        }
        cur.defaults = Object.keys(merged).length > 0 ? merged : undefined
        if (cur.defaults === undefined) delete cur.defaults
      }
    }
    this.data.recipes[payload.recipeId] = cur
    await this.persist()
    return { recipeId: payload.recipeId }
  }

  /** 用户工作流文件级管理（改能力分类/删除）；index.ts 侧落盘 + 热注册。 */
  async updateRecipeMeta(payload: { recipeId: string; capability?: string[] }): Promise<unknown> {
    if (!this.opts.manageUserWorkflow) throw new MediaError('UNKNOWN', '工作流管理未启用')
    const caps = Array.isArray(payload.capability) ? payload.capability.map(String).filter(Boolean) : undefined
    if (caps !== undefined && caps.length === 0) {
      throw new MediaError('INPUT_INVALID', '至少选择一个能力分类', { retryable: false })
    }
    const wf = await this.opts.manageUserWorkflow('update', { id: payload.recipeId, changes: caps ? { capability: caps } : {} })
    if (!wf) throw new MediaError('INPUT_INVALID', `工作流不存在或不可修改: ${payload.recipeId}`, { retryable: false })
    // 改能力后清理旧能力的默认路由：capabilityDefault 中仍指向该 recipe、但已不在新能力列表内的项
    // 必须删除（对齐 deleteRecipe 的清理语义），否则旧能力（如 text-to-image）的默认路由继续指向
    // 已改分类的模型，导致该能力任务静默路由到不支持的工作流（如 OpenRouter 模态 404）
    let changed = false
    for (const [type, rid] of Object.entries({ ...this.data.capabilityDefault })) {
      if (rid === payload.recipeId && !wf.recipe.capability.includes(type as never)) {
        delete this.data.capabilityDefault[type]
        changed = true
      }
    }
    if (changed) await this.persist()
    return { recipeId: payload.recipeId, capability: wf.recipe.capability }
  }

  /** 删除用户导入的工作流（文件 + 注册表 + 设置覆盖/默认路由清理）。 */
  async deleteRecipe(payload: { recipeId: string }): Promise<unknown> {
    if (!this.opts.manageUserWorkflow) throw new MediaError('UNKNOWN', '工作流管理未启用')
    await this.opts.manageUserWorkflow('remove', { id: payload.recipeId })
    delete this.data.recipes[payload.recipeId]
    for (const [type, rid] of Object.entries({ ...this.data.capabilityDefault })) {
      if (rid === payload.recipeId) delete this.data.capabilityDefault[type]
    }
    await this.persist()
    return { recipeId: payload.recipeId }
  }

  /** 列出各 Provider 及其配置状态。 */
  async listProviders(): Promise<unknown> {
    return { providers: this.opts.providersInfo?.() ?? [] }
  }

  /** 保存 Provider API Key（写入 settings；置 null 清除）。 */
  async setProviderConfig(payload: {
    provider: 'runninghub' | 'runninghub-enterprise' | 'runninghub-cn' | 'runninghub-global' | 'openrouter'
    scope?: 'consumer' | 'enterprise'
    region?: 'cn' | 'global'
    apiKey: string | null
  }): Promise<unknown> {
    const bag = (this.opts.settings.data.providers ??= {})
    if (payload.provider === 'openrouter') {
      const cur = bag.openrouter ?? {}
      if (payload.apiKey === null || payload.apiKey === '') delete cur.apiKey
      else cur.apiKey = payload.apiKey
      bag.openrouter = cur
      await this.persist()
      return { provider: 'openrouter', configured: Boolean(cur.apiKey) }
    }
    // RunningHub：scope（消费级/企业级）+ region（国内版/国际版）决定槽位 runninghub-<region>
    // 与字段（消费级写 apiKey、企业级写 enterpriseApiKey）；与 resolveRunningHubKey 读取一致。
    const scope = payload.scope ?? (payload.provider === 'runninghub-enterprise' ? 'enterprise' : 'consumer')
    const region = payload.region ?? (payload.provider === 'runninghub-global' ? 'global' : 'cn')
    const slot = `runninghub-${region}`
    const cur = bag[slot] ?? {}
    if (payload.apiKey === null || payload.apiKey === '') {
      if (scope === 'enterprise') delete cur.enterpriseApiKey
      else delete cur.apiKey
    } else if (scope === 'enterprise') cur.enterpriseApiKey = payload.apiKey
    else cur.apiKey = payload.apiKey
    bag[slot] = cur
    await this.persist()
    return { provider: slot, scope, region, configured: Boolean(cur.apiKey || cur.enterpriseApiKey) }
  }

  /** 导入用户自定义工作流（委托宿主回调落盘并注册）。 */
  async importWorkflow(payload: ImportWorkflowPayload): Promise<unknown> {
    if (!this.opts.importWorkflow) throw new MediaError('UNKNOWN', '工作流导入未启用')
    const recipeId = await this.opts.importWorkflow(payload)
    return { recipeId }
  }

  /** 自动读取 ComfyUI 当前工作流（/history 已完成优先，兜底 /queue 运行中/排队），自动识别能力并导入。 */
  async autoImportComfy(payload: { name?: string }): Promise<unknown> {
    if (!this.opts.importWorkflow) throw new MediaError('UNKNOWN', '工作流导入未启用')
    const base = normalizeComfyBaseUrl(this.opts.comfyBaseUrl?.())
    let hist: unknown
    try {
      hist = await fetchJson(`${base}/history`, 8000)
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `无法连接 ComfyUI（${base}）：${String(err)}`, { retryable: true })
    }
    let queue: unknown = null
    try {
      queue = await fetchJson(`${base}/queue`, 8000)
    } catch {
      // /queue 不可用不阻断：history 已够用
    }
    const prompt = latestComfyPrompt(hist) ?? latestComfyQueuePrompt(queue)
    if (!prompt) {
      const histCount = hist && typeof hist === 'object' && !Array.isArray(hist) ? Object.keys(hist as object).length : 0
      const q = (queue ?? {}) as Record<string, unknown>
      const running = Array.isArray(q['queue_running']) ? (q['queue_running'] as unknown[]).length : -1
      const pending = Array.isArray(q['queue_pending']) ? (q['queue_pending'] as unknown[]).length : -1
      throw new MediaError(
        'OUTPUT_MISSING',
        `ComfyUI 没有可读取的最近工作流（/history ${histCount} 条、/queue 运行中 ${running}/排队 ${pending}）。请先在 ComfyUI 里运行一次目标工作流（运行中或已完成均可），再回来点击「自动读取」。`,
        { retryable: false },
      )
    }
    const json = JSON.stringify(prompt)
    const caps = detectCapabilities(json)
    const capability = caps.length > 0 ? caps : (['text-to-image'] as string[])
    const name = (payload.name ?? '').trim() || `comfy-${Date.now().toString(36)}`
    const recipeId = await this.opts.importWorkflow({
      name,
      capability,
      provider: 'comfy-local',
      workflowJson: json,
      setAsDefault: true,
    })
    return { recipeId, name, capability, source: 'comfy-local' }
  }

  /** 自动读取 RunningHub 工作流（按 workflowId 调 getJsonApiFormat），识别能力并导入。 */
  async autoImportRunningHub(payload: { workflowUrl: string; name?: string; region?: 'cn' | 'global' }): Promise<unknown> {
    if (!this.opts.importWorkflow) throw new MediaError('UNKNOWN', '工作流导入未启用')
    const workflowId = parseWorkflowId(payload.workflowUrl)
    if (!workflowId) {
      throw new MediaError(
        'INPUT_INVALID',
        '请输入 RunningHub 工作流链接（含 /workflow/<id>）或直接填写 workflowId',
        { retryable: false },
      )
    }
    const region = payload.region ?? 'cn'
    const key = this.opts.resolveProviderKey?.('runninghub', region)
    if (!key) {
      throw new MediaError('MODEL_MISSING', '请先在下方「模型服务」填写 RunningHub API Key', { retryable: false })
    }
    const base = (region === 'global' ? process.env.RUNNINGHUB_GLOBAL_BASE_URL ?? 'https://www.runninghub.ai' : process.env.RUNNINGHUB_BASE_URL ?? 'https://www.runninghub.cn').replace(/\/+$/, '')
    let json: Record<string, unknown>
    try {
      json = await fetchJson(`${base}/api/openapi/getJsonApiFormat`, 12000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ apiKey: key, workflowId }),
      })
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `读取 RunningHub 工作流失败：${String(err)}`, { retryable: true })
    }
    if (Number(json['code'] ?? -1) !== 0) {
      throw new MediaError('EXECUTION_FAILED', `RunningHub getJsonApiFormat 失败：${String(json['msg'] ?? JSON.stringify(json).slice(0, 200))}`, {
        retryable: false,
      })
    }
    const data = (json['data'] ?? {}) as Record<string, unknown>
    const promptRaw = data['prompt']
    let wf: unknown = promptRaw
    if (typeof promptRaw === 'string') {
      try {
        wf = JSON.parse(promptRaw)
      } catch {
        throw new MediaError('WORKFLOW_INVALID', 'RunningHub 返回的工作流 JSON 无法解析', { retryable: false })
      }
    }
    if (!wf || typeof wf !== 'object' || Array.isArray(wf)) {
      throw new MediaError('WORKFLOW_INVALID', 'RunningHub 返回的工作流不是 API 格式 JSON', { retryable: false })
    }
    const jsonText = JSON.stringify(wf)
    const caps = detectCapabilities(jsonText)
    const capability = caps.length > 0 ? caps : (['text-to-image'] as string[])
    const name = (payload.name ?? '').trim() || `runninghub-${workflowId.slice(-6)}`
    const recipeId = await this.opts.importWorkflow({
      name,
      capability,
      provider: 'runninghub',
      workflowJson: jsonText,
      region,
      setAsDefault: true,
    })
    return { recipeId, name, capability, source: 'runninghub' }
  }

  /** 手动添加 OpenRouter 模型（输入 API Key 后按模型名登记 recipe；经 models API 判定模态并自动解析参数）。 */
  async addOpenRouter(payload: { model: string; capability?: string }): Promise<unknown> {
    if (!this.opts.importWorkflow) throw new MediaError('UNKNOWN', '工作流导入未启用')
    const model = (payload.model ?? '').trim()
    if (!model) throw new MediaError('INPUT_INVALID', 'OpenRouter 需要填写模型名（如 google/gemini-2.5-flash-image）', { retryable: false })
    const key = this.opts.resolveProviderKey?.('openrouter')
    if (!key) throw new MediaError('MODEL_MISSING', '请先填写 OpenRouter API Key', { retryable: false })
    // 经 models API 判定模态（视频/音频/图像）；未收录或网络失败时降级为模型名启发式推断，
    // 任何模型都可添加（配合 openRouterAutoParams 生成可调参数），不阻断。
    let resolvedCap: string | undefined
    let resolvedName: string | undefined
    let resolvedModalities: string[] = []
    try {
      const resolved = (await this.resolveOpenRouterModel({ model })) as { capability?: string; name?: string; modalities?: string[] }
      resolvedCap = resolved.capability
      resolvedName = resolved.name
      resolvedModalities = Array.isArray(resolved.modalities) ? resolved.modalities : []
    } catch {
      resolvedCap = inferOpenRouterCapability(model)
    }
    const capability = [validCapability(payload.capability, resolvedCap ?? 'text-to-image')]
    const { inputs, exposedParams } = openRouterAutoParams(capability[0] as string)
    const name = resolvedName || (model.includes('/') ? (model.split('/').pop() ?? model) : model)
    const recipeId = await this.opts.importWorkflow({
      name,
      capability,
      provider: 'openrouter',
      model,
      nodeMapping: exposedParams.length > 0 ? { exposedParams } : undefined,
      inputs,
      setAsDefault: true,
    })
    return { recipeId, name: model, capability, source: 'openrouter', modalities: resolvedModalities }
  }

  /** 验证 RunningHub Key：调 accountStatus 返回余额/类型/运行任务数（rh check 等价物）。 */
  async verifyRunningHubKey(payload: { apiKey?: string; provider?: string; region?: 'cn' | 'global' }): Promise<unknown> {
    const region = payload.region ?? (payload.provider === 'runninghub-global' ? 'global' : 'cn')
    const scope = payload.provider === 'runninghub-enterprise' ? 'enterprise' : 'consumer'
    const key = (payload.apiKey ?? '').trim() || this.opts.resolveProviderKey?.(scope === 'enterprise' ? 'runninghub-enterprise' : 'runninghub', region) || ''
    if (!key) {
      return { valid: false, message: '请先填写 RunningHub API Key' }
    }
    let json: Record<string, unknown>
    try {
      const base = region === 'global' ? 'https://www.runninghub.ai' : 'https://www.runninghub.cn'
      json = await fetchJson(`${base}/uc/openapi/accountStatus`, 10000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ apikey: key }),
      })
    } catch (e) {
      return { valid: false, message: `验证请求失败：${e instanceof Error ? e.message : String(e)}` }
    }
    if (json['code'] !== 0) {
      return { valid: false, message: `Key 无效或已过期：${String(json['msg'] ?? '未知错误')}` }
    }
    const data = (json['data'] ?? {}) as Record<string, unknown>
    const apiType = String(data['apiType'] ?? '')
    return {
      valid: true,
      apiType,
      apiTypeLabel: rhApiTypeLabel(apiType),
      balance: String(data['remainMoney'] ?? '0'),
      currency: String(data['currency'] ?? 'CNY'),
      runningTasks: String(data['currentTaskCounts'] ?? '0'),
    }
  }

  /** OpenRouter 模型识别：图像/音频查 models，视频优先查专用 videos/models。 */
  async resolveOpenRouterModel(payload: { model: string }): Promise<unknown> {
    const model = (payload.model ?? '').trim()
    if (!model) throw new MediaError('INPUT_INVALID', '请输入 OpenRouter 模型名', { retryable: false })
    let json: Record<string, unknown>
    try {
      json = await fetchJson('https://openrouter.ai/api/v1/models', 10000)
    } catch (e) {
      throw new MediaError('EXECUTION_FAILED', `无法访问 OpenRouter 模型列表：${e instanceof Error ? e.message : String(e)}`, { retryable: true })
    }
    const list = Array.isArray(json['data']) ? (json['data'] as Array<Record<string, unknown>>) : []
    const found = list.find((m) => String(m['id'] ?? '') === model)
    if (!found) {
      try {
        const videoJson = await fetchJson('https://openrouter.ai/api/v1/videos/models', 10000)
        const videoList = Array.isArray(videoJson['data']) ? (videoJson['data'] as Array<Record<string, unknown>>) : []
        const videoFound = videoList.find((m) => String(m['id'] ?? m['canonical_slug'] ?? '') === model)
        if (videoFound) {
          return { model, name: String(videoFound['name'] ?? model), capability: 'text-to-video', modalities: ['video'] }
        }
      } catch {
        // 使用统一的“未收录模型”错误，隐藏目录短暂不可用的细节。
      }
      throw new MediaError('INPUT_INVALID', `OpenRouter 未收录模型 ${model}，请检查模型名（如 google/gemini-2.5-flash-image）`, { retryable: false })
    }
    const arch = (found['architecture'] ?? {}) as Record<string, unknown>
    const mods = Array.isArray(arch['output_modalities']) ? arch['output_modalities'].map(String) : []
    if (mods.includes('video')) {
      return { model, name: String(found['name'] ?? model), capability: 'text-to-video', modalities: mods }
    }
    if (mods.includes('audio')) {
      return { model, name: String(found['name'] ?? model), capability: 'text-to-audio', modalities: mods }
    }
    if (mods.includes('image')) {
      return { model, name: String(found['name'] ?? model), capability: 'text-to-image', modalities: mods }
    }
    // 某些视频模型只出现在专用目录，或普通 models 响应未带 architecture.output_modalities。
    let videoJson: Record<string, unknown> = {}
    try {
      videoJson = await fetchJson('https://openrouter.ai/api/v1/videos/models', 10000)
    } catch {
      // 保留下面基于普通 models 的明确错误，避免目录短暂不可用时掩盖真实模型信息。
    }
    const videoList = Array.isArray(videoJson['data']) ? (videoJson['data'] as Array<Record<string, unknown>>) : []
    const videoFound = videoList.find((m) => String(m['id'] ?? m['canonical_slug'] ?? '') === model)
    if (videoFound) {
      return { model, name: String(videoFound['name'] ?? found['name'] ?? model), capability: 'text-to-video', modalities: ['video'] }
    }
    throw new MediaError('INPUT_INVALID', `模型 ${model} 输出模态为 [${mods.join(', ')}]，不含图像/音频，暂不支持作为媒体生成模型`, { retryable: false })
  }
  /** 导入 RunningHub 应用（appUrl/appId + 输入节点映射，执行走 createTaskById）。 */
  async addRunningHubApp(payload: { appUrl: string; name?: string; nodeId?: string; capability?: string; region?: 'cn' | 'global' }): Promise<unknown> {
    if (!this.opts.importWorkflow) throw new MediaError('UNKNOWN', '工作流导入未启用')
    const appId = parseAppId(payload.appUrl)
    if (!appId) {
      throw new MediaError('INPUT_INVALID', '请输入 RunningHub 应用链接（含 /app/<id> 或 /ai-detail/<id>）或直接填写应用 ID', { retryable: false })
    }
    const region = payload.region ?? 'cn'
    const key = this.opts.resolveProviderKey?.('runninghub', region)
    if (!key) throw new MediaError('MODEL_MISSING', '请先在下方「模型服务」填写 RunningHub API Key', { retryable: false })

    const base = region === 'global' ? 'https://www.runninghub.ai' : 'https://www.runninghub.cn'
    let autoName: string | undefined
    let autoMapping: WorkflowNodeMapping | undefined
    let autoCap: string | undefined
    try {
      const demoRes = await fetchJson(`${base}/api/webapp/apiCallDemo?apiKey=${encodeURIComponent(key)}&webappId=${encodeURIComponent(appId)}`, 6000)
      if (demoRes && typeof demoRes === 'object' && (demoRes as Record<string, unknown>)['code'] === 0 && (demoRes as Record<string, unknown>)['data']) {
        const d = (demoRes as Record<string, unknown>)['data'] as Record<string, unknown>
        if (typeof d['webappName'] === 'string' && d['webappName'].trim()) autoName = d['webappName'].trim()
        if (Array.isArray(d['nodeInfoList']) && d['nodeInfoList'].length > 0) {
          // 全字段自动映射：资产/提示词进槽位，数值/枚举参数进 params + exposedParams（芯片条可调）
          // webappName 作为能力推断的语义提示（如「视频放大」→ video-upscale，nodeInfoList 的 description 常为空泛）
          const built = buildAppAutoMapping(d['nodeInfoList'], typeof d['webappName'] === 'string' ? d['webappName'] : undefined)
          if (Object.keys(built.mapping).length > 0) autoMapping = built.mapping
          autoCap = built.capability
        }
      }
    } catch {
      // 容错降级
    }

    const capability = validCapability(payload.capability, autoCap ?? 'text-to-image')
    const nodeId = (payload.nodeId ?? '').trim() || '39'
    const name = (payload.name ?? '').trim() || autoName || `rh-app-${appId.slice(-6)}`
    const nodeMapping = autoMapping ?? buildAppNodeMapping(capability, nodeId)
    const recipeId = await this.opts.importWorkflow({
      name,
      capability: [capability],
      provider: 'runninghub',
      appId,
      region,
      nodeMapping,
      setAsDefault: true,
    })
    return { recipeId, name, capability: [capability], source: 'runninghub-app' }
  }

  /** 导入 RunningHub 标准模型端点（执行走 /openapi/v2/{endpoint}）。 */
  async addRunningHubEndpoint(payload: { endpoint: string; name?: string; capability?: string; region?: 'cn' | 'global' }): Promise<unknown> {
    if (!this.opts.importWorkflow) throw new MediaError('UNKNOWN', '工作流导入未启用')
    const endpoint = (payload.endpoint ?? '').trim().replace(/^\/+/, '')
    if (!endpoint || !/^[\w-]+(\/[\w-]+)?$/.test(endpoint)) {
      throw new MediaError('INPUT_INVALID', '请填写 RunningHub 模型端点（如 image-to-video）', { retryable: false })
    }
    const region = payload.region ?? 'cn'
    const epKey = this.opts.resolveProviderKey?.('runninghub-enterprise', region)
    if (!epKey) {
      throw new MediaError('MODEL_MISSING', '模型 API 仅支持企业级-共享 Key，请先在下方「模型服务」填写 RunningHub 企业级 API Key', {
        retryable: false,
      })
    }
    const capability = validCapability(payload.capability, endpointCapability(endpoint))
    const name = (payload.name ?? '').trim() || `rh-${endpoint.replace(/\//g, '-')}`
    // 官方目录解析端点参数 → inputs schema + 暴露参数（GitHub 不可达时降级为空，不阻断导入）
    let nodeMapping: WorkflowNodeMapping | undefined
    let inputs: Recipe['inputs'] | undefined
    try {
      const raw = await fetchJson(RH_CATALOG_URL, 15000)
      const list = Array.isArray(raw['endpoints']) ? (raw['endpoints'] as Array<Record<string, unknown>>) : []
      const found = list.find((e) => String(e['endpoint'] ?? '') === endpoint)
      if (found && Array.isArray(found['params'])) {
        const mapped = mapRhCatalogParams(found['params'])
        inputs = mapped.inputs
        if (mapped.exposedParams.length > 0) nodeMapping = { exposedParams: mapped.exposedParams }
      }
    } catch {
      // 容错降级：目录不可达时保持现状（prompt/资产字段照旧，参数不暴露）
    }
    const recipeId = await this.opts.importWorkflow({
      name,
      capability: [capability],
      provider: 'runninghub',
      endpoint,
      region,
      nodeMapping,
      inputs,
      setAsDefault: true,
    })
    return { recipeId, name, capability: [capability], source: 'runninghub-endpoint' }
  }

  /** 拉取 RunningHub 官方端点目录最新快照；区域随请求保存，切换版本不会复用另一版本的缓存。 */
  async refreshRhCatalog(payload: { region?: 'cn' | 'global' } = {}): Promise<unknown> {
    const region = payload.region ?? 'cn'
    let raw: Record<string, unknown>
    try {
      raw = await fetchJson(RH_CATALOG_URL, 15000)
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `无法拉取 RunningHub 端点目录（GitHub）：${String(err)}`, { retryable: true })
    }
    const catalog = mapRhEndpoints(raw)
    if (catalog.count === 0) {
      throw new MediaError('OUTPUT_MISSING', '拉取的端点目录为空，已保留本地目录', { retryable: false })
    }
    try {
      const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data')
      await mkdir(dataDir, { recursive: true })
      await writeFile(join(dataDir, `rh-endpoints-${region}.json`), JSON.stringify({ ...catalog, region }), 'utf8')
    } catch {
      // 落盘失败不阻断：目录仍返回给前端（本次会话可用）
    }
    return { ...catalog, region }
  }
}

function basenameOf(p: string): string | null {
  if (!p) return null
  const norm = p.replaceAll('\\', '/')
  const base = norm.split('/').pop() ?? ''
  return base.endsWith('.json') ? base : null
}

/** 归一化 ComfyUI 服务地址：补 scheme、去尾斜杠。 */
function normalizeComfyBaseUrl(raw?: string): string {
  const s = (raw ?? process.env.COMFYUI_URL ?? process.env.COMFYUI_HOST ?? 'http://127.0.0.1:8188').trim()
  const withScheme = /^https?:\/\//i.test(s) ? s : `http://${s}`
  return withScheme.replace(/\/+$/, '')
}

/** 带超时的 JSON fetch（非 2xx 抛错）。 */
async function fetchJson(url: string, timeoutMs: number, init?: RequestInit): Promise<Record<string, unknown>> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json().catch(() => ({}))) as Record<string, unknown>
  } finally {
    clearTimeout(timer)
  }
}

/** 从 ComfyUI /history 里取最近一次成功运行的 prompt（API 格式 workflow）。 */
export function latestComfyPrompt(history: unknown): Record<string, unknown> | null {
  if (!history || typeof history !== 'object' || Array.isArray(history)) return null
  const entries = Object.entries(history as Record<string, unknown>)
  // Python dict 保持插入序 → 最后一条即最近一次
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (!entry) continue
    const value = entry[1]
    if (!value || typeof value !== 'object') continue
    const prompt = extractComfyPrompt((value as Record<string, unknown>)['prompt'])
    if (prompt) return prompt
  }
  return null
}

/**
 * history 条目的 prompt 兼容两种格式：
 * - 旧版：直接是 API 格式工作流 { nodeId: { class_type, inputs } }
 * - 新版：5 元素数组 [序号, promptId, workflow, extraData, outputs]，工作流在元素扫描中识别
 */
function extractComfyPrompt(prompt: unknown): Record<string, unknown> | null {
  if (Array.isArray(prompt)) {
    for (const el of prompt) {
      const found = extractComfyPrompt(el)
      if (found) return found
    }
    return null
  }
  if (!prompt || typeof prompt !== 'object') return null
  const nodes = prompt as Record<string, unknown>
  for (const v of Object.values(nodes)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as Record<string, unknown>)['class_type'] === 'string') {
      return nodes
    }
  }
  return null
}

/** 从 ComfyUI /queue 里取正在运行/排队的 prompt（优先运行中队列首项）。 */
export function latestComfyQueuePrompt(queue: unknown): Record<string, unknown> | null {
  if (!queue || typeof queue !== 'object' || Array.isArray(queue)) return null
  const bag = queue as Record<string, unknown>
  const running = Array.isArray(bag['queue_running']) ? (bag['queue_running'] as unknown[]) : []
  const pending = Array.isArray(bag['queue_pending']) ? (bag['queue_pending'] as unknown[]) : []
  for (const item of [...running, ...pending]) {
    // 每项为 [序号, promptId, prompt, extraData, outputs]，prompt 即 API 格式工作流
    const prompt = Array.isArray(item) ? item[2] : item
    const found = extractComfyPrompt(prompt)
    if (found) return found
  }
  return null
}

/** 官方端点目录源（HM-RunningHub/OpenClaw_RH_Skills，Apache-2.0，可匿名拉取）。 */
export const RH_CATALOG_URL =
  'https://raw.githubusercontent.com/HM-RunningHub/OpenClaw_RH_Skills/main/runninghub/data/capabilities.json'

/** task → 能力映射（无法映射的 task 被过滤：文本理解/3D/视频编辑类等暂无对应能力路由）。 */
export const RH_TASK_CAP_MAP: Record<string, string> = {
  'text-to-image': 'text-to-image',
  'image-to-image': 'image-to-image',
  'image-upscale': 'image-to-image',
  'text-to-video': 'text-to-video',
  'image-to-video': 'image-to-video',
  'start-end-to-video': 'first-last-frame-video',
  'reference-to-video': 'multi-image-to-video',
  'multimodal-video': 'multi-image-to-video',
  'image-to-world': 'image-to-video',
  'multi-image-to-world': 'multi-image-to-video',
  'text-to-speech': 'text-to-audio',
  'music-generation': 'text-to-audio',
  'voice-clone': 'text-to-audio',
  'voice-design': 'text-to-audio',
  'audio-generation': 'text-to-audio',
  'lyrics-generation': 'text-to-audio',
  'song-extend': 'text-to-audio',
  'lip-sync-video': 'video-to-audio',
}

/** 官方 capabilities.json → 精简端点目录（过滤 [Deprecated] 与不可映射 task；音频类 output 统一为 audio）。 */
export function mapRhEndpoints(raw: unknown): {
  version: string
  count: number
  endpoints: Array<{ endpoint: string; name: string; task: string; output: string; cap: string; pop: number }>
} {
  const bag = (raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(bag['endpoints']) ? (bag['endpoints'] as unknown[]) : []
  const out: Array<{ endpoint: string; name: string; task: string; output: string; cap: string; pop: number }> = []
  for (const item of list) {
    const e = (item ?? {}) as Record<string, unknown>
    const endpoint = String(e['endpoint'] ?? '').trim()
    const task = String(e['task'] ?? '').trim()
    const cap = RH_TASK_CAP_MAP[task]
    if (!endpoint || endpoint.includes('[Deprecated]') || !cap) continue
    const isAudio = cap === 'text-to-audio' || cap === 'video-to-audio'
    out.push({
      endpoint,
      name: String(e['name_cn'] ?? e['name_en'] ?? endpoint),
      task,
      output: isAudio ? 'audio' : String(e['output_type'] ?? ''),
      cap,
      pop: Number(e['popularity'] ?? 99),
    })
  }
  out.sort((a, b) => a.pop - b.pop || a.endpoint.localeCompare(b.endpoint))
  return {
    version: String(bag['version'] ?? new Date().toISOString().slice(0, 10)),
    count: out.length,
    endpoints: out,
  }
}

/** 能力合法性：未知值回落 fallback（管理页下拉的兜底）。 */
function validCapability(raw: string | undefined, fallback: string): string {
  const s = (raw ?? '').trim()
  return CAPABILITY_LABELS[s] ? s : fallback
}

/**
 * 素材-能力匹配校验（纯函数）：返回错误消息或 null（通过）。
 * 只校验「明确不匹配/明确必需」的能力，不破坏 image-to-video 等宽松场景（工作流内置默认图可跑）：
 * - 仅收视频（video-upscale/video-to-audio）：带图片无视频 → 素材不匹配
 * - 图+视频（image-and-video-to-video）：缺任一 → 明确告知缺什么
 * - 仅收图片（image-upscale/remove-background/image-to-3d）：带视频无图片 → 素材不匹配
 */
export function requiredAssetCheck(capability: string, assets: { imageCount: number; videoCount: number }): string | null {
  const cap = String(capability ?? '').trim()
  const { imageCount, videoCount } = assets
  if (cap === 'video-upscale' || cap === 'video-to-audio') {
    if (videoCount === 0 && imageCount > 0) return '素材不匹配：当前工作流只接受视频输入，请移除图片素材'
    if (videoCount === 0) return '当前工作流需要输入视频素材：请通过「参考视频」按钮、把视频拖入输入框，或拖入后看到输入框上方的文件卡片再发送'
    return null
  }
  if (cap === 'image-and-video-to-video') {
    if (videoCount === 0 && imageCount === 0) return '当前工作流需要同时输入图片和视频素材（1 张人物图 + 1 段视频）'
    if (videoCount === 0) return '当前工作流还需要输入视频素材（仅有图片）：请通过「参考视频」按钮或把视频拖入输入框补充'
    if (imageCount === 0) return '当前工作流还需要输入图片素材（仅有视频），请在输入框添加图片'
    return null
  }
  if (cap === 'image-upscale' || cap === 'remove-background' || cap === 'image-to-3d') {
    if (imageCount === 0 && videoCount > 0) return '素材不匹配：当前工作流只接受图片输入，请移除视频并在输入框添加图片'
    if (imageCount === 0) return '当前工作流需要输入图片素材，请在输入框添加图片'
    return null
  }
  return null
}

/** 从 RunningHub 应用链接/ID 抠 appId（支持 /ai-detail/<id>、/app/<id>、/ai-app/<id>、/run/ai-app/<id> 或纯 ID，排除 /workflow/）。 */
export function parseAppId(input: string): string | null {
  const s = (input ?? '').trim()
  if (!s) return null
  if (/\/workflow\//i.test(s)) return null
  const urlMatch = s.match(/(?:\/ai-detail\/|\/app\/|\/ai-app\/|\/task\/|\/api\/)([0-9a-zA-Z_-]{6,64})/i)
  if (urlMatch && urlMatch[1]) return urlMatch[1]
  if (/^[0-9a-zA-Z_-]{6,64}$/.test(s)) return s
  return null
}

/** 端点名 → 能力推断（RunningHub v2 端点常用名与能力同名）。 */
export function endpointCapability(endpoint: string): string {
  const s = endpoint.toLowerCase()
  if (s.includes('image-to-video')) return 'image-to-video'
  if (s.includes('text-to-video')) return 'text-to-video'
  if (s.includes('image-to-image')) return 'image-to-image'
  if (s.includes('audio') || s.includes('music') || s.includes('tts')) return 'text-to-audio'
  return 'text-to-image'
}

/** 应用 nodeInfo 映射：prompt→text；图片输入能力再挂 image 槽（nodeId 来自表单，缺省 39）。 */
export function buildAppNodeMapping(capability: string, nodeId: string): WorkflowNodeMapping {
  const mapping: WorkflowNodeMapping = { prompt: { node: nodeId, field: 'text' } }
  if (['image-to-image', 'image-to-video', 'first-last-frame-video', 'multi-image-to-video'].includes(capability)) {
    mapping.images = [{ node: nodeId, field: 'image' }]
  }
  if (capability === 'image-and-video-to-video') {
    mapping.images = [{ node: nodeId, field: 'image' }]
    mapping.videos = [{ node: nodeId, field: 'video' }]
  }
  return mapping
}

/**
 * RunningHub apiCallDemo 的 SWITCH/LIST 枚举参数 fieldData 解析（纯函数）：
 * fieldData 形如 JSON 字符串 [{"name":"input2","index":2.0,"description":"放大4倍"},...]。
 * 返回 select 需要的 { options(显示 label), optionValues(提交值), default }；非枚举返回 null。
 */
export function parseRhSwitchOptions(fieldData: unknown, fieldValue: unknown): { options: string[]; optionValues: string[]; default?: string } | null {
  let arr: unknown = fieldData
  if (typeof fieldData === 'string') {
    try {
      arr = JSON.parse(fieldData)
    } catch {
      return null
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null
  const opts: Array<{ value: string; label: string }> = []
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const value = String(o['index'] ?? o['value'] ?? o['name'] ?? '')
    const label = String(o['description'] ?? o['descriptionCn'] ?? o['name'] ?? value)
    if (!value) continue
    opts.push({ value, label })
  }
  if (opts.length === 0) return null
  const fv = fieldValue === undefined || fieldValue === null ? undefined : String(fieldValue)
  const firstVal = opts[0]?.value ?? ''
  return {
    options: opts.map((o) => o.label),
    optionValues: opts.map((o) => o.value),
    // default 存提交值（index/name），前端 select 的 value 与之对齐；label 仅用于 options 显示
    default: fv !== undefined && opts.some((o) => o.value === fv) ? fv : firstVal,
  }
}

/**
 * RunningHub 应用 apiCallDemo nodeInfoList 全字段自动映射（纯函数）：
 * 资产/提示词字段进既有槽位；其余数值/枚举字段进 mapping.params + exposedParams
 * （buildNodeInfoList 会把 effective[field] 写进 nodeInfo，UI 芯片条读 exposedParams 渲染控件）。
 */
export function buildAppAutoMapping(nodeInfoList: unknown, nameHint?: string): { mapping: WorkflowNodeMapping; capability?: string } {
  const mapping: WorkflowNodeMapping = {}
  let autoCap: string | undefined
  let descAll = String(nameHint ?? '')
  for (const item of Array.isArray(nodeInfoList) ? nodeInfoList : []) {
    const e = (item ?? {}) as Record<string, unknown>
    const nid = String(e['nodeId'] ?? '').trim()
    const fn = String(e['fieldName'] ?? '').trim()
    if (!nid || !fn) continue
    // apiCallDemo 返回官方 fieldType（VIDEO/IMAGE/AUDIO/INT/FLOAT/STRING/BOOLEAN/SWITCH/LIST），
    // 优先于 fieldName 正则——fieldName 可能是通用占位符（如 "value"），必须靠 fieldType/description 区分。
    const ft = String(e['fieldType'] ?? '').trim().toUpperCase()
    // 语义描述（区分 fieldName 相同的参数，如 nodeId 85「生成秒数」 vs 88「分辨率」都叫 "value"）
    const desc = String(e['descriptionCn'] ?? e['description'] ?? '').trim()
    descAll += ' ' + desc + ' ' + fn
    // 1) 资产识别：fieldType 优先，兜底 fieldName 正则（向后兼容旧 apiCallDemo 无 fieldType 的情形）
    if (ft === 'VIDEO' || (ft === '' && /video/i.test(fn))) {
      mapping.videos = [...(mapping.videos ?? []), { node: nid, field: fn }]
      continue
    }
    if (ft === 'IMAGE' || (ft === '' && /image/i.test(fn))) {
      mapping.images = [...(mapping.images ?? []), { node: nid, field: fn }]
      continue
    }
    if (ft === 'AUDIO' || (ft === '' && (/^(audio|voice|speech)$/i.test(fn) || /(audio|voice|speech)[_-]?(url|file|path|upload|src|input|data)$/i.test(fn)))) {
      mapping.audios = [...(mapping.audios ?? []), { node: nid, field: fn }]
      continue
    }
    // 2) 提示词字段
    if (/prompt|text/i.test(fn)) {
      mapping.prompt = { node: nid, field: fn }
      continue
    }
    // 3) 数值/枚举参数：语义键派生（description 优先，区分 fieldName 相同的通用占位符）
    const label = (desc || fn).replace(/[（(].*$/, '').trim() || fn
    const hay = `${fn} ${desc}`
    const isDurationLike = /秒|second|duration/i.test(hay) && !/分辨率|resolution|rate|speed/i.test(hay)
    let paramKey = fn
    if (isDurationLike) {
      // 时长统一挂 duration 键——前端通用时长滑块 payload.duration → inputs.duration →
      // buildNodeInfoList 按 params['duration'] 写回原 fieldName 节点（否则 5s 到不了节点）
      paramKey = 'duration'
    } else if (/^(value|text|input|number|int|integer|float|string|str|param|parameter|setting|option|select)$/i.test(fn) && desc) {
      // fieldName 是通用占位符：靠 description 派生语义键（否则多个 "value" 互相覆盖）
      if (/分辨率|resolution|最长边/i.test(desc)) paramKey = 'resolution'
      else if (/秒|second|duration/i.test(desc)) paramKey = 'duration'
      else paramKey = label.replace(/[^\w\u4e00-\u9fa5]+/g, '_') || fn
    }
    // 键冲突兜底（fieldName 无语义且 description 派生结果与已有键重复时，加 nodeId 区分）
    if (mapping.params?.[paramKey]) paramKey = `${paramKey}-${nid}`
    mapping.params = { ...(mapping.params ?? {}), [paramKey]: { node: nid, field: fn } }
    // SWITCH/LIST 枚举参数：解析 fieldData 生成 select（optionValues 提交值，如超分「放大2倍/4倍」）
    const sw = (ft === 'SWITCH' || ft === 'LIST') ? parseRhSwitchOptions(e['fieldData'], e['fieldValue']) : null
    if (sw) {
      mapping.exposedParams = [
        ...(mapping.exposedParams ?? []),
        { id: `app-${paramKey}-${nid}`, label, nodeId: nid, field: paramKey, type: 'select', options: sw.options, optionValues: sw.optionValues, default: sw.default },
      ]
      continue
    }
    const raw = e['fieldValue']
    const strVal = raw === undefined || raw === null ? undefined : String(raw)
    const numeric = strVal !== undefined && strVal !== '' && /^-?\d+(\.\d+)?$/.test(strVal)
    mapping.exposedParams = [
      ...(mapping.exposedParams ?? []),
      {
        id: `app-${paramKey}-${nid}`,
        label,
        nodeId: nid,
        field: paramKey,
        type: numeric ? ('number' as const) : ('text' as const),
        default: numeric ? Number(strVal) : strVal,
      },
    ]
  }
  // 4) 能力推断（按资产组合 + 描述语义）：
  // 图+视频 → 图+视频生视频；仅视频 + 超分/放大语义 → 视频超分；仅视频 + 音频语义 → 视频配音；
  // 仅视频 → 图生视频（保守）；仅图 → 图片重绘；仅音频 → 文本配音。
  const hasV = Boolean(mapping.videos?.length)
  const hasI = Boolean(mapping.images?.length)
  const hasA = Boolean(mapping.audios?.length)
  if (hasI && hasV) autoCap = 'image-and-video-to-video'
  else if (hasV && /放大|超分|超清|增强|画质|upscale|enhance|super.?res/i.test(descAll)) autoCap = 'video-upscale'
  else if (hasV && /配音|音频|音轨|提取.*音|soundtrack|transcribe|audio/i.test(descAll)) autoCap = 'video-to-audio'
  else if (hasV) autoCap = 'image-to-video'
  else if (hasI) autoCap = 'image-to-image'
  else if (hasA) autoCap = 'text-to-audio'
  return { mapping, capability: autoCap }
}

/**
 * RunningHub 官方目录端点 params（capabilities.json）→ 输入 schema + 暴露参数（纯函数）：
 * LIST→select(options)+default、INT/FLOAT→number+default、STRING→text、BOOLEAN→select true/false；
 * IMAGE/VIDEO/AUDIO 只进 inputs schema（资产经 assetInputs 槽位对位 + uploadBinary 上传，不进 UI）。
 * prompt-like STRING 不进暴露参数（提示词经 prompt 别名注入，V2-42 约定）。
 */
export function mapRhCatalogParams(params: unknown): { inputs: Recipe['inputs']; exposedParams: ExposedParam[] } {
  const inputs: Recipe['inputs'] = [
    { name: 'prompt', type: 'string', required: true, description: '正向提示词' },
    { name: 'negative_prompt', type: 'string', required: false },
  ]
  const exposed: ExposedParam[] = []
  for (const item of Array.isArray(params) ? params : []) {
    const p = (item ?? {}) as Record<string, unknown>
    const key = String(p['key'] ?? '').trim()
    const type = String(p['type'] ?? '').toUpperCase()
    if (!key) continue
    const required = p['required'] === true
    const dv = p['default']
    if (type === 'IMAGE' || type === 'VIDEO' || type === 'AUDIO') {
      inputs.push({ name: key, type: type.toLowerCase() as 'image' | 'video' | 'audio', required })
      continue
    }
    const promptLike = /prompt|text/i.test(key) && !/negative/i.test(key)
    if (type === 'LIST') {
      const options = Array.isArray(p['options']) ? p['options'].map(String) : undefined
      inputs.push({ name: key, type: 'string', required, enum: options })
      if (!promptLike && options && options.length > 0) {
        exposed.push({ id: `rh-${key}`, label: key, nodeId: '', field: key, type: 'select', options, default: dv })
      }
    } else if (type === 'BOOLEAN') {
      inputs.push({ name: key, type: 'boolean', required })
      const def = dv === undefined || dv === null || dv === '' ? undefined : String(dv)
      exposed.push({ id: `rh-${key}`, label: key, nodeId: '', field: key, type: 'select', options: ['true', 'false'], default: def })
    } else if (type === 'INT' || type === 'FLOAT') {
      inputs.push({ name: key, type: 'number', required })
      const num = typeof dv === 'number' ? dv : dv !== undefined && dv !== null && dv !== '' && /^-?\d+(\.\d+)?$/.test(String(dv)) ? Number(dv) : undefined
      if (!promptLike) {
        exposed.push({ id: `rh-${key}`, label: key, nodeId: '', field: key, type: 'number', default: num })
      }
    } else {
      inputs.push({ name: key, type: 'string', required })
      if (!promptLike && typeof dv === 'string') {
        exposed.push({ id: `rh-${key}`, label: key, nodeId: '', field: key, type: 'text', default: dv })
      }
    }
  }
  return { inputs, exposedParams: exposed }
}

/**
 * OpenRouter 未收录模型的模态启发式推断（纯函数）：models API 查不到时兜底，不阻断添加。
 * 按模型名关键词推断能力，配合 openRouterAutoParams 生成可调参数。
 */
export function inferOpenRouterCapability(model: string): string {
  const m = String(model ?? '').toLowerCase()
  if (/tts|speech|voice|sonic|eleven|audio|whisper/i.test(m)) return 'text-to-audio'
  if (/music|melody|suno|udio|riffusion/i.test(m)) return 'text-to-music'
  if (/video|veo|kling|seedance|wan|hailuo|runway|pika|sora/i.test(m)) return 'text-to-video'
  if (/upscale|esrgan|super.?res|enhance/i.test(m)) return 'image-upscale'
  if (/image|flux|stable|sd\d|dall|imagen|seedream|photon|midjourney|playground/i.test(m)) return 'text-to-image'
  return 'text-to-image'
}

/**
 * OpenRouter 模型参数自动推导（纯函数，按模态）：models API 的 supported_parameters 是聊天参数，
 * 媒体生成参数为固定集合——视频 /videos API（aspect_ratio/duration/resolution）与音频 chat audio{voice,format}。
 */
export function openRouterAutoParams(capability: string): { inputs: Recipe['inputs']; exposedParams: ExposedParam[] } {
  const inputs: Recipe['inputs'] = [
    { name: 'prompt', type: 'string', required: true, description: '正向提示词' },
    { name: 'negative_prompt', type: 'string', required: false },
  ]
  const exposed: ExposedParam[] = []
  if (['image-to-image', 'image-to-video', 'first-last-frame-video', 'multi-image-to-video'].includes(capability)) {
    inputs.push({ name: 'image', type: 'image', required: true })
  }
  if (capability === 'image-and-video-to-video') {
    inputs.push({ name: 'image', type: 'image', required: true })
    inputs.push({ name: 'video', type: 'video', required: true })
  }
  if (capability === 'text-to-video') {
    exposed.push(
      { id: 'or-duration', label: '视频时长（秒）', nodeId: '', field: 'duration', type: 'slider', min: 1, max: 20, step: 1, default: 5 },
      { id: 'or-aspect-ratio', label: '画面比例', nodeId: '', field: 'aspect_ratio', type: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' },
      { id: 'or-resolution', label: '分辨率', nodeId: '', field: 'resolution', type: 'select', options: ['480p', '720p', '1080p'], default: '720p' },
    )
    inputs.push(
      { name: 'duration', type: 'number' },
      { name: 'aspect_ratio', type: 'string', enum: ['16:9', '9:16', '1:1'] },
      { name: 'resolution', type: 'string', enum: ['480p', '720p', '1080p'] },
    )
  }
  if (capability === 'text-to-audio') {
    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    exposed.push(
      { id: 'or-voice', label: '音色', nodeId: '', field: 'voice', type: 'select', options: voices, default: 'alloy' },
      { id: 'or-format', label: '音频格式', nodeId: '', field: 'format', type: 'select', options: ['wav', 'mp3'], default: 'wav' },
    )
    inputs.push(
      { name: 'voice', type: 'string', enum: voices },
      { name: 'format', type: 'string', enum: ['wav', 'mp3'] },
    )
  }
  return { inputs, exposedParams: exposed }
}
/** RunningHub apiType → 中文标签（消费级/企业级-共享/企业级-独占；未知值原样展示）。 */
export function rhApiTypeLabel(apiType: string): string {
  const s = apiType.toLowerCase()
  if (s.includes('exclusive') || s.includes('dedicated') || s.includes('独占')) return '企业级-独占'
  if (s.includes('shared') || s.includes('enterprise') || s.includes('企业') || s.includes('共享')) return '企业级-共享'
  if (s.includes('consumer') || s.includes('member') || s.includes('消费') || s.includes('会员')) return '消费级-会员'
  return apiType || '未知类型'
}
/** 从用户粘贴的 RunningHub 链接/ID 里抠出 workflowId。 */
function parseWorkflowId(input: string): string | null {
  const s = (input ?? '').trim()
  if (!s) return null
  if (/^\d{15,24}$/.test(s)) return s
  const m = s.match(/\/workflow\/(\d{15,24})/i)
  return m ? (m[1] ?? null) : null
}

/** step 错误字段 → 展示字符串（runner 写入的是 MediaError 或字符串）。 */
function errorMessageOf(err: unknown): string | null {
  if (err == null) return null
  if (typeof err === 'string') return err
  if (typeof err === 'object' && 'message' in (err as Record<string, unknown>)) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string') return m
  }
  return JSON.stringify(err)
}

/** 本地媒体文件 → data:URL（超限/读失败返回 null）。图片/音频/视频统一 mime 推导，供对话卡片内联预览播放。 */
async function inlineFileDataUrl(path: string, limit: number): Promise<string | null> {
  try {
    const st = await stat(path)
    if (!st.isFile() || st.size > limit) return null
    const buf = await readFile(path)
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    const mime =
      MIME_BY_EXT[ext] ??
      (ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
            ? 'image/gif'
            : 'image/png')
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/** 音频/视频常见扩展名 mime 表（图片走下方兜底推导）。 */
const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  opus: 'audio/ogg',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
}

/** 从 nodes(get KSampler) 返回里深挖 sampler_name/scheduler 的枚举表。 */
function extractEnums(res: unknown): { samplers: string[]; schedulers: string[] } {
  const samplers: string[] = []
  const schedulers: string[] = []
  const visit = (v: unknown, keyHint?: string): void => {
    if (Array.isArray(v)) {
      if ((keyHint === 'sampler_name' || keyHint === 'scheduler') && v.every((x) => typeof x === 'string')) {
        const target = keyHint === 'sampler_name' ? samplers : schedulers
        for (const x of v as string[]) if (!target.includes(x)) target.push(x)
      }
      return
    }
    if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) visit(child, k)
    }
  }
  visit(res)
  return { samplers, schedulers }
}

/** 自省并提取工作流节点中的输入属性及推荐暴露参数。 */
export function extractWorkflowNodes(rawJson: unknown): {
  nodes: Array<{
    id: string
    title: string
    classType: string
    inputs: Array<{
      field: string
      type: string
      value: unknown
      options?: string[]
      min?: number
      max?: number
      step?: number
    }>
  }>
  suggestedExposedParams: Array<{
    id: string
    label: string
    nodeId: string
    nodeTitle?: string
    field: string
    type: 'select' | 'slider' | 'number' | 'text'
    options?: string[]
    min?: number
    max?: number
    step?: number
    default?: unknown
  }>
} {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return { nodes: [], suggestedExposedParams: [] }
  }
  const wf = rawJson as Record<string, { class_type?: string; _meta?: { title?: string }; inputs?: Record<string, unknown> }>
  const nodes: Array<{
    id: string
    title: string
    classType: string
    inputs: Array<{
      field: string
      type: string
      value: unknown
      options?: string[]
      min?: number
      max?: number
      step?: number
    }>
  }> = []

  const suggested: Array<{
    id: string
    label: string
    nodeId: string
    nodeTitle?: string
    field: string
    type: 'select' | 'slider' | 'number' | 'text'
    options?: string[]
    min?: number
    max?: number
    step?: number
    default?: unknown
  }> = []

  for (const [nid, n] of Object.entries(wf)) {
    if (!n || typeof n !== 'object') continue
    const cls = String(n.class_type ?? '')
    const title = String(n._meta?.title ?? cls ?? `Node #${nid}`)
    const inputsList: Array<{
      field: string
      type: string
      value: unknown
      options?: string[]
      min?: number
      max?: number
      step?: number
    }> = []

    const inputs = n.inputs ?? {}
    for (const [k, v] of Object.entries(inputs)) {
      if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'number') {
        continue
      }
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        continue
      }
      let valType: string = typeof v
      let options: string[] | undefined
      let min: number | undefined
      let max: number | undefined
      let step: number | undefined

      if (k === 'aspect_ratio' || k.includes('aspect') || k.includes('ratio')) {
        valType = 'select'
        // 与已装 ComfyUI ResolutionSelector 合法枚举对齐（旧 '9:16 (Vertical)'/裸 '4:3' 会被 /prompt 拒绝）
        options = [
          '16:9 (Widescreen)',
          '1:1 (Square)',
          '9:16 (Portrait Widescreen)',
          '4:3 (Standard)',
          '3:4 (Portrait Standard)',
          '21:9 (Ultrawide)',
        ]
        if (typeof v === 'string' && !options.includes(v)) {
          options.unshift(v)
        }
      } else if (k === 'megapixels' || k.includes('megapixel')) {
        valType = 'slider'
        min = 0.2
        max = 2.0
        step = 0.1
      } else if (k === 'duration' || k.includes('duration')) {
        valType = 'slider'
        min = 1
        max = 15
        step = 1
      } else if (k === 'steps' || k.includes('steps')) {
        valType = 'number'
        min = 1
        max = 100
        step = 1
      } else if (k === 'cfg') {
        valType = 'number'
        min = 1
        max = 30
        step = 0.5
      }

      inputsList.push({
        field: k,
        type: valType,
        value: v,
        options,
        min,
        max,
        step,
      })

      if (
        (cls.includes('Resolution') || title.includes('分辨率') || cls.includes('Size')) &&
        (k === 'aspect_ratio' || k === 'megapixels' || k === 'width' || k === 'height')
      ) {
        const paramType: 'select' | 'slider' | 'number' | 'text' =
          valType === 'select' ? 'select' : valType === 'slider' ? 'slider' : valType === 'number' ? 'number' : 'text'
        suggested.push({
          id: `${nid}_${k}`,
          label: k === 'aspect_ratio' ? '画面比例' : k === 'megapixels' ? '像素大小' : k,
          nodeId: nid,
          nodeTitle: title,
          field: k,
          type: paramType,
          options,
          min,
          max,
          step,
          default: v,
        })
      }
      // 提示词类节点（Prompt/Text 类的 prompt/text 字段）不进暴露参数建议：
      // 提示词由 agent 润色后经 nodeMapping.prompt 自动注入，不作为用户可调参数。
    }

    if (inputsList.length > 0) {
      nodes.push({
        id: nid,
        title,
        classType: cls,
        inputs: inputsList,
      })
    }
  }

  return JSON.parse(JSON.stringify({ nodes, suggestedExposedParams: suggested }))
}

/** API 网关注册清单（client 端有镜像 CONTRIBUTION）。 */
export const MEDIA_SETTINGS_MANIFEST = {
  package: 'dsh-multimodal-runtime',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: 'dsh-multimodal-runtime#mediaSettings/overview',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'overview',
      invocation: { kind: 'direct' },
      parameters: [],
      result: codec('dsh-multimodal-runtime#OverviewResult', overviewResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/setEnabled',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'setEnabled',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#SetEnabledPayload', setEnabledPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#SetEnabledResult', setEnabledResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/setCapabilityDefault',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'setCapabilityDefault',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#SetDefaultPayload', setDefaultPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#SetDefaultResult', setDefaultResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/updateRecipe',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'updateRecipe',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#UpdatePayload', updatePayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#UpdateResult', updateResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/updateRecipeMeta',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'updateRecipeMeta',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#UpdateRecipeMetaPayload', updateRecipeMetaPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#UpdateRecipeMetaResult', updateRecipeMetaResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/deleteRecipe',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'deleteRecipe',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#DeleteRecipePayload', deleteRecipePayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#DeleteRecipeResult', deleteRecipeResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/listProviders',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'listProviders',
      invocation: { kind: 'direct' },
      parameters: [],
      result: codec('dsh-multimodal-runtime#ListProvidersResult', listProvidersResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/setProviderConfig',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'setProviderConfig',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#SetProviderConfigPayload', setProviderConfigPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#SetProviderConfigResult', setProviderConfigResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/importWorkflow',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'importWorkflow',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#ImportWorkflowPayloadW', importWorkflowPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#ImportWorkflowResult', importWorkflowResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/autoImportComfy',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'autoImportComfy',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AutoImportComfyPayload', autoImportComfyPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AutoImportResult', autoImportResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/autoImportRunningHub',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'autoImportRunningHub',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AutoImportRunningHubPayload', autoImportRunningHubPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AutoImportResult', autoImportResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/addOpenRouter',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'addOpenRouter',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AddOpenRouterPayload', addOpenRouterPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AutoImportResult', autoImportResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/verifyRunningHubKey',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'verifyRunningHubKey',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#VerifyRunningHubKeyPayload', verifyRunningHubKeyPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#VerifyRunningHubKeyResult', verifyRunningHubKeyResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/resolveOpenRouterModel',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'resolveOpenRouterModel',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#ResolveOpenRouterModelPayload', resolveOpenRouterModelPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#ResolveOpenRouterModelResult', resolveOpenRouterModelResultSchema),
    },    {
      id: 'dsh-multimodal-runtime#mediaSettings/addRunningHubApp',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'addRunningHubApp',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AddRunningHubAppPayload', addRunningHubAppPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AutoImportResult', autoImportResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/addRunningHubEndpoint',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'addRunningHubEndpoint',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AddRunningHubEndpointPayload', addRunningHubEndpointPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AutoImportResult', autoImportResultSchema),
    },    {
      id: 'dsh-multimodal-runtime#mediaSettings/refreshRhCatalog',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'refreshRhCatalog',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#RefreshRhCatalogPayload', refreshRhCatalogPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#RefreshRhCatalogResult', refreshRhCatalogResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/inspectWorkflowNodes',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'inspectWorkflowNodes',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#InspectWorkflowNodesPayload', inspectWorkflowNodesPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#InspectWorkflowNodesResult', inspectWorkflowNodesResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/quickCreateTask',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'quickCreateTask',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'sessionId', wire: 'sessionId', source: 'json', acceptsUndefined: true, codec: codec('dsh-multimodal-runtime#sessionId', z.string().optional()) },
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#QuickCreatePayloadW', quickCreatePayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#QuickCreateResultW', quickCreateResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/ingestMedia',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'ingestMedia',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'sessionId', wire: 'sessionId', source: 'json', acceptsUndefined: true, codec: codec('dsh-multimodal-runtime#sessionId', z.string().optional()) },
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#IngestMediaPayloadW', ingestMediaPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#IngestMediaResultW', ingestMediaResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/previewMedia',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'previewMedia',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'sessionId', wire: 'sessionId', source: 'json', acceptsUndefined: true, codec: codec('dsh-multimodal-runtime#sessionId', z.string().optional()) },
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#MediaTargetPayloadW', mediaTargetPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#PreviewMediaResultW', previewMediaResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/openMedia',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'openMedia',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'sessionId', wire: 'sessionId', source: 'json', acceptsUndefined: true, codec: codec('dsh-multimodal-runtime#sessionId', z.string().optional()) },
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#MediaTargetPayloadW', mediaTargetPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#OpenMediaResultW', openMediaResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/revealMedia',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'revealMedia',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'sessionId', wire: 'sessionId', source: 'json', acceptsUndefined: true, codec: codec('dsh-multimodal-runtime#sessionId', z.string().optional()) },
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#MediaTargetPayloadW', mediaTargetPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#RevealMediaResultW', revealMediaResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/setComposerSelection',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'setComposerSelection',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'sessionId', wire: 'sessionId', source: 'json', acceptsUndefined: true, codec: codec('dsh-multimodal-runtime#sessionId', z.string().optional()) },
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#ComposerSelectionPayloadW', composerSelectionPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#ComposerSelectionResultW', composerSelectionResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/taskSnapshot',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'taskSnapshot',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#TaskSnapshotPayloadW', taskSnapshotPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#TaskSnapshotResultW', taskSnapshotResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/assetData',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'assetData',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AssetPayloadW', assetPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AssetDataResultW', assetDataResultSchema),
    },
    {
      id: 'dsh-multimodal-runtime#mediaSettings/revealAsset',
      service: 'mediaSettings',
      namespace: 'mediaSettings',
      method: 'revealAsset',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'payload', wire: 'payload', source: 'json', codec: codec('dsh-multimodal-runtime#AssetPayloadRevealW', assetPayloadSchema) },
      ],
      result: codec('dsh-multimodal-runtime#AssetRevealResultW', assetRevealResultSchema),
    },
  ],
  model: { services: [], events: [], objects: [] },
}
