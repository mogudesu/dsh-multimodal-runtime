/**
 * PRD §26 扩展 - 媒体管理设置（管理页持久化层）。
 *
 * 存放于 ~/.dsh/media-settings.json（机器级：ComfyUI/模型是机器级资源）。
 * 管理页（client 半区）通过 MediaSettingsGateway 改写这里；
 * 运行时（能力表 / 任务路由 / workflow 注入）按引用读取同一份内存对象，
 * 因此所有改动即时生效，无需重启。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { CapabilityRegistry, ExposedParam } from '../core/index.js'

export interface RecipeDefaults {
  /** 覆盖 CheckpointLoader 的 ckpt_name（文生图等）。 */
  model?: string
  width?: number
  height?: number
  steps?: number
  cfg?: number
  sampler?: string
  scheduler?: string
  duration?: number
  minDuration?: number
  maxDuration?: number
  params?: Record<string, unknown>
  exposedParams?: ExposedParam[]
}

export interface RecipeSettings {
  /** 停用后路由器不再选中该 recipe（缺省启用）。 */
  enabled?: boolean
  /** 覆盖 recipe 显示名（用户重命名）。 */
  name?: string
  /** 覆盖 recipe.workflow.path：workflows/ 目录内的文件名。 */
  workflowFile?: string
  /** 输入兜底值：step inputs 未给时注入 workflow。 */
  defaults?: RecipeDefaults
}

export interface ProviderSettings {
  /** 云端 Provider 停用后其能力不再注册。 */
  enabled?: boolean
  /** 兜底 API Key（优先用环境变量 RUNNINGHUB_API_KEY / OPENROUTER_API_KEY）。 */
  apiKey?: string
  /** RunningHub 企业级模型 API Key；与工作流/应用 Key 分开保存。 */
  enterpriseApiKey?: string
  /** OpenRouter 图像模型名。 */
  model?: string
}

export interface MediaSettingsData {
  version: 1
  recipes: Record<string, RecipeSettings>
  /** 能力类型 -> 首选 recipeId（路由最高优先级）。 */
  capabilityDefault: Record<string, string>
  /** 云端 Provider 配置（runninghub / openrouter），向后兼容：旧文件缺失时视为空。 */
  providers?: Record<string, ProviderSettings>
}

export const EMPTY_SETTINGS: MediaSettingsData = { version: 1, recipes: {}, capabilityDefault: {}, providers: {} }

export function recipeEnabled(settings: MediaSettingsData, recipeId: string | undefined): boolean {
  if (!recipeId) return true
  return settings.recipes[recipeId]?.enabled !== false
}

/** 把设置应用到能力表：available 标志反映 enabled 状态（路由与 media_capabilities 即时感知）。 */
export function applySettingsToCapabilities(
  settings: MediaSettingsData,
  capabilities: CapabilityRegistry,
): void {
  for (const cap of capabilities.list()) {
    if (!cap.recipeId) continue
    cap.available = recipeEnabled(settings, cap.recipeId)
  }
}

export class MediaSettingsStore {
  data: MediaSettingsData = EMPTY_SETTINGS

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<MediaSettingsData>
      this.data = {
        version: 1,
        recipes: typeof parsed.recipes === 'object' && parsed.recipes !== null ? parsed.recipes : {},
        capabilityDefault:
          typeof parsed.capabilityDefault === 'object' && parsed.capabilityDefault !== null
            ? parsed.capabilityDefault
            : {},
        providers:
          typeof parsed.providers === 'object' && parsed.providers !== null ? parsed.providers : {},
      }
    } catch {
      this.data = structuredClone(EMPTY_SETTINGS)
    }
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
  }

  mutate(fn: (data: MediaSettingsData) => void): void {
    fn(this.data)
  }
}
