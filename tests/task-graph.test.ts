import { describe, expect, it } from 'vitest'
import { validateGraph, readySteps, markStaleDownstream, summarizeTask } from '../src/core/task-graph.js'
import type { TaskStep } from '../src/core/types.js'

function step(id: string, dependsOn: string[] = [], state: TaskStep['state'] = 'BLOCKED'): TaskStep {
  return { id, capability: 'text-to-image', dependsOn, state, retries: 0, stale: false }
}

describe('validateGraph', () => {
  it('接受线性链', () => {
    const g = validateGraph([
      { id: 'img', capability: 'text-to-image' },
      { id: 'vid', capability: 'image-to-video', dependsOn: ['img'] },
    ])
    expect(g.ok).toBe(true)
    expect(g.order).toEqual(['img', 'vid'])
  })

  it('接受并行分支（PRD §13）', () => {
    const g = validateGraph([
      { id: 'hero', capability: 'text-to-image' },
      { id: 'boss', capability: 'text-to-image' },
      { id: 'video', capability: 'image-to-video', dependsOn: ['hero', 'boss'] },
      { id: 'audio', capability: 'video-to-audio', dependsOn: ['video'] },
    ])
    expect(g.ok).toBe(true)
    expect(g.order.indexOf('hero')).toBeLessThan(g.order.indexOf('video'))
    expect(g.order.indexOf('boss')).toBeLessThan(g.order.indexOf('video'))
    expect(g.order.indexOf('video')).toBeLessThan(g.order.indexOf('audio'))
  })

  it('拒绝缺失依赖', () => {
    const g = validateGraph([{ id: 'video', capability: 'image-to-video', dependsOn: ['nope'] }])
    expect(g.ok).toBe(false)
    expect(g.errors.join()).toContain('nope')
  })

  it('拒绝循环依赖', () => {
    const g = validateGraph([
      { id: 'a', capability: 'text-to-image', dependsOn: ['b'] },
      { id: 'b', capability: 'image-to-video', dependsOn: ['a'] },
    ])
    expect(g.ok).toBe(false)
    expect(g.errors.join()).toContain('循环依赖')
  })

  it('拒绝自依赖', () => {
    const g = validateGraph([{ id: 'a', capability: 'text-to-image', dependsOn: ['a'] }])
    expect(g.ok).toBe(false)
  })
})

describe('readySteps', () => {
  it('依赖全部成功后并行就绪', () => {
    const steps = [
      { ...step('hero'), state: 'SUCCEEDED' },
      { ...step('boss'), state: 'SUCCEEDED' },
      step('video', ['hero', 'boss']),
    ]
    expect(readySteps(steps).map((s) => s.id)).toEqual(['video'])
  })

  it('上游失败时下游不 ready', () => {
    const steps = [
      { ...step('img'), state: 'FAILED' },
      step('video', ['img']),
    ]
    expect(readySteps(steps)).toEqual([])
  })
})

describe('markStaleDownstream（PRD §37）', () => {
  it('上游变化 → 下游标 STALE 并回退 BLOCKED', () => {
    const steps = [
      { ...step('img', [], 'SUCCEEDED') },
      { ...step('video', ['img'], 'SUCCEEDED') },
      { ...step('audio', ['video'], 'SUCCEEDED') },
    ]
    const stale = markStaleDownstream(steps, ['img'])
    expect(stale).toEqual(['video', 'audio'])
    expect(steps[1]!.stale).toBe(true)
    expect(steps[2]!.stale).toBe(true)
    expect(steps[1]!.state).toBe('BLOCKED')
    expect(steps[2]!.state).toBe('BLOCKED')
    expect(steps[0]!.state).toBe('SUCCEEDED') // 上游本身保留
  })

  it('不误伤无关分支', () => {
    const steps = [
      { ...step('imgA', [], 'SUCCEEDED') },
      { ...step('imgB', [], 'SUCCEEDED') },
      { ...step('video', ['imgA', 'imgB'], 'SUCCEEDED') },
      { ...step('other', [], 'SUCCEEDED') },
    ]
    markStaleDownstream(steps, ['imgA'])
    expect(steps[3]!.stale).toBe(false)
  })
})

describe('summarizeTask', () => {
  it('汇总资产与来源链', () => {
    const steps: TaskStep[] = [
      {
        ...step('img', [], 'SUCCEEDED'),
        outputs: [{ id: 'asset://image/1', type: 'image', localPath: '/x/1.png', provider: 'comfy-local', parentAssets: [], createdAt: '' }],
        recipeId: 'txt2img-default',
      },
      {
        ...step('video', ['img'], 'SUCCEEDED'),
        capability: 'image-to-video',
        outputs: [{ id: 'asset://video/1', type: 'video', localPath: '/x/1.mp4', provider: 'comfy-local', parentAssets: ['asset://image/1'], createdAt: '' }],
        recipeId: 'wan-i2v-default',
      },
    ]
    const s = summarizeTask(steps)
    expect(s.assets).toHaveLength(2)
    expect(s.lineage[1]!.parents).toEqual(['asset://image/1'])
  })
})
