/**
 * PRD §17/§48-10 - 任务持久化存储。
 * .dsh-media/tasks/<task-id>/task.json + events.jsonl。
 */
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { MediaTask, TaskStep } from '../core/index.js'
import { MediaError } from '../core/index.js'

export interface StepSpecInput {
  id: string
  capability: TaskStep['capability']
  recipeId?: string
  dependsOn?: string[]
  inputs?: Record<string, unknown>
}

export class TaskStore {
  private tasks = new Map<string, MediaTask>()

  constructor(private readonly rootDir: string) {}

  get root() {
    return this.rootDir
  }

  taskDir(taskId: string): string {
    return join(this.rootDir, 'tasks', taskId)
  }

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true })
    await mkdir(join(this.rootDir, 'tasks'), { recursive: true })
    await mkdir(join(this.rootDir, 'assets'), { recursive: true })
    for (const sub of ['images', 'videos', 'audio', '3d']) {
      await mkdir(join(this.rootDir, 'assets', sub), { recursive: true })
    }
  }

  create(spec: { goal: string; steps: StepSpecInput[] }): MediaTask {
    const id = randomUUID()
    const now = new Date().toISOString()
    const task: MediaTask = {
      id,
      goal: spec.goal,
      steps: spec.steps.map((s) => ({
        id: s.id,
        capability: s.capability,
        recipeId: s.recipeId,
        dependsOn: s.dependsOn ?? [],
        inputs: s.inputs,
        state: (s.dependsOn?.length ?? 0) > 0 ? 'BLOCKED' : 'READY',
        retries: 0,
        stale: false,
      })),
      state: 'PLANNING',
      createdAt: now,
      updatedAt: now,
      rootDir: this.taskDir(id),
    }
    this.tasks.set(id, task)
    void this.persist(task)
    return task
  }

  get(id: string): MediaTask | undefined {
    return this.tasks.get(id)
  }

  /**
   * 活跃的输入框直调任务（紧凑视图，供 media_capabilities 暴露给 LLM）：任务由芯片
   * 直调创建后消息原文不动，LLM 由此感知「任务已存在」，用 capability/recipeId 调
   * media_create_task 去重命中，而不是把用户请求当新需求反问或另建任务。
   */
  activeComposerTasks(): Array<{
    taskId: string
    goal: string
    state: string
    capability: string
    recipeId: string | null
    prompt: string
    createdAt: string | undefined
  }> {
    const out: Array<{
      taskId: string
      goal: string
      state: string
      capability: string
      recipeId: string | null
      prompt: string
      createdAt: string | undefined
    }> = []
    const doneCutoff = Date.now() - 2 * 60 * 1000
    for (const task of this.tasks.values()) {
      const active = ['PLANNING', 'READY', 'RUNNING', 'WAITING', 'RETRYING'].includes(task.state)
      let freshDone = false
      if (!active && task.state === 'COMPLETED') {
        const ts = Date.parse(task.updatedAt ?? '')
        freshDone = Number.isFinite(ts) && ts >= doneCutoff
      }
      if (!active && !freshDone) continue
      const step = task.steps[0]
      if (!step || step.inputs?.['__mmrComposer'] !== true) continue
      out.push({
        taskId: task.id,
        goal: task.goal,
        state: task.state,
        capability: step.capability,
        recipeId: step.recipeId ?? null,
        prompt: String(step.inputs?.['prompt'] ?? ''),
        createdAt: task.createdAt,
      })
    }
    return out
  }

  /**
   * 输入框直调已经创建任务后，LLM 仍可能根据同一条用户消息再次调用 media_create_task。
   * 只对短生命周期内带有内部标记的直调任务去重，避免影响用户正常创建的同文任务。
   */
  findActiveComposerTask(prompt: string, capability: string, recipeId?: string): MediaTask | undefined {
    const normalized = prompt.trim()
    // 刚完成的直调任务（2 分钟内）同样参与去重：快任务（如短视频超分）常在 LLM 回合
    // 开始前就跑完，若不兜住，LLM 会去重落空并新建一个无素材任务在云端白跑（实测踩坑）。
    // 宽限期很短：用户稍后想重新生成相同内容不会被长时间挡住。
    const doneCutoff = Date.now() - 2 * 60 * 1000
    const isActive = (state: string): boolean => ['PLANNING', 'READY', 'RUNNING', 'WAITING', 'RETRYING'].includes(state)
    const isFreshlyDone = (task: MediaTask): boolean => {
      if (task.state !== 'COMPLETED') return false
      const ts = Date.parse(task.updatedAt ?? '')
      return Number.isFinite(ts) && ts >= doneCutoff
    }
    for (const task of this.tasks.values()) {
      if (!isActive(task.state) && !isFreshlyDone(task)) continue
      const step = task.steps[0]
      if (!step || step.inputs?.['__mmrComposer'] !== true) continue
      const stepPrompt = String(step.inputs?.['prompt'] ?? '').trim()
      const promptMatch = !normalized || stepPrompt === normalized || stepPrompt.includes(normalized) || normalized.includes(stepPrompt)
      if (!promptMatch) continue
      if (recipeId && step.recipeId && step.recipeId !== recipeId) continue
      const capMatch = step.capability === capability ||
        (step.capability.includes('image') && capability.includes('image')) ||
        (step.capability.includes('video') && capability.includes('video')) ||
        (step.capability.includes('audio') && capability.includes('audio'))
      if (capMatch) return task
    }
    // 兜底：活跃的直调任务（防 LLM 重写 prompt 导致字符不匹配；仅活跃态，刚完成的
    // 任务在 prompt 不匹配时不兜——避免用户想重新生成却被旧结果挡住）
    for (const task of this.tasks.values()) {
      if (!isActive(task.state)) continue
      const step = task.steps[0]
      if (!step || step.inputs?.['__mmrComposer'] !== true) continue
      const capMatch = step.capability === capability ||
        (step.capability.includes('image') && capability.includes('image')) ||
        (step.capability.includes('video') && capability.includes('video')) ||
        (step.capability.includes('audio') && capability.includes('audio'))
      if (capMatch) {
        if (recipeId && !step.recipeId) step.recipeId = recipeId
        return task
      }
    }
    // 近期失败的直调任务（10 分钟内）：LLM 兜底重调 media_create_task 时返回失败详情
    // （publicView 含 step error），让 LLM 把失败原因（如积分不足）告知用户——
    // 而不是去重落空后新建无 recipeId 任务（默认路由换 Comfy 抢跑 + 丢参数）。
    // 时间窗防止历史失败任务永久命中导致用户无法用相同 prompt 重试。
    const failCutoff = Date.now() - 10 * 60 * 1000
    for (const task of this.tasks.values()) {
      if (task.state !== 'FAILED') continue
      const step = task.steps[0]
      if (!step || step.inputs?.['__mmrComposer'] !== true) continue
      const ts = Date.parse(task.updatedAt ?? '')
      if (!Number.isFinite(ts) || ts < failCutoff) continue
      const stepPrompt = String(step.inputs?.['prompt'] ?? '').trim()
      const promptMatch = !normalized || stepPrompt === normalized || stepPrompt.includes(normalized) || normalized.includes(stepPrompt)
      if (!promptMatch) continue
      if (recipeId && step.recipeId && step.recipeId !== recipeId) continue
      const capMatch = step.capability === capability ||
        (step.capability.includes('image') && capability.includes('image')) ||
        (step.capability.includes('video') && capability.includes('video')) ||
        (step.capability.includes('audio') && capability.includes('audio'))
      if (capMatch) return task
    }
    return undefined
  }

  require(id: string): MediaTask {
    const t = this.tasks.get(id)
    if (!t) throw new MediaError('EXECUTION_FAILED', `任务不存在: ${id}`, { retryable: false })
    return t
  }

  /** 保存后的轻量视图（给模型看，避免巨大载荷）。 */
  publicView(id: string): Record<string, unknown> | undefined {
    const t = this.tasks.get(id)
    if (!t) return undefined
    return {
      taskId: t.id,
      goal: t.goal,
      state: t.state,
      steps: t.steps.map((s) => ({
        id: s.id,
        capability: s.capability,
        dependsOn: s.dependsOn,
        state: s.state,
        recipeId: s.recipeId,
        provider: s.provider,
        retries: s.retries,
        stale: s.stale,
        error: s.error,
        outputs: s.outputs?.map((a) => a.id),
      })),
      updatedAt: t.updatedAt,
    }
  }

  cancel(taskId: string): void {
    const t = this.require(taskId)
    t.state = 'CANCELLED'
    t.updatedAt = new Date().toISOString()
    for (const s of t.steps) {
      if (s.state === 'RUNNING' || s.state === 'READY' || s.state === 'BLOCKED') s.state = 'CANCELLED'
    }
    void this.persist(t)
  }

  async persist(task: MediaTask): Promise<void> {
    await mkdir(task.rootDir, { recursive: true })
    await writeFile(join(task.rootDir, 'task.json'), JSON.stringify(task, null, 2), 'utf8')
  }

  async appendEvent(taskId: string, event: Record<string, unknown>): Promise<void> {
    const dir = this.taskDir(taskId)
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'events.jsonl'), JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n', 'utf8')
  }

  /** 启动时恢复未完成任务（崩溃续跑，PRD §43 Phase 5）。 */
  async restore(): Promise<number> {
    const { readdir } = await import('node:fs/promises')
    let ids: string[] = []
    try {
      ids = await readdir(join(this.rootDir, 'tasks'))
    } catch {
      return 0
    }
    let n = 0
    for (const id of ids) {
      try {
        const raw = await readFile(join(this.rootDir, 'tasks', id, 'task.json'), 'utf8')
        const t = JSON.parse(raw) as MediaTask
        if (t.state === 'RUNNING' || t.state === 'PLANNING') {
          // 上次会话中断的任务标记为可续跑状态
          t.state = 'FAILED'
          t.steps = t.steps.map((s) =>
            s.state === 'RUNNING' || s.state === 'READY' ? { ...s, state: 'BLOCKED' } : s,
          )
        }
        this.tasks.set(id, t)
        n++
      } catch {
        // 损坏的任务文件跳过
      }
    }
    return n
  }
}
