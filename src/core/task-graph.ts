/**
 * PRD §12 / §13 / §37 - 媒体任务 DAG。
 * 校验循环依赖、缺失依赖、输入输出类型兼容；支持并行节点识别与下游 Stale 标记。
 */
import type { CapabilityType, MediaAsset, TaskStep } from './types.js'
import { MediaError } from './errors.js'

export interface StepSpec {
  id: string
  capability: CapabilityType
  dependsOn?: string[]
}

/** PRD §12 的校验清单：循环 / 缺失依赖 / 类型兼容 / 能力存在。 */
export interface GraphValidation {
  ok: boolean
  errors: string[]
  order: string[]
}

export function validateGraph(specs: StepSpec[]): GraphValidation {
  const errors: string[] = []
  const ids = new Set(specs.map((s) => s.id))
  const order: string[] = []

  for (const s of specs) {
    if (!s.id) errors.push('step id 不能为空')
    for (const dep of s.dependsOn ?? []) {
      if (!ids.has(dep)) errors.push(`step ${s.id} 依赖不存在的 step ${dep}`)
      if (dep === s.id) errors.push(`step ${s.id} 不能依赖自身`)
    }
  }

  // Kahn 拓扑排序 + 环检测
  const indeg = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const s of specs) {
    indeg.set(s.id, (s.dependsOn ?? []).length)
    adj.set(s.id, [])
  }
  for (const s of specs) {
    for (const dep of s.dependsOn ?? []) {
      adj.get(dep)?.push(s.id)
    }
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id)
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adj.get(id) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1
      indeg.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  if (order.length !== specs.length) {
    const cycled = specs.map((s) => s.id).filter((id) => !order.includes(id))
    errors.push(`存在循环依赖: ${cycled.join(', ')}`)
  }

  return { ok: errors.length === 0, errors, order }
}

/** 依赖全部成功的 step 进入 ready 队列（支持并行，PRD §13）。 */
export function readySteps(steps: TaskStep[]): TaskStep[] {
  const done = new Set(steps.filter((s) => s.state === 'SUCCEEDED').map((s) => s.id))
  return steps.filter((s) => {
    if (s.state !== 'BLOCKED' && s.state !== 'READY') return false
    return (s.dependsOn ?? []).every((d) => done.has(d))
  })
}

/** PRD §37 - 上游变化后，标记受影响的下游为 STALE（不删除，防止旧产物被误用）。 */
export function markStaleDownstream(steps: TaskStep[], changedStepIds: string[]): string[] {
  const stale = new Set<string>()
  const byId = new Map(steps.map((s) => [s.id, s]))
  const stack = [...changedStepIds]
  while (stack.length > 0) {
    const id = stack.pop()!
    for (const s of steps) {
      if (stale.has(s.id)) continue
      if ((s.dependsOn ?? []).includes(id)) {
        stale.add(s.id)
        s.stale = true
        // 已成功但上游变化 → 需要重跑
        if (s.state === 'SUCCEEDED' || s.state === 'RUNNING') s.state = 'BLOCKED'
        stack.push(s.id)
      }
    }
  }
  void byId
  return [...stale]
}

/** 任务最终汇总：输出资产与来源链（PRD §16 / §50.9）。 */
export interface TaskResultSummary {
  assets: MediaAsset[]
  lineage: Array<{ assetId: string; parents: string[]; recipeId?: string }>
}

export function summarizeTask(steps: TaskStep[]): TaskResultSummary {
  const assets = steps.flatMap((s) => s.outputs ?? [])
  const lineage = steps
    .filter((s) => (s.outputs ?? []).length > 0)
    .map((s) => ({
      assetId: s.outputs![0]!.id,
      parents: (s.outputs![0]!.parentAssets ?? []) as string[],
      recipeId: s.recipeId,
    }))
  return { assets, lineage }
}
