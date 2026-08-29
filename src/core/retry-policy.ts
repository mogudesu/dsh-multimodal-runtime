/**
 * PRD §21 - Retry Policy。
 * 默认 maxStepRetries: 2, maxTaskRetries: 4, maxConcurrentJobs: 2。
 * 禁止：失败 → 无限换 Prompt → 无限烧 GPU。
 */
import type { MediaErrorCode } from './errors.js'
import type { TaskStep } from './types.js'

export type RetryAction =
  | 'retry-same'
  | 'fallback-recipe'
  | 'fallback-provider'
  | 'skip-step'
  | 'ask-user'
  | 'abort'

export interface RetryDecision {
  action: RetryAction
  reason: string
}

export interface RetryPolicy {
  maxStepRetries: number
  maxTaskRetries: number
  maxConcurrentJobs: number
  decide(code: MediaErrorCode, attempts: number, step: TaskStep): RetryDecision
}

export function defaultRetryPolicy(): RetryPolicy {
  return {
    maxStepRetries: 2,
    maxTaskRetries: 4,
    maxConcurrentJobs: 2,
    decide: defaultDecide,
  }
}

/**
 * 默认决策表：
 * - 已重试满 → skip（可跳过步骤）或 ask-user（步骤是关键路径且不可跳过）
 * - OUT_OF_MEMORY：第一次 retry-same（executor 内部会切 low-memory variant），第二次 ask-user（PRD §39）
 * - USER_CANCELLED / INPUT_INVALID / WORKFLOW_INVALID：abort
 * - 其余：attempts <= 2 时 retry-same，否则 ask-user
 */
export function defaultDecide(code: MediaErrorCode, attempts: number, _step: TaskStep): RetryDecision {
  switch (code) {
    case 'USER_CANCELLED':
      return { action: 'abort', reason: '用户取消，不再重试' }
    case 'INPUT_INVALID':
    case 'WORKFLOW_INVALID':
    case 'MODEL_MISSING':
    case 'NODE_MISSING':
      return { action: 'ask-user', reason: `${code} 属于确定性失败，重试无法修复，需要人工决策` }
    case 'OUT_OF_MEMORY':
      if (attempts === 1) {
        return { action: 'retry-same', reason: '第一次 OOM：executor 应切换 Recipe 的 low-memory variant' }
      }
      return { action: 'ask-user', reason: '第二次 OOM：询问是否降低分辨率/帧数或改用其他 Provider' }
    case 'PROVIDER_OFFLINE':
      return { action: 'retry-same', reason: 'Provider 离线，短暂等待后重试' }
    default:
      if (attempts <= 2) {
        return { action: 'retry-same', reason: `第 ${attempts} 次重试` }
      }
      return { action: 'ask-user', reason: `重试 ${attempts} 次仍失败，需要人工决策` }
  }
}
