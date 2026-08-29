import { describe, expect, it, vi } from 'vitest'
import { Scheduler } from '../src/core/scheduler.js'
import { defaultRetryPolicy } from '../src/core/retry-policy.js'
import { MediaError } from '../src/core/errors.js'
import type { MediaTask, TaskStep } from '../src/core/types.js'

function makeTask(goal: string, stepDefs: Array<[string, TaskStep['capability'], string[]]>): MediaTask {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    goal,
    steps: stepDefs.map(([id, capability, dependsOn]) => ({
      id,
      capability,
      dependsOn,
      state: dependsOn.length > 0 ? 'BLOCKED' : 'READY',
      retries: 0,
      stale: false,
    })),
    state: 'PLANNING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rootDir: '',
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Scheduler', () => {
  it('按依赖顺序执行，无依赖可并行（PRD §13）', async () => {
    const order: string[] = []
    const task = makeTask('t', [
      ['img', 'text-to-image', []],
      ['video', 'image-to-video', ['img']],
      ['audio', 'video-to-audio', ['video']],
    ])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      executor: async (step) => {
        await sleep(10)
        order.push(step.id)
      },
    })
    await sched.run(task)
    expect(order).toEqual(['img', 'video', 'audio'])
    expect(task.state).toBe('COMPLETED')
    expect(task.steps.every((s) => s.state === 'SUCCEEDED')).toBe(true)
  })

  it('上游失败时下游不执行（Case 05）', async () => {
    const executed: string[] = []
    const task = makeTask('t', [
      ['img', 'text-to-image', []],
      ['video', 'image-to-video', ['img']],
    ])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      executor: async (step) => {
        executed.push(step.id)
        if (step.id === 'img') throw new MediaError('INPUT_INVALID', '模型崩溃', { retryable: false })
      },
    })
    await sched.run(task)
    expect(executed).toEqual(['img'])
    expect(task.steps.find((s) => s.id === 'video')!.state).toBe('BLOCKED')
    expect(task.state).toBe('PARTIAL')
  })

  it('可重试失败按步级重试上限执行（3 次：1+2）', async () => {
    let attempts = 0
    const task = makeTask('t', [['img', 'text-to-image', []]])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      executor: async () => {
        attempts++
        if (attempts < 3) throw new MediaError('EXECUTION_FAILED', '瞬态失败', { retryable: true })
      },
    })
    await sched.run(task)
    expect(attempts).toBe(3)
    expect(task.steps[0]!.state).toBe('SUCCEEDED')
  })

  it('步级重试有限（PRD §21：maxStepRetries=2）', async () => {
    let attempts = 0
    const task = makeTask('t', [['img', 'text-to-image', []]])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      executor: async () => {
        attempts++
        if (attempts < 3) throw new MediaError('TIMEOUT', '超时', { retryable: true })
      },
    })
    await sched.run(task)
    expect(attempts).toBe(3) // 初始 1 + 重试 2
    expect(task.steps[0]!.state).toBe('SUCCEEDED')
  })

  it('超过重试上限后失败且不无限重试', async () => {
    let attempts = 0
    const task = makeTask('t', [['img', 'text-to-image', []]])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      executor: async () => {
        attempts++
        throw new MediaError('EXECUTION_FAILED', '总是失败', { retryable: true })
      },
    })
    await sched.run(task)
    expect(attempts).toBeLessThanOrEqual(20) // 步 3 次 × 任务 4 轮 = 12 上限
    expect(task.steps[0]!.state).toBe('FAILED')
  })

  it('并发上限生效（maxConcurrentJobs=2）', async () => {
    let running = 0
    let peak = 0
    const task = makeTask('t', [
      ['a', 'text-to-image', []],
      ['b', 'text-to-image', []],
      ['c', 'text-to-image', []],
      ['d', 'text-to-image', []],
    ])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      maxConcurrentJobs: 2,
      executor: async () => {
        running++
        peak = Math.max(peak, running)
        await sleep(20)
        running--
      },
    })
    await sched.run(task)
    expect(peak).toBeLessThanOrEqual(2)
    expect(task.state).toBe('COMPLETED')
  })

  it('用户取消 → CANCELLED（Case 07 / PRD §36）', async () => {
    const ac = new AbortController()
    const task = makeTask('t', [
      ['a', 'text-to-image', []],
      ['b', 'text-to-image', ['a']],
    ])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      signal: ac.signal,
      executor: async (step) => {
        if (step.id === 'a') {
          ac.abort()
          await sleep(5)
        }
      },
    })
    await sched.run(task)
    expect(task.state).toBe('CANCELLED')
  })

  it('OOM 第一次重试、第二次 ask-user（PRD §39）', async () => {
    let attempts = 0
    const decisions: string[] = []
    const policy = defaultRetryPolicy()
    const orig = policy.decide
    policy.decide = (code, n, step) => {
      const d = orig(code, n, step)
      decisions.push(d.action)
      return d
    }
    const task = makeTask('t', [['img', 'text-to-image', []]])
    const sched = new Scheduler({
      retryPolicy: policy,
      executor: async () => {
        attempts++
        throw new MediaError('OUT_OF_MEMORY', 'CUDA out of memory', { retryable: true })
      },
    })
    await sched.run(task)
    expect(decisions[0]).toBe('retry-same')
    expect(decisions[1]).toBe('ask-user')
    expect(attempts).toBeLessThanOrEqual(3)
  })

  it('onStepState 通知顺序完整', async () => {
    const events: string[] = []
    const task = makeTask('t', [['a', 'text-to-image', []]])
    const sched = new Scheduler({
      retryPolicy: defaultRetryPolicy(),
      executor: async () => {},
      onStepState: (_t, s) => events.push(s.state),
    })
    await sched.run(task)
    expect(events[0]).toBe('RUNNING')
    expect(events.at(-1)).toBe('SUCCEEDED')
  })
})

// 让 vi 引用保持（vitest 环境标记）
void vi
