/**
 * PRD §8 / §25 - Capability Registry 与 Capability Router。
 * Agent 请求能力（image-to-video），Router 返回候选（Wan I2V / LTX I2V / ...）。
 */
import type { CapabilityType, MediaCapability } from './types.js'
import { MediaError } from './errors.js'

export class CapabilityRegistry {
  private caps = new Map<string, MediaCapability>()

  register(cap: MediaCapability): void {
    this.caps.set(cap.id, cap)
  }

  unregister(id: string): void {
    this.caps.delete(id)
  }

  get(id: string): MediaCapability | undefined {
    return this.caps.get(id)
  }

  list(): MediaCapability[] {
    return [...this.caps.values()]
  }

  byType(type: CapabilityType): MediaCapability[] {
    return this.list().filter((c) => c.type === type)
  }

  available(type: CapabilityType): MediaCapability[] {
    return this.byType(type).filter((c) => c.available)
  }

  /** 所有可用能力去重后的能力类型集合（Agent 的"我能做什么"）。 */
  supportedTypes(): CapabilityType[] {
    return [...new Set(this.list().filter((c) => c.available).map((c) => c.type))]
  }
}

/** PRD §25 - 规则路由（V1 不做 AI Benchmark）。 */
export interface RouteOptions {
  /** 用户显式指定的 recipe id，最高优先级。 */
  preferredRecipeId?: string
  /** Recipe 健康检查表：recipeId -> 是否 BROKEN。BROKEN 一律不可选（PRD §10）。 */
  health?: ReadonlyMap<string, 'READY' | 'DEGRADED' | 'BROKEN'>
  /** 显存上限（GB），用于约束。 */
  maxVramGb?: number
  /** 候选排序权重：provider 健康 > 模型齐全 > 速度。 */
}

export interface RouteResult {
  capabilityId: string
  recipeId: string
  provider: string
  reason: string
}

export class CapabilityRouter {
  constructor(private registry: CapabilityRegistry) {}

  /**
   * 请求一种能力，返回第一个可用且健康的候选。
   * 规则：用户指定 > 本地可运行（health 非 BROKEN）> 其他。
   */
  route(type: CapabilityType, opts: RouteOptions = {}): RouteResult {
    let candidates = this.registry.available(type)
    if (candidates.length === 0) {
      // 容错降级：生图/生视频同大类能力互为备选
      const fallbacks: Record<string, CapabilityType[]> = {
        'text-to-image': ['image-to-image'],
        'image-to-image': ['text-to-image'],
        'text-to-video': ['image-to-video', 'multi-image-to-video'],
        'image-to-video': ['multi-image-to-video', 'text-to-video'],
        'multi-image-to-video': ['image-to-video', 'text-to-video'],
      }
      for (const fb of fallbacks[type] ?? []) {
        const alt = this.registry.available(fb)
        if (alt.length > 0) {
          candidates = alt
          break
        }
      }
    }
    if (candidates.length === 0) {
      throw new MediaError('MODEL_MISSING', `当前没有任何可用的 ${type} 能力`, {
        retryable: false,
        details: { supported: this.registry.supportedTypes() },
      })
    }

    // 1. 用户指定
    if (opts.preferredRecipeId) {
      const pick = candidates.find((c) => c.recipeId === opts.preferredRecipeId)
      if (pick) return this.toResult(pick, '用户指定 Recipe')
    }

    // 2. 健康候选（排除 BROKEN）
    const healthy = candidates.filter((c) => {
      const h = opts.health?.get(c.recipeId ?? '')
      return h !== 'BROKEN'
    })
    const pool = healthy.length > 0 ? healthy : candidates

    // 3. 本地优先（PRD §26）：comfy-local 高于其他 Provider
    const local = pool.filter((c) => c.provider === 'comfy-local')
    const base = (local.length > 0 ? local : pool)[0]
    if (!base) {
      throw new MediaError('MODEL_MISSING', `没有可用的 ${type} 候选`, { retryable: false })
    }
    return this.toResult(base, healthy.length > 0 ? '本地可用且健康' : '全部候选不健康，退而求其次')
  }

  private toResult(cap: MediaCapability, reason: string): RouteResult {
    return {
      capabilityId: cap.id,
      recipeId: cap.recipeId ?? '',
      provider: cap.provider,
      reason,
    }
  }
}
