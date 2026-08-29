/**
 * PRD §16 - 来源追踪（Provenance）。
 * Prompt → Image A → Video A → Audio A 的关系必须可查询、可回滚、可分支。
 */
import type { MediaAsset, MediaTask, TaskStep } from './types.js'

/** 返回某资产的完整血缘链（从根到该资产）。 */
export function lineageOf(asset: MediaAsset, all: MediaAsset[]): MediaAsset[][] {
  const byId = new Map(all.map((a) => [a.id, a]))
  const chains: MediaAsset[][] = []
  const walk = (a: MediaAsset, chain: MediaAsset[]): void => {
    const parents = (a.parentAssets ?? []).map((id) => byId.get(id)).filter((x): x is MediaAsset => !!x)
    if (parents.length === 0) {
      chains.push([...chain, a])
      return
    }
    for (const p of parents) walk(p, [...chain, a])
  }
  walk(asset, [])
  return chains
}

/** 生成人类可读的来源描述："prompt → asset://image/xxx → asset://video/xxx"。 */
export function describeLineage(asset: MediaAsset, all: MediaAsset[]): string[] {
  return lineageOf(asset, all).map((chain) =>
    chain.map((a) => (a.prompt ? `prompt:${short(a.prompt)}` : a.id)).join(' → '),
  )
}

function short(s: string, n = 24): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

/** 从任务步骤重建资产关系表（PRD §50.9：展示父子关系）。 */
export function buildAssetGraph(steps: TaskStep[]): Array<{ step: string; asset: MediaAsset; parents: string[] }> {
  return steps
    .filter((s) => (s.outputs ?? []).length > 0)
    .flatMap((s) =>
      (s.outputs ?? []).map((a) => ({
        step: s.id,
        asset: a,
        parents: a.parentAssets ?? [],
      })),
    )
}

export function taskSummaryLineage(task: MediaTask): string[] {
  const all = task.steps.flatMap((s) => s.outputs ?? [])
  return all.flatMap((a) => describeLineage(a, all))
}
