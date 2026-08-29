/**
 * Media Task Runner - 把 Scheduler 的核心逻辑路由到启用的 MediaProvider 上。
 * 负责：能力路由 → Recipe 选择 → provider.execute → 轮询 → fetch_outputs
 *      → Asset 登记（含 parentAssets）→ 结构 QC → 步骤输入传递。
 */
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import type { MediaAsset, MediaExecution, MediaTask, TaskStep } from '../core/index.js'
import { AssetRegistry, CapabilityRouter, MediaError, Scheduler, defaultRetryPolicy } from '../core/index.js'
import type { CapabilityRegistry, RecipeRegistry } from '../core/index.js'
import { StructuralEvaluator } from '../core/index.js'
import type { MediaProvider } from './media-provider.js'

export interface TaskRunnerOptions {
  registry: CapabilityRegistry
  recipes: RecipeRegistry
  assets: AssetRegistry
  /** 启用的 provider 集合（id -> provider）；执行时按 step/recipe 声明选择。 */
  providers: Record<string, MediaProvider>
  workflowsDir: string
  /** 用户自定义工作流目录：管理页覆盖文件优先在这里解析，内置 workflows/ 兜底。 */
  userWorkflowsDir?: string
  /** 每次执行输出目录（.dsh-media/tasks/<task-id>/output）。 */
  taskDir: (taskId: string) => string
  maxConcurrentJobs?: number
  /** 无 Vision 时语义 QC 一律 unavailable（PRD §24）——StructuralEvaluator 已内置该语义。 */
  /** 管理页：能力类型 -> 首选 recipeId（用户未显式指定时最高优先）。 */
  preferredRecipeId?: (capability: string) => string | undefined
  /** 管理页：recipe 级默认值（step inputs 未给时兜底注入）。 */
  recipeDefaults?: (recipeId: string) => Record<string, unknown> | undefined
  /** 管理页：workflow 文件覆盖（workflows/ 目录内文件名）。 */
  workflowOverride?: (recipeId: string) => string | undefined
}

/** 在 Harness 后台运行整个媒体任务 DAG（PRD §18 长任务不阻塞会话）。 */
export async function runMediaTask(task: MediaTask, opts: TaskRunnerOptions): Promise<MediaTask> {
  const scheduler = new Scheduler({
    maxConcurrentJobs: opts.maxConcurrentJobs ?? defaultRetryPolicy().maxConcurrentJobs,
    retryPolicy: defaultRetryPolicy(),
    executor: (step, t) => executeStep(step, t, opts),
  })

  // PRD §13：执行前做能力路由，把每个 step 绑定到具体 Recipe/Provider。
  // 管理页的 capabilityDefault 作为用户未显式指定时的首选。
  const router = new CapabilityRouter(opts.registry)
  for (const step of task.steps) {
    if (step.recipeId) continue
    const preferred = step.recipeId ?? opts.preferredRecipeId?.(step.capability)
    const route = router.route(step.capability, { preferredRecipeId: preferred })
    step.recipeId = route.recipeId
    step.provider = route.provider
  }

  await scheduler.run(task)
  return task
}

async function executeStep(step: TaskStep, task: MediaTask, opts: TaskRunnerOptions): Promise<void> {
  if (!step.recipeId) {
    throw new MediaError('WORKFLOW_INVALID', `step ${step.id} 没有绑定 Recipe`, { retryable: false })
  }
  const recipe = opts.recipes.get(step.recipeId)
  if (!recipe) {
    throw new MediaError('WORKFLOW_INVALID', `Recipe 不存在: ${step.recipeId}`, { retryable: false })
  }

  // 1. 上游资产 → 本地路径（asset:// 传递，PRD §15/§30）
  const parents = (step.inputs?.['assets'] as string[] | undefined) ?? []
  const parentAssets: MediaAsset[] = []
  const assetInputs: Record<string, string> = {}
  const slotCounts = new Map<string, number>()
  for (const aid of parents) {
    const asset = opts.assets.get(aid)
    if (!asset) {
      throw new MediaError('OUTPUT_MISSING', `上游资产 ${aid} 不存在`, { retryable: false })
    }
    parentAssets.push(asset)
    // 多参生视频等场景：同类资产依序编号（image / image2 / image3 ...），首图保持 image 与旧约定兼容
    const n = slotCounts.get(asset.type) ?? 0
    slotCounts.set(asset.type, n + 1)
    assetInputs[slotName(step.capability, asset.type, n)] = asset.localPath
  }

  // 2. workflow 路径：管理页覆盖 > recipe 声明 > 目录约定
  const override = opts.workflowOverride?.(step.recipeId)
  // 云端模型端点模式（runninghub/openrouter 的 run.endpoint）无需本地 workflow 文件，
  // Provider 端不会读取该值；本地模式按 管理页覆盖 > recipe 声明 > 目录约定 解析。
  let workflowPath: string = recipe.workflow?.path ?? `${opts.workflowsDir}/${recipe.id}.json`
  if (override) {
    // 覆盖文件基准目录：用户目录（~/.dsh/media-workflows）优先，内置 workflows/ 兜底。
    const bases = [...new Set([opts.userWorkflowsDir, opts.workflowsDir].filter((b): b is string => Boolean(b)))]
    let found: string | null = null
    for (const base of bases) {
      const candidate = join(base, override)
      try {
        await access(candidate)
        found = candidate
        break
      } catch {
        // 试下一个基准目录
      }
    }
    if (!found) {
      throw new MediaError(
        'WORKFLOW_INVALID',
        `管理页指定的 workflow 文件不存在: ${override}（Recipe ${step.recipeId}，已查找 ${bases.join(', ')}）`,
        { retryable: false },
      )
    }
    workflowPath = found
  }

  // 3. 提交 + 轮询（视频等长任务异步，不阻塞 Tool Call）
  //    Provider 选择：step 路由结果 > recipe 声明 > comfy-local 兜底。
  const providerId = step.provider ?? recipe.provider ?? 'comfy-local'
  const provider = opts.providers[providerId] ?? opts.providers['comfy-local']
  if (!provider) {
    throw new MediaError('MODEL_MISSING', `Provider ${providerId} 未启用且无 comfy-local 可兜底`, { retryable: false })
  }
  const handle = await provider.execute({
    stepId: step.id,
    taskId: task.id,
    recipe,
    workflowPath,
    inputs: step.inputs ?? {},
    defaults: opts.recipeDefaults?.(step.recipeId),
    assetInputs,
  })
  // 进度感知等待：running 期间把 provider 上报的 progress 回写 step（0-100），
  // taskSnapshot 据此算加权百分比，前端生成卡片实时显示（对齐主流生图进度体验）。
  const final = await waitForWithProgress(provider, handle.providerExecutionId, (p) => {
    step.progress = p
  })
  if (final.state === 'failed') {
    throw new MediaError(
      final.error?.code === 'OUT_OF_MEMORY' ? 'OUT_OF_MEMORY' : 'EXECUTION_FAILED',
      final.error?.message ?? '执行失败',
      { retryable: true },
    )
  }
  if (final.state === 'cancelled') {
    throw new MediaError('USER_CANCELLED', '执行被取消', { retryable: false })
  }

  // 4. fetch + Asset 登记
  const outDir = `${opts.taskDir(task.id)}/output`
  const assets = await provider.fetchOutputs(handle.providerExecutionId, outDir, {
    provider: provider.id,
    recipeId: recipe.id,
    prompt: String(step.inputs?.['prompt'] ?? ''),
    parentAssets: parentAssets.map((a) => a.id),
  })

  // 5. 结构 QC（PRD §23，Level 0 必须做）
  const qc = new StructuralEvaluator()
  for (const a of assets) {
    const r = await qc.evaluate(a, { checkExistence: true, minSizeBytes: 512 })
    if (!r.ok) {
      throw new MediaError('OUTPUT_MISSING', `结构 QC 未通过 ${a.id}: ${r.findings.map((f) => f.detail).join('; ')}`, {
        retryable: true,
      })
    }
  }

  step.outputs = assets
}

/**
 * 上游资产 -> workflow 输入槽位名。多参场景同类资产依序编号：
 * image / image2 / image3 ...（首图仍为 image，与单图工作流兼容）。
 */
function slotName(capability: TaskStep['capability'], type: MediaAsset['type'], index: number): string {
  if (capability === 'video-to-audio') return index === 0 ? 'video' : `video${index + 1}`
  return index === 0 ? type : `${type}${index + 1}`
}

/**
 * 进度感知的执行等待：轮询 provider.getStatus 直到终态。
 * running 且 provider 上报 progress（0-100）时经 onProgress 回写（task-runner 写 step.progress）。
 * 上限 1h（与 ComfyLocalProvider 默认 jobTimeoutMs 一致；视频任务上限）。
 */
async function waitForWithProgress(
  provider: MediaProvider,
  providerExecutionId: string,
  onProgress: (p: number) => void,
): Promise<MediaExecution> {
  const deadline = Date.now() + 60 * 60 * 1000
  for (;;) {
    const st = await provider.getStatus(providerExecutionId)
    if (st.state === 'running' && typeof st.progress === 'number' && Number.isFinite(st.progress)) {
      onProgress(Math.min(100, Math.max(0, st.progress)))
    }
    if (st.state === 'completed' || st.state === 'failed' || st.state === 'cancelled') return st
    if (Date.now() > deadline) {
      throw new MediaError('TIMEOUT', `等待执行 ${providerExecutionId} 超时`, { retryable: true })
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
}
