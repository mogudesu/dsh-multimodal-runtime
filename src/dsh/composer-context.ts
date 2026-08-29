/**
 * 输入框芯片上下文注入（agent/pre-step，与宿主 skill-catalog 同一机制）。
 *
 * 把两类运行时状态以 <system-reminder> 注入每轮 LLM 上下文，替代旧的
 * 「改写用户消息注入 hint」方案（用户红线：提交不得改变提示词）：
 *  - activeComposerTasks：芯片直调已创建的任务 → LLM 用同参调用去重命中，不再反问；
 *  - composerSelection：用户在芯片当前选中的模式/工作流（音频等不经直调的模式照此生成）。
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { TaskStore } from './task-store.js'

export interface ComposerSelectionSlot {
  at: number
  data: Record<string, unknown> | null
}

interface StepMessage {
  id?: string
}

interface PreStepPayload {
  signal?: { throwIfAborted(): void }
}

interface PreStepDecision {
  kind: string
  messages?: StepMessage[]
}

const SELECTION_TTL_MS = 15 * 60 * 1000

export function registerComposerContext(
  ctx: {
    on(
      event: 'agent/pre-step',
      handler: (payload: PreStepPayload, next: () => Promise<PreStepDecision>) => Promise<PreStepDecision>,
    ): unknown
  },
  opts: { store: TaskStore; composerSelection: ComposerSelectionSlot },
): void {
  let lastId: string | undefined
  let lastDigest = ''
  try {
    ctx.on('agent/pre-step', async (payload, next) => {
      const decision = await next()
      if (decision.kind === 'reject') return decision
      payload.signal?.throwIfAborted()
      const active = opts.store.activeComposerTasks()
      const slot = opts.composerSelection
      const selection = slot.data && Date.now() - slot.at < SELECTION_TTL_MS ? slot.data : null
      const lines: string[] = []
      if (active.length > 0) {
        lines.push('输入框芯片直调已创建的任务（用户在输入框选好工作流后发送，消息保持原文，不会带标签）：')
        for (const t of active) {
          lines.push(
            `- taskId=${t.taskId} capability=${t.capability} recipeId=${t.recipeId ?? '默认路由'} state=${t.state} prompt=${JSON.stringify(t.prompt)}`,
          )
        }
        lines.push(
          '处理：直接调用 media_create_task，steps[0] 用上述 capability 与 recipeId、inputs.prompt 用用户原文——会去重命中该任务并在对话内展示进度卡片。若命中任务 state=COMPLETED，说明刚生成完毕：直接简短告知用户已完成（产出在卡片中），严禁重新创建任务。严禁以信息不足为由反问用户（工作流是用户亲手选的）；严禁另建不同工作流的新任务；严禁用其他工具重跑。仅当用户本轮消息涉及生成媒体时按上述处理，否则忽略本提醒。',
        )
      }
      if (selection) {
        lines.push(
          `用户在芯片当前选择：${JSON.stringify(selection)}。若上面没有对应已建任务，直接按此 capability/recipeId/duration 调 media_create_task 创建，不要反问。`,
        )
      }
      const relevant = lines.length > 0
      const digest = relevant ? lines.join('\n') : ''
      const messages = (decision.messages ?? []) as StepMessage[]
      const existingIndex = lastId ? messages.findIndex((m) => m.id === lastId) : -1
      if (!relevant) {
        // 状态清空：撤掉上一轮注入的提醒（与 skill-catalog 的移除分支同形）
        if (existingIndex >= 0) {
          lastId = undefined
          lastDigest = ''
          return { kind: 'enter', messages: messages.filter((_, i) => i !== existingIndex) }
        }
        lastId = undefined
        lastDigest = ''
        return decision
      }
      if (digest === lastDigest && existingIndex >= 0) return decision
      const message = createUserMessage({
        content: [{ type: 'text', text: '<system-reminder>\n' + lines.join('\n') + '\n</system-reminder>' }],
        source: {
          kind: 'plugin',
          plugin: 'dsh-multimodal-runtime',
          form: 'notice',
          summary: '多模态芯片状态：直调任务进行中 / 用户已选工作流（详见正文，去重命中勿反问）',
        },
      }) as StepMessage
      const nextMessages = existingIndex >= 0
        ? messages.map((m, i) => (i === existingIndex ? message : m))
        : [...messages, message]
      lastId = message.id
      lastDigest = digest
      return { kind: 'enter', messages: nextMessages }
    })
  } catch (err) {
  }
}
