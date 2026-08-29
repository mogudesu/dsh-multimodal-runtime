/**
 * PRD §38 - 统一错误分类。Agent 拿到结构化错误，而不是只有 stdout。
 */

export const MEDIA_ERROR_CODES = [
  'PROVIDER_OFFLINE',
  'WORKFLOW_INVALID',
  'MODEL_MISSING',
  'NODE_MISSING',
  'INPUT_INVALID',
  'OUT_OF_MEMORY',
  'EXECUTION_FAILED',
  'TIMEOUT',
  'OUTPUT_MISSING',
  'USER_CANCELLED',
  'UNKNOWN',
] as const

export type MediaErrorCode = (typeof MEDIA_ERROR_CODES)[number]

export class MediaError extends Error {
  readonly code: MediaErrorCode
  readonly retryable: boolean
  readonly details?: unknown

  constructor(code: MediaErrorCode, message: string, opts?: { retryable?: boolean; details?: unknown }) {
    super(message)
    this.name = 'MediaError'
    this.code = code
    this.retryable = opts?.retryable ?? defaultRetryable(code)
    this.details = opts?.details
  }

  toJSON() {
    return { code: this.code, message: this.message, retryable: this.retryable, details: this.details }
  }
}

export function defaultRetryable(code: MediaErrorCode): boolean {
  switch (code) {
    case 'PROVIDER_OFFLINE':
    case 'OUT_OF_MEMORY':
    case 'EXECUTION_FAILED':
    case 'TIMEOUT':
    case 'OUTPUT_MISSING':
      return true
    default:
      return false
  }
}

/** 把任意异常规范化为 MediaError（禁止静默失败，PRD §48-12）。 */
export function toMediaError(err: unknown): MediaError {
  if (err instanceof MediaError) return err
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('out of memory') || msg.includes('oom') || msg.includes('cuda') && msg.includes('memory')) {
      return new MediaError('OUT_OF_MEMORY', err.message, { retryable: true, details: { cause: err.name } })
    }
    if (msg.includes('timeout')) {
      return new MediaError('TIMEOUT', err.message, { retryable: true, details: { cause: err.name } })
    }
    if (msg.includes('cancel')) {
      return new MediaError('USER_CANCELLED', err.message, { retryable: false, details: { cause: err.name } })
    }
    return new MediaError('EXECUTION_FAILED', err.message, { retryable: true, details: { cause: err.name } })
  }
  return new MediaError('UNKNOWN', String(err), { retryable: false })
}
