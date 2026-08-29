/**
 * PRD §13/§19/§20/§21 - 调度器。
 * 负责：按依赖推进、并发上限、失败重试、取消、部分失败。
 * 纯逻辑；真正的执行通过注入的 executor 完成。
 */
import type { MediaTask, TaskStep } from './types.js'
import { MediaError, toMediaError } from './errors.js'
import { readySteps } from './task-graph.js'
import type { RetryPolicy, RetryDecision } from './retry-policy.js'

export type StepExecutor = (step: TaskStep, task: MediaTask) => Promise<void>

export interface SchedulerOptions {
  maxConcurrentJobs?: number
  retryPolicy: RetryPolicy
  executor: StepExecutor
  onStepState?: (task: MediaTask, step: TaskStep) => void
  onTaskState?: (task: MediaTask) => void
  /** 中断信号：用户说"停止"时触发（PRD §36）。 */
  signal?: AbortSignal
  sleep?: (ms: number) => Promise<void>
}

export class Scheduler {
  private running = 0
  private cancelled = false
  private readonly maxConcurrentJobs: number
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly opts: SchedulerOptions) {
    this.maxConcurrentJobs = opts.maxConcurrentJobs ?? 2
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    opts.signal?.addEventListener('abort', () => {
      this.cancelled = true
    })
  }

  /** 阻塞式运行整个 DAG，直到完成/失败/取消。 */
  async run(task: MediaTask): Promise<MediaTask> {
    this.setTaskState(task, 'RUNNING')
    let totalRetries = 0
    try {
      // 外层循环：处理 RETRYING 阶段的整体重跑（PRD §20/§21）
      for (;;) {
        const outcome = await this.runOnce(task)
        if (outcome === 'done') {
          this.finish(task)
          return task
        }
        if (outcome === 'cancelled') {
          task.state = 'CANCELLED'
          this.opts.onTaskState?.(task)
          return task
        }
        // outcome === 'retry'
        totalRetries++
        if (totalRetries > this.opts.retryPolicy.maxTaskRetries) {
          task.state = 'PARTIAL'
          this.opts.onTaskState?.(task)
          return task
        }
        task.state = 'RETRYING'
        this.opts.onTaskState?.(task)
        await this.sleep(500)
      }
    } catch (err) {
      task.state = 'FAILED'
      this.opts.onTaskState?.(task)
      throw err
    }
  }

  private async runOnce(task: MediaTask): Promise<'done' | 'cancelled' | 'retry'> {
    this.cancelled = false
    for (;;) {
      if (this.cancelled) {
        this.cancelAll(task)
        return 'cancelled'
      }
      const ready = readySteps(task.steps)
      if (ready.length === 0) {
        const alive = task.steps.filter((s) => s.state !== 'SUCCEEDED' && s.state !== 'CANCELLED' && s.state !== 'SKIPPED')
        if (alive.length === 0) return task.steps.every((s) => s.state === 'SUCCEEDED') ? 'done' : 'retry'
        // 有 BLOCKED 但无 ready → 说明存在失败的上游
        const failed = task.steps.some((s) => s.state === 'FAILED')
        if (failed) return 'retry'
        await this.sleep(100)
        continue
      }

      // 并发窗口
      const batch = ready.slice(0, Math.max(0, this.maxConcurrentJobs - this.running))
      if (batch.length === 0) {
        await this.sleep(50)
        continue
      }

      await Promise.all(batch.map((step) => this.runStep(task, step)))
    }
  }

  private async runStep(task: MediaTask, step: TaskStep): Promise<void> {
    this.running++
    step.state = 'RUNNING'
    step.startedAt = new Date().toISOString()
    this.opts.onStepState?.(task, step)
    try {
      let decision: RetryDecision = { action: 'retry-same', reason: '首次执行' }
      let attempts = step.retries
      while (attempts <= this.opts.retryPolicy.maxStepRetries) {
        try {
          await this.opts.executor(step, task)
          step.state = 'SUCCEEDED'
          step.finishedAt = new Date().toISOString()
          step.error = undefined
          this.opts.onStepState?.(task, step)
          return
        } catch (err) {
          const me = toMediaError(err)
          step.error = { code: me.code, message: me.message, retryable: me.retryable }
          // 确定性/不可重试错误（INPUT_INVALID、USER_CANCELLED、WORKFLOW_INVALID 等）立即失败，不消耗重试
          if (!me.retryable) {
            step.state = 'FAILED'
            step.finishedAt = new Date().toISOString()
            this.opts.onStepState?.(task, step)
            return
          }
          attempts++
          step.retries = attempts
          decision = this.opts.retryPolicy.decide(me.code, attempts, step)
          this.opts.onStepState?.(task, step)
          if (decision.action === 'retry-same') {
            step.state = 'RUNNING'
            this.opts.onStepState?.(task, step)
            await this.sleep(300 * attempts)
            continue
          }
          if (decision.action === 'skip-step') {
            step.state = 'SKIPPED'
            this.opts.onStepState?.(task, step)
            return
          }
          // fallback-recipe / fallback-provider / ask-user / abort → 标记失败
          step.state = 'FAILED'
          this.opts.onStepState?.(task, step)
          return
        }
      }
      // 达到上限
      step.state = 'FAILED'
      step.error = { code: 'EXECUTION_FAILED', message: `重试 ${attempts} 次后仍失败`, retryable: true }
      this.opts.onStepState?.(task, step)
    } finally {
      this.running--
    }
  }

  private cancelAll(task: MediaTask): void {
    for (const s of task.steps) {
      if (s.state === 'RUNNING' || s.state === 'READY' || s.state === 'BLOCKED') {
        if (s.state === 'RUNNING') {
          s.state = 'CANCELLED'
          s.error = { code: 'USER_CANCELLED', message: '用户取消', retryable: false }
        } else {
          s.state = 'CANCELLED'
        }
        this.opts.onStepState?.(task, s)
      }
    }
  }

  private setTaskState(task: MediaTask, state: MediaTask['state']): void {
    task.state = state
    task.updatedAt = new Date().toISOString()
    this.opts.onTaskState?.(task)
  }

  private finish(task: MediaTask): void {
    const failed = task.steps.filter((s) => s.state === 'FAILED').length
    task.state = failed > 0 ? 'PARTIAL' : 'COMPLETED'
    task.updatedAt = new Date().toISOString()
    this.opts.onTaskState?.(task)
  }
}

export { MediaError }
