import { describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TaskStore } from '../src/dsh/task-store.js'
import { isInsufficientCredits, decorateInsufficient } from '../src/dsh/runninghub-provider.js'
import { buildAppAutoMapping } from '../src/dsh/settings-gateway.js'

describe('findActiveComposerTask 失败任务时间窗匹配', () => {
  it('10 分钟内 FAILED 的直调任务命中（LLM 兜底拿到失败详情而非新建任务）', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-fail-'))
    try {
      const store = new TaskStore(dir)
      await store.init()
      const t = store.create({
        goal: 'g',
        steps: [{ id: 'gen', capability: 'image-to-video', inputs: { prompt: '一只猫', __mmrComposer: true, duration: 5 } }],
      })
      t.state = 'FAILED'
      t.updatedAt = new Date().toISOString()
      const hit = store.findActiveComposerTask('一只猫', 'image-to-video')
      expect(hit?.id).toBe(t.id)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('超过 10 分钟的 FAILED 任务不命中（用户可重试相同 prompt）', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-fail-'))
    try {
      const store = new TaskStore(dir)
      await store.init()
      const t = store.create({
        goal: 'g',
        steps: [{ id: 'gen', capability: 'image-to-video', inputs: { prompt: '一只猫', __mmrComposer: true } }],
      })
      t.state = 'FAILED'
      t.updatedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString()
      expect(store.findActiveComposerTask('一只猫', 'image-to-video')).toBeUndefined()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('recipeId 不匹配的 FAILED 任务跳过；非直调任务跳过', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-fail-'))
    try {
      const store = new TaskStore(dir)
      await store.init()
      const a = store.create({
        goal: 'g',
        steps: [{ id: 'gen', capability: 'image-to-video', recipeId: 'rh-a', inputs: { prompt: '一只猫', __mmrComposer: true } }],
      })
      a.state = 'FAILED'
      a.updatedAt = new Date().toISOString()
      expect(store.findActiveComposerTask('一只猫', 'image-to-video', 'comfy-b')).toBeUndefined()
      expect(store.findActiveComposerTask('一只猫', 'image-to-video', 'rh-a')?.id).toBe(a.id)
      const b = store.create({
        goal: 'g',
        steps: [{ id: 'gen', capability: 'image-to-video', inputs: { prompt: '一只狗' } }],
      })
      b.state = 'FAILED'
      b.updatedAt = new Date().toISOString()
      expect(store.findActiveComposerTask('一只狗', 'image-to-video')).toBeUndefined()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('活跃任务优先于失败任务', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-fail-'))
    try {
      const store = new TaskStore(dir)
      await store.init()
      const running = store.create({
        goal: 'g',
        steps: [{ id: 'gen', capability: 'image-to-video', inputs: { prompt: '一只猫', __mmrComposer: true } }],
      })
      running.state = 'RUNNING'
      const failed = store.create({
        goal: 'g',
        steps: [{ id: 'gen', capability: 'image-to-video', inputs: { prompt: '一只猫', __mmrComposer: true } }],
      })
      failed.state = 'FAILED'
      failed.updatedAt = new Date().toISOString()
      expect(store.findActiveComposerTask('一只猫', 'image-to-video')?.id).toBe(running.id)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('积分不足语义判定（isInsufficientCredits / decorateInsufficient）', () => {
  it('code 433 与中英文消息识别', () => {
    expect(isInsufficientCredits(433)).toBe(true)
    expect(isInsufficientCredits(500)).toBe(false)
    expect(isInsufficientCredits('积分不足')).toBe(true)
    expect(isInsufficientCredits('余额不足，无法提交任务')).toBe(true)
    expect(isInsufficientCredits('insufficient credits')).toBe(true)
    expect(isInsufficientCredits('insufficient balance')).toBe(true)
    expect(isInsufficientCredits('not enough credit')).toBe(true)
    expect(isInsufficientCredits('RunningHub run 失败(code=433): xx')).toBe(true)
    expect(isInsufficientCredits('网络超时')).toBe(false)
  })

  it('decorateInsufficient 追加中文指引且不重复追加', () => {
    const out = decorateInsufficient('积分不足')
    expect(out).toContain('充值')
    expect(out).toContain('请勿改用其他工作流')
    // 已含指引的错误消息不再重复追加
    const twice = decorateInsufficient(out)
    expect(twice.match(/充值/g)?.length).toBe(1)
    expect(decorateInsufficient('网络超时')).toBe('网络超时')
  })
})

describe('buildAppAutoMapping duration 别名（5s 到达节点）', () => {
  it('时长类参数（秒数/seconds/duration）统一挂 duration 键', () => {
    const built = buildAppAutoMapping([
      { nodeId: '39', fieldName: 'text', fieldValue: '' },
      { nodeId: '85', fieldName: '秒数', fieldValue: '1' },
      { nodeId: '88', fieldName: '分辨率', fieldValue: '720p' },
    ])
    // '秒数' → params['duration']，field 也是 duration（前端 payload.duration → inputs.duration 命中）
    expect(built.mapping.params?.['duration']).toEqual({ node: '85', field: '秒数' })
    expect(built.mapping.exposedParams?.find((p) => p.field === 'duration')).toMatchObject({
      type: 'number',
      default: 1,
      nodeId: '85',
    })
    // 非 duration 类参数不受影响
    expect(built.mapping.params?.['分辨率']).toEqual({ node: '88', field: '分辨率' })
  })

  it('英文 seconds 同样命中；speech_rate 等带 rate 的不误判', () => {
    const built = buildAppAutoMapping([
      { nodeId: '85', fieldName: 'seconds', fieldValue: '10' },
      { nodeId: '90', fieldName: 'speech_rate', fieldValue: '1.0' },
    ])
    expect(built.mapping.params?.['duration']).toEqual({ node: '85', field: 'seconds' })
    expect(built.mapping.params?.['speech_rate']).toEqual({ node: '90', field: 'speech_rate' })
    expect(built.mapping.exposedParams?.find((p) => p.field === 'speech_rate')).toBeTruthy()
  })
})
