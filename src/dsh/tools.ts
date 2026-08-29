/**
 * PRD §27 - 高层 Tool 设计。
 * 只注册 5+1 个 media_* 工具，不为每个模型注册 generate_*。
 * 模型日常只接触这些高层工具；mcp__comfy__* 留给 Provider 与调试（PRD §28）。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-tools'
import type { MediaTask, TaskStep } from '../core/index.js'
import { MediaError, validateGraph } from '../core/index.js'
import type { TaskStore } from './task-store.js'
import { requiredAssetCheck } from './settings-gateway.js'
import type { CapabilityRegistry, RecipeRegistry, AssetRegistry } from '../core/index.js'

export interface ToolDeps {
  store: TaskStore
  capabilities: CapabilityRegistry
  recipes: RecipeRegistry
  assets: AssetRegistry
  startTask: (task: MediaTask) => void
  workspaceDir: string
  /** 管理页实时启停状态（缺省视为启用）。 */
  isRecipeEnabled?: (recipeId: string) => boolean
  /** 输入框芯片选择镜像（客户端 setComposerSelection 持续上报）：media_capabilities 带给 LLM。 */
  composerSelection?: { at: number; data: Record<string, unknown> | null }
}

/** 边界转换：剔除 undefined 字段（如 hint/enum/description 缺省值），
 *  保证返回值满足 DSH lossless-JSON 硬约束（undefined 会导致 "value is not lossless JSON"）。 */
function toJson(v: unknown): JsonValue {
  return JSON.parse(JSON.stringify(v ?? null)) as JsonValue
}

/** steps 参数容错：宿主/模型可能把 json 参数以字符串形式传入（如 steps 序列化为文本），
 *  先尝试 JSON.parse 还原数组；非字符串或解析失败则原样返回，由调用处的数组校验兜底报错。 */
export function coerceStepsArg(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const s = raw.trim()
  if (!s) return raw
  try {
    return JSON.parse(s)
  } catch {
    return raw
  }
}

/** steps capability 容错：模型可能把 media_capabilities 返回条目的 id（`${type}@${recipeId}`
 *  复合格式）误填进 capability 且漏填 recipeId——拆分归位（显式 recipeId 优先）。
 *  不拆分会导致 runner route(复合键) 报『当前没有任何可用的 … 能力』。 */
export function normalizeStepsCapability(steps: unknown): unknown {
  if (!Array.isArray(steps)) return steps
  for (const s of steps) {
    if (!s || typeof s !== 'object') continue
    const raw = (s as { capability?: unknown }).capability
    if (typeof raw !== 'string' || !raw.includes('@')) continue
    const at = raw.lastIndexOf('@')
    const type = raw.slice(0, at).trim()
    const recipe = raw.slice(at + 1).trim()
    if (!type || !recipe) continue
    ;(s as { capability: string }).capability = type
    const holder = s as { recipeId?: string }
    if (!holder.recipeId || !String(holder.recipeId).trim()) holder.recipeId = recipe
  }
  return steps
}

export function registerMediaTools(ctx: { tools: { register(def: unknown): () => void } }, deps: ToolDeps): void {
  const tools = [
    defineTool({
      name: 'media_capabilities',
      description:
        '查询当前多模态运行时可用能力（text-to-image / image-to-video / video-upscale 等）及其 Provider、Recipe、输入输出约束。生成类请求的固定第一步：先调本工具再调 media_create_task。返回字段：capabilities=能力列表；activeComposerTasks=输入框芯片直调已创建的任务（此时必须用其 capability/recipeId 调 media_create_task 去重命中，严禁反问用户或另建任务）；composerSelection=用户在芯片里选中的模式/工作流（按其生成，不要反问）。',
      parameters: {},
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute() {
        // 附带 recipe 名称与 workflow 文件名：模型由此知道每个能力有哪些工作流可选。
        const recipeById = new Map(deps.recipes.list().map((r) => [r.id, r]))
        const baseName = (p: string | undefined): string | null => {
          if (!p) return null
          const base = p.replaceAll('\\', '/').split('/').pop() ?? ''
          return base.endsWith('.json') ? base : null
        }
        const capabilities = deps.capabilities.list().map((c) => {
          const r = recipeById.get(c.recipeId ?? '')
          return {
            id: c.id,
            type: c.type,
            provider: c.provider,
            recipeId: c.recipeId ?? '',
            recipeName: r?.name ?? null,
            workflowFile: baseName(r?.workflow?.path),
            available: c.available,
            enabled: deps.isRecipeEnabled ? deps.isRecipeEnabled(c.recipeId ?? '') : true,
            constraints: c.constraints ?? null,
            inputs: c.inputs,
            outputs: c.outputs,
          }
        })
        // 输入框芯片上下文（不修改用户消息文本的前提下让 LLM 拿到运行时状态）：
        // - activeComposerTasks：芯片直调已创建的任务 → media_create_task 同参调用会去重命中，
        //   严禁把用户请求当新需求反问或另建任务；
        // - composerSelection：用户在芯片里选中的模式/工作流（音频等不经直调的模式照此生成）。
        const result: Record<string, unknown> = { capabilities }
        const active = deps.store.activeComposerTasks?.() ?? []
        if (active.length > 0) result['activeComposerTasks'] = active
        const sel = deps.composerSelection
        if (sel && sel.data && Date.now() - sel.at < 15 * 60 * 1000) result['composerSelection'] = sel.data
        return toJson(result)
      },
    }),

    defineTool({
      name: 'media_create_task',
      description:
        '创建并启动多模态媒体生成任务（文生图、图生图、文生视频、图生视频、文生音频等）。当用户要求生成图片/视频/音频，或消息带有【生成图片】/【生成视频】/【生成音频】标签时，必须且仅能调用此工具创建媒体任务（严禁调用 mcp__comfy_* 或其他 MCP 工具去拼装工作流，由本运行时全权接管调度执行与资产传递）。steps 为 JSON 数组：[{id: "gen", capability, recipeId?, inputs: { prompt, width?, height? }}]，capability 填能力类型（media_capabilities 返回的 type 字段，如 "image-to-video"），不要填条目 id；recipeId 可选，用于指定工作流（media_capabilities 返回的 recipeId 字段）。创建成功后立即结束本轮回复并简短告知用户已开始生成——进度与产出由对话内的进度卡片自动展示，无需轮询等待。重要：若返回的是去重命中的既有任务且状态为 COMPLETED（刚完成的直调任务），直接简短告知用户已完成（产出在卡片中），严禁重新创建；若状态为 FAILED，必须把 step 的 error 原样告知用户并结束——严禁更换 recipeId/工作流、更换 capability 或改用任何其他工具重试生成（例如积分不足时直接告知用户去充值，不得换用本地 ComfyUI 工作流绕过）。',
      parameters: {
        goal: { type: 'string', required: true, description: '任务的总体目标（一句话）' },
        steps: {
          type: 'json',
          required: true,
          description: 'step 数组 JSON：[{id, capability, dependsOn?, recipeId?, inputs?}]',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        const goal = (args as { goal: string }).goal
        const steps = coerceStepsArg((args as { steps: JsonValue }).steps) as unknown as TaskStep[]
        if (!Array.isArray(steps) || steps.length === 0) {
          throw new MediaError('INPUT_INVALID', 'steps 必须是非空数组', { retryable: false })
        }
        // 容错：capability 误填 media_capabilities 条目 id（type@recipeId）时拆分归位
        normalizeStepsCapability(steps)
        // 去重最先（先于一切校验）：芯片直调任务（含刚完成的）命中即返回 publicView。
        // 模型常把消息里的 @路径 硬编成伪 asset:// 引用传进来——若先校验素材，成功的
        // 去重会被无关错误打断，进度卡片挂不上（实测踩坑）。命中后参数对不对都无所谓。
        const earlyPrompt = String(steps[0]?.inputs?.['prompt'] ?? '')
        const earlyCapability = String(steps[0]?.capability ?? '')
        const earlyRid = typeof steps[0]?.recipeId === 'string' ? steps[0].recipeId.trim() : ''
        const existingEarly = deps.store.findActiveComposerTask(earlyPrompt, earlyCapability, earlyRid || undefined)
        if (existingEarly) return toJson(deps.store.publicView(existingEarly.id))
        // step 级 recipeId 指定（对话框工作流菜单 / 模型显式选择）：立即校验存在性与能力归属，
        // 避免带病路由到执行期才失败（runner 对显式 recipeId 跳过默认路由）。
        for (const s of steps) {
          const rid = typeof s.recipeId === 'string' ? s.recipeId.trim() : ''
          if (!rid) continue
          const recipe = deps.recipes.get(rid)
          if (!recipe) {
            throw new MediaError('INPUT_INVALID', `step ${String(s.id)} 指定的 recipeId 不存在: ${rid}`, {
              retryable: false,
            })
          }
          if (!recipe.capability.includes(s.capability as never)) {
            throw new MediaError(
              'INPUT_INVALID',
              `step ${String(s.id)} 的 recipeId ${rid} 不支持能力 ${String(s.capability)}（声明: ${recipe.capability.join(', ')}）`,
              { retryable: false },
            )
          }
        }
        // 伪资产引用容错：模型常把消息 @路径 硬编成 `asset://video/<文件名>` 之类的假 ID。
        // 按文件名在资产表里找真身，找到就替换为真实 asset id（找不到保持原样，由下方
        // 素材校验给出明确报错）。
        for (const s of steps) {
          const inputs = s.inputs ?? (s.inputs = {})
          const aids = Array.isArray(inputs['assets']) ? [...(inputs['assets'] as unknown[])] : []
          if (aids.length === 0) continue
          inputs['assets'] = aids.map((aid) => {
            const key = String(aid)
            if (deps.assets.get(key)) return key
            const base = key.replace(/^asset:\/\//, '').split(/[\\/]/).pop() ?? ''
            if (!base) return key
            const hit = deps.assets.list().find((a) => a.localPath.split(/[\\/]/).pop() === base)
            return hit ? hit.id : key
          })
        }
        // 素材-能力匹配校验（与 quickCreateTask 同语义）：无素材的视频超分等任务直接拒绝。
        // 实测踩坑：LLM 竞态建出的无素材 video-upscale 任务，云端工作流会用内置案例视频生成，
        // 用户拿到的是示例而非自己的素材——机制上禁止。
        for (const s of steps) {
          const aids = Array.isArray(s.inputs?.['assets']) ? (s.inputs!['assets'] as unknown[]) : []
          let imageCount = 0
          let videoCount = 0
          for (const aid of aids) {
            const a = deps.assets.get(String(aid))
            if (!a) continue
            if (a.type === 'image') imageCount++
            else if (a.type === 'video') videoCount++
          }
          const assetErr = requiredAssetCheck(String(s.capability), { imageCount, videoCount })
          if (assetErr) {
            throw new MediaError('INPUT_INVALID', `step ${String(s.id)}: ${assetErr}`, { retryable: false })
          }
        }
        const specs = steps.map((s) => ({
          id: String(s.id),
          capability: s.capability as TaskStep['capability'],
          dependsOn: (s.dependsOn ?? []) as string[],
          recipeId:
            typeof s.recipeId === 'string' && s.recipeId.trim() ? s.recipeId.trim() : undefined,
        }))
        const g = validateGraph(specs)
        if (!g.ok) {
          throw new MediaError('INPUT_INVALID', 'DAG 校验失败: ' + g.errors.join('; '), { retryable: false })
        }

        const task = deps.store.create({
          goal,
          steps: specs.map((sp, i) => ({ ...sp, inputs: steps[i]?.inputs })),
        })
        deps.startTask(task)
        return toJson(deps.store.publicView(task.id))
      },
    }),

    defineTool({
      name: 'media_task_status',
      description: '查询媒体任务及其每个 step 的状态、进度、错误、产出资产。仅当用户明确要求等待/排查问题时调用；常规创建任务后无需轮询——对话内的进度卡片会自动展示进度与产出。',
      parameters: { taskId: { type: 'string', required: true } },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        const { taskId } = args as { taskId: string }
        const view = deps.store.publicView(taskId)
        if (!view) throw new MediaError('EXECUTION_FAILED', `任务不存在: ${taskId}`, { retryable: false })
        return toJson(view)
      },
    }),

    defineTool({
      name: 'media_asset_info',
      description:
        '查询媒体资产详情（本地路径、类型、尺寸、来源链 parentAssets、Recipe、Prompt）。assetId 形如 asset://image/<uuid>。',
      parameters: { assetId: { type: 'string', required: true } },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        const { assetId } = args as { assetId: string }
        const a = deps.assets.get(assetId)
        if (!a) throw new MediaError('OUTPUT_MISSING', `资产不存在: ${assetId}`, { retryable: false })
        return toJson(a)
      },
    }),

    defineTool({
      name: 'media_cancel_task',
      description: '取消正在运行的媒体任务。后续步骤会被标记 CANCELLED，已完成资产保留（PRD §36）。',
      parameters: { taskId: { type: 'string', required: true } },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        const { taskId } = args as { taskId: string }
        if (!deps.store.get(taskId)) {
          throw new MediaError('EXECUTION_FAILED', `任务不存在: ${taskId}`, { retryable: false })
        }
        deps.store.cancel(taskId)
        return toJson({ taskId, cancelled: true, state: 'CANCELLED' })
      },
    }),

    defineTool({
      name: 'media_setup',
      description:
        '运行 Comfy Setup 检测链（Python / comfy-cli / comfy-mcp / ComfyUI workspace / server / models / nodes / MCP 配置），返回每个组件 READY|PARTIAL|BROKEN|NOT_INSTALLED 与修复提示。',
      parameters: {},
      output: {
        schema: { type: 'json' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute() {
        const { runDetection } = await import('../setup/detect.js')
        const report = await runDetection()
        return toJson({ overall: report.overall, components: report.components, summary: report.summary })
      },
    }),
  ]

  for (const t of tools) {
    ctx.tools.register(t as never)
  }
}
