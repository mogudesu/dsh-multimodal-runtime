/**
 * PRD §22/§23/§24 - Evaluator 抽象。
 * 生成能力 ≠ 理解能力。Comfy 能"生成"不代表纯文本 DeepSeek 能"看"。
 * 无 Analyzer 时，语义 QC 必须明确返回 unavailable（禁止假装检查过）。
 */
import type { MediaAsset, MediaType } from './types.js'

export interface EvaluationCriteria {
  /** 结构检查项 */
  checkExistence?: boolean
  checkDecodable?: boolean
  minSizeBytes?: number
  minDurationSec?: number
  /** 语义检查项（需要 Vision/Video/Audio Analyzer） */
  semantic?: string[]
}

export interface EvaluationResult {
  ok: boolean
  level: 'structural' | 'semantic'
  findings: Array<{ item: string; passed: boolean; detail: string }>
  /** 无语义分析器时必须为 'unavailable'（PRD §24）。 */
  semanticEvaluation: 'available' | 'unavailable'
  tool?: string
}

export interface MediaEvaluator {
  supports(type: MediaType): boolean
  evaluate(asset: MediaAsset, criteria: EvaluationCriteria): Promise<EvaluationResult>
}

/** 诚实哨兵：不存在的分析器就报 unavailable。 */
export const semanticUnavailable = (): EvaluationResult => ({
  ok: true,
  level: 'semantic',
  findings: [],
  semanticEvaluation: 'unavailable',
  tool: 'none',
})
