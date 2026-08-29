/**
 * Mogu Multimodal Runtime - 核心领域类型
 *
 * 纯 TS，零 DeepSeek Harness 依赖。对应 PRD：
 * §8  MediaCapability / §15 MediaAsset / §19 MediaExecution
 * §20 Task/Step 状态机 / §13-14 规划语义
 */

export type MediaType = 'image' | 'video' | 'audio' | '3d'

export type CapabilityType =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'first-last-frame-video'
  | 'multi-image-to-video'
  | 'image-and-video-to-video'
  | 'video-to-audio'
  | 'text-to-audio'
  | 'text-to-music'
  | 'image-upscale'
  | 'video-upscale'
  | 'remove-background'
  | 'image-to-3d'

/** 输入/输出的媒体形状。ComfyLocalProvider 会把它映射到 Workflow 的节点槽位。 */
export interface MediaInputSchema {
  name: string
  type: 'image' | 'video' | 'audio' | 'string' | 'number' | 'boolean'
  required?: boolean
  /** 枚举约束，如 duration: [5, 10] */
  enum?: Array<string | number>
  description?: string
}

export interface MediaOutputSchema {
  name: string
  type: MediaType
}

/** 显式 workflow 节点映射（用户自定义工作流导入时生成；优先于启发式注入）。 */
export interface MappingTarget {
  node: string
  field?: string
}

export interface ExposedParam {
  id: string
  label: string
  nodeId: string
  nodeTitle?: string
  field: string
  type: 'select' | 'slider' | 'number' | 'text'
  options?: string[]
  /** 与 options 一一对应的提交值（SWITCH/枚举参数：显示 label、提交 index/name）；缺省时提交值=options 本身。 */
  optionValues?: Array<string | number>
  min?: number
  max?: number
  step?: number
  default?: unknown
}

export interface WorkflowNodeMapping {
  prompt?: MappingTarget
  negativePrompt?: MappingTarget
  /** 按顺序绑定上游资产（槽位约定：image / image2 / image3 ...）。 */
  images?: MappingTarget[]
  audios?: MappingTarget[]
  videos?: MappingTarget[]
  params?: Record<string, MappingTarget>
  exposedParams?: ExposedParam[]
}
/** PRD §8 - 能力是 Agent 的思考对象，不是 CheckpointLoaderSimple。 */
export interface MediaCapability {
  id: string
  type: CapabilityType
  provider: string
  recipeId?: string
  inputs: MediaInputSchema[]
  outputs: MediaOutputSchema[]
  available: boolean
  constraints?: {
    maxWidth?: number
    maxHeight?: number
    durations?: number[]
    aspectRatios?: string[]
    requiredModels?: string[]
  }
}

/** PRD §15 - 统一资产。禁止 Agent 只记 "output00018.png"。 */
export interface MediaAsset {
  id: string
  type: MediaType
  localPath: string
  mimeType?: string
  width?: number
  height?: number
  duration?: number
  provider: string
  recipeId?: string
  executionId?: string
  prompt?: string
  seed?: number
  parentAssets: string[]
  createdAt: string
}

/** PRD §19 - 统一执行句柄；Comfy 侧为 prompt_id。 */
export type MediaExecutionState =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'fetching'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface MediaExecutionError {
  code?: string
  message: string
  retryable: boolean
}

export interface MediaExecution {
  id: string
  provider: string
  providerExecutionId: string
  taskId: string
  stepId: string
  state: MediaExecutionState
  progress?: number
  error?: MediaExecutionError
}

/** PRD §20 - Step 状态机。 */
export type StepState =
  | 'BLOCKED'
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELLED'

/** PRD §20 - Task 状态机（含异常路径 PARTIAL / RETRYING / CANCELLED）。 */
export type TaskState =
  | 'PLANNING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL'
  | 'RETRYING'
  | 'CANCELLED'

export interface TaskStep {
  id: string
  capability: CapabilityType
  dependsOn: string[]
  /** 规划期可空，运行时由 Capability Router 选定。 */
  recipeId?: string
  provider?: string
  inputs?: Record<string, unknown>
  outputs?: MediaAsset[]
  state: StepState
  error?: MediaExecutionError
  /** Provider 上报的执行进度（0-100，仅运行中有效）；供 taskSnapshot/前端进度展示，不参与状态机。 */
  progress?: number
  retries: number
  /** PRD §37 - 上游资产变化后下游必须标记 STALE。 */
  stale: boolean
  startedAt?: string
  finishedAt?: string
}

/** PRD §12 - 媒体任务 DAG。 */
export interface MediaTask {
  id: string
  goal: string
  steps: TaskStep[]
  state: TaskState
  createdAt: string
  updatedAt: string
  rootDir: string
}

/** PRD §10 - Recipe 健康状态。 */
export type RecipeHealthStatus = 'READY' | 'DEGRADED' | 'BROKEN'

export interface RecipeHealth {
  status: RecipeHealthStatus
  reasons: string[]
  checkedAt: string
}

/** PRD §9 - Recipe：已验证 Workflow 的封装，Agent 不再从零造图。 */
export interface Recipe {
  id: string
  name: string
  capability: CapabilityType[]
  provider: string
  workflow?: {
    path: string
  }
  inputs: MediaInputSchema[]
  outputs: MediaOutputSchema[]
  health: {
    validateOnStartup: boolean
  }
  /** 低显存变体：OOM 第一次重试时切换（PRD §39）。 */
  lowMemoryVariant?: string
  /** 云端模型端点（provider=runninghub 时走 /openapi/v2/{endpoint}，替代 workflow 文件）；
   *  provider=openrouter 时只需 model；provider=runninghub 应用模式用 appId。 */
  run?: {
    endpoint?: string
    model?: string
    appId?: string
    /** RunningHub 平台工作流模板 ID（当前 create 契约必填；裸 JSON 提交已被网关化，
     *  返回 code 404 NOT_FOUND。模板 ID 从 RH 工作流页导出/分享入口获取）。 */
    workflowId?: string
    /** RunningHub API 区域；旧 recipe 缺省按国内版兼容。 */
    region?: 'cn' | 'global'
  }
  /** 显式节点映射：设置后执行时优先于启发式输入注入。 */
  nodeMapping?: WorkflowNodeMapping
  constraints?: {
    maxWidth?: number
    maxHeight?: number
    durations?: number[]
    aspectRatios?: string[]
    requiredModels?: string[]
    requiredNodes?: string[]
  }
}

/** PRD §7 - 组件状态。 */
export type ComponentState = 'READY' | 'PARTIAL' | 'BROKEN' | 'NOT_INSTALLED' | 'OFFLINE'

export interface ComponentStatus {
  name: string
  state: ComponentState
  detail: string
  hint?: string
}

export interface SetupReport {
  components: ComponentStatus[]
  overall: ComponentState
  summary: Record<string, string | number>
  generatedAt: string
}
