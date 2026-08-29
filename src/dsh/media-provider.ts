/**
 * V2 - Provider 统一接口。ComfyLocalProvider / RunningHubProvider / OpenRouterProvider
 * 实现同一形状，TaskRunner 按 recipe.provider 路由（解除 V1 对单一 Provider 的硬编码）。
 */
import type { MediaAsset, MediaCapability, MediaExecution } from '../core/index.js'
import type { RecipeRegistry } from '../core/index.js'
import type { MediaExecutionHandle, MediaExecutionRequest, ProviderHealth } from './comfy-provider.js'

/** fetchOutputs 元数据（与 ComfyLocalProvider 现有 meta 形状一致）。 */
export interface FetchOutputsMeta {
  provider: string
  recipeId?: string
  prompt?: string
  parentAssets: string[]
}

export interface MediaProvider {
  readonly id: string
  healthCheck(): Promise<ProviderHealth>
  getCapabilities(recipes: RecipeRegistry): Promise<MediaCapability[]>
  execute(request: MediaExecutionRequest): Promise<MediaExecutionHandle>
  getStatus(providerExecutionId: string): Promise<MediaExecution>
  waitFor(providerExecutionId: string): Promise<MediaExecution>
  cancel(providerExecutionId: string): Promise<void>
  fetchOutputs(providerExecutionId: string, outDir: string, meta: FetchOutputsMeta): Promise<MediaAsset[]>
}

/** 从 URL 或声明的输出类型推断扩展名（下载落盘命名用）。 */
export function extFromUrlOrType(url: string, outputType?: string): string {
  const t = (outputType ?? '').replace(/^\./, '').toLowerCase()
  const mime = t.split(';', 1)[0] ?? ''
  const mimeExt: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  if (mimeExt[mime]) return mimeExt[mime]
  if (mime === 'audio') return 'mp3'
  if (mime === 'video') return 'mp4'
  if (mime === 'image') return 'png'
  if (t && /^[a-z0-9]{1,5}$/.test(t)) return t
  const clean = url.split(/[?#]/)[0] ?? url
  const m = clean.match(/\.([a-z0-9]{1,5})$/i)
  return (m?.[1] ?? 'png').toLowerCase()
}
