/**
 * PRD §42/§48 - 插件入口（External Plugin First，不修改 Harness Core）。
 *
 * 启动时：
 *  1. 初始化 .dsh-media 目录 + Asset Registry + 任务恢复
 *  2. 加载 recipes/ 与 workflows/
 *  3. 注册 6 个高层 media_* 工具
 *  4. 把 media_create_task 的后台执行接到官方 Job Runtime（ctx.jobs，PRD §19）
 */
import { access } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { MediaTask, MediaType } from '../core/index.js'
import {
  AssetRegistry,
  CapabilityRegistry,
  MediaError,
  RecipeRegistry,
  loadRecipesFromDir,
} from '../core/index.js'
import { TaskStore } from './task-store.js'
import { registerMediaTools } from './tools.js'
import { ComfyLocalProvider } from './comfy-provider.js'
import { RunningHubProvider, type RunningHubRegion } from './runninghub-provider.js'
import { OpenRouterProvider } from './openrouter-provider.js'
import type { MediaProvider } from './media-provider.js'
import { importUserWorkflow, scanUserWorkflows, userWorkflowsDir, updateUserWorkflow, deleteUserWorkflow } from './user-workflows.js'
import { runMediaTask } from './task-runner.js'
import type { DshContext } from './context.js'
import {
  MediaSettingsStore,
  applySettingsToCapabilities,
  recipeEnabled,
} from './settings.js'
import { MediaSettingsGateway, MEDIA_SETTINGS_MANIFEST } from './settings-gateway.js'
import { registerComposerContext } from './composer-context.js'

export const name = 'multimodal-runtime'
/** 最小依赖：只声明确定存在的 tools。
 *  教训（已踩坑）：Cordis 严格模式访问未 inject 属性会抛
 *  "cannot get property X without inject"；dsh-workspace 实际 API 是
 *  WorkspaceRegistry（create/resolveByPath），没有 current()。V1 用
 *  process.cwd()（launcher WorkingDirectory = workspace）代替，后台任务
 *  用 detached promise，不依赖 jobs 服务。
 *  sessions：按会话工作区（session.header.cwd）解析拖入素材的 .dsh/uploads
 *  相对路径——实测宿主进程 cwd 不一定等于会话工作区，process.cwd() 兜底不可靠。 */
export const inject = ['tools', 'typert', 'sessions']

export function apply(ctx: Context & DshContext): void {
  const tools = ctx.tools
  if (!tools) return

  // 工作区：launcher 的 WorkingDirectory = workspace；V1 直接取 cwd（PRD §17）
  const workspaceDir = process.cwd()
  const mediaRoot = join(workspaceDir, '.dsh-media')
  // 全能力类型表（用户工作流热更新时注销旧能力登记用）
  const ALL_CAPABILITY_TYPES = [
    'text-to-image',
    'image-to-image',
    'text-to-video',
    'image-to-video',
    'first-last-frame-video',
    'multi-image-to-video',
    'image-and-video-to-video',
    'video-to-audio',
    'text-to-audio',
    'text-to-music',
    'image-upscale',
    'video-upscale',
    'remove-background',
    'image-to-3d',
  ] as const
  const pkgRoot = fileURLToPath(new URL('../..', import.meta.url))
  const settingsPath = join(
    process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '', '.dsh'),
    'media-settings.json',
  )

  const store = new TaskStore(mediaRoot)
  const assets = new AssetRegistry(join(mediaRoot, 'assets'))
  const capabilities = new CapabilityRegistry()
  const recipes = new RecipeRegistry()
  const settings = new MediaSettingsStore(settingsPath)
  // 输入框芯片选择镜像（gateway 写、media_capabilities 读）：让 LLM 感知用户所选
  // 模式/工作流，替代旧的「改写用户消息注入 hint」方案（用户要求提交不改提示词）
  const composerSelection: { at: number; data: Record<string, unknown> | null } = { at: 0, data: null }
  // 芯片上下文注入：必须在 apply 同步段注册（与宿主 tool-skill 同形；异步/effect 内注册
  // 收不到 agent/pre-step 分发，实测踩坑）
  registerComposerContext(ctx as unknown as Parameters<typeof registerComposerContext>[0], { store, composerSelection })

  ctx.effect(() => {
    void (async () => {
      await store.init()
      await assets.init()
      await store.restore()
      await settings.load()

      // 加载 recipes/（插件包内）；相对 workflow.path 在此固化为绝对路径，
      // runner/provider 拿到的永远是可直读的绝对路径（相对路径会相对错误 cwd 解析）。
      const recipeDir = join(pkgRoot, 'recipes')
      const loaded = await loadRecipesFromDir(recipeDir)
      for (const r of loaded) {
        const declared = r.workflow?.path
        if (declared && !isAbsolute(declared)) {
          recipes.register({ ...r, workflow: { ...r.workflow, path: join(pkgRoot, declared) } })
        } else {
          recipes.register(r)
        }
      }

      // 加载用户自定义工作流（~/.dsh/media-workflows/）：拖入的工作流 API 即插即用
      try {
        const userWfs = await scanUserWorkflows(userWorkflowsDir())
        for (const uw of userWfs) {
          const r = uw.mapping && !uw.recipe.nodeMapping ? { ...uw.recipe, nodeMapping: uw.mapping } : uw.recipe
          try {
            recipes.register(r)
          } catch {
            // 同 id 冲突时跳过，避免单个坏文件阻断启动
          }
        }
      } catch {
        // 目录不存在/不可读时跳过：用户工作流是可选增强
      }

      // 管理页设置 → 能力表可用性（enabled=false 的 recipe 路由不再选中）
      applySettingsToCapabilities(settings.data, capabilities)

      // 云端 Provider Key：环境变量优先，管理页设置兜底；运行时每次现取（保存后热生效，无需重启）
      const resolveCloudKey = (envVar: string, providerId: string): string | undefined =>
        process.env[envVar] ?? settings.data.providers?.[providerId]?.apiKey

      // 从 recipes 构建能力表
      const comfyBaseUrl = () => {
        const raw = process.env.COMFYUI_URL ?? process.env.COMFYUI_HOST ?? 'http://127.0.0.1:8188'
        const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
        return withScheme.replace(/\/+$/, '')
      }
      const provider = new ComfyLocalProvider({
        serverName: 'comfy',
        comfyBaseUrl,
        call: async (tool, args = {}) => {
          // PRD §28：Provider Adapter 调用底层 mcp__comfy__* 工具
          const res = await tools.execute({
            name: `mcp__comfy__${tool}`,
            arguments: args,
            signal: new AbortController().signal,
          })
          // MCP 错误形态（已实测）：{ content:[{text:"Error executing tool ..."}], isError:true }
          // → 转结构化 MediaError，禁止静默失败（PRD §48-12）。
          if (res && typeof res === 'object') {
            const o = res as { isError?: boolean; content?: Array<{ type?: string; text?: string }> }
            if (o.isError) {
              const text = o.content?.find((b) => b.type === 'text')?.text ?? JSON.stringify(res)
              throw new MediaError('EXECUTION_FAILED', text, { retryable: true, details: { tool } })
            }
          }
          // comfy-mcp 结果可能包在 { value } 或 { content } 里，扁平化处理
          return unwrap(res)
        },
        // V1：comfy-mcp 工具面固定，显式列出。空列表会让 hasTool() 永远 false，
        // 导致 validate/upload 被跳过、fetch_outputs 直接抛 OUTPUT_MISSING。
        listTools: () => [
          'mcp__comfy__server_info',
          'mcp__comfy__validate_workflow',
          'mcp__comfy__upload_file',
          'mcp__comfy__run_workflow',
          'mcp__comfy__job',
          'mcp__comfy__fetch_outputs',
        ],
        assetRegistry: assets,
        workflowsDir: join(pkgRoot, 'workflows'),
      })

      const runningHubRegion = (value: string | undefined): RunningHubRegion => value === 'global' ? 'global' : 'cn'
      const resolveRunningHubKey = (scope: 'consumer' | 'enterprise', region: RunningHubRegion): string | undefined => {
        const sharedSlot = settings.data.providers?.runninghub
        const slot = settings.data.providers?.[`runninghub-${region}`]
        const legacySlot = settings.data.providers?.[scope === 'enterprise' ? 'runninghub-enterprise' : 'runninghub']
        const envNames = scope === 'enterprise'
          ? region === 'global'
            ? ['RUNNINGHUB_GLOBAL_ENTERPRISE_API_KEY', 'RUNNINGHUB_INTERNATIONAL_ENTERPRISE_API_KEY']
            : ['RUNNINGHUB_ENTERPRISE_API_KEY']
          : region === 'global'
            ? ['RUNNINGHUB_GLOBAL_API_KEY', 'RUNNINGHUB_INTERNATIONAL_API_KEY']
            : ['RUNNINGHUB_API_KEY']
        const env = envNames.map((name) => process.env[name]).find(Boolean)
        // 区域专属槽优先，共享 cn 槽只做兜底：否则国际版配方会拿到 cn Key——
        // 任务创建到别的账号下，用户在国际版控制台查无记录（实测踩坑）。
        return env
          ?? (scope === 'enterprise' ? slot?.enterpriseApiKey : slot?.apiKey)
          ?? (scope === 'enterprise' ? sharedSlot?.enterpriseApiKey : sharedSlot?.apiKey)
          ?? legacySlot?.apiKey
      }
      const resolveRunningHubBase = (region: RunningHubRegion): string => {
        const env = region === 'global'
          ? process.env.RUNNINGHUB_GLOBAL_BASE_URL ?? process.env.RUNNINGHUB_INTERNATIONAL_BASE_URL
          : process.env.RUNNINGHUB_BASE_URL
        return (env ?? (region === 'global' ? 'https://www.runninghub.ai' : 'https://www.runninghub.cn')).replace(/\/+$/, '')
      }
      const runninghubProvider = new RunningHubProvider({
        // 官方 Key 三级：消费级-会员跑工作流/AI 应用；企业级-共享跑模型 API（v2）。
        resolveApiKey: (scope, region = 'cn') => resolveRunningHubKey(scope, runningHubRegion(region)),
        resolveBaseUrl: (region) => resolveRunningHubBase(runningHubRegion(region)),
        assetRegistry: assets,
      })
      const openrouterProvider = new OpenRouterProvider({
        resolveApiKey: () => resolveCloudKey('OPENROUTER_API_KEY', 'openrouter'),
        assetRegistry: assets,
      })
      const providers: Record<string, MediaProvider> = {
        'comfy-local': provider,
        runninghub: runninghubProvider,
        openrouter: openrouterProvider,
      }

      // 三 Provider 能力合并注册（各自只认领 provider 字段匹配的 recipe）
      for (const p of Object.values(providers)) {
        const caps = await p.getCapabilities(recipes)
        for (const c of caps) capabilities.register(c)
      }
      // 自愈存量脏默认路由：capabilityDefault 指向的 recipe 不支持该能力（历史版本改能力分类
      // 未清理遗留）则清除并落盘，避免该能力任务静默路由到不匹配的模型（如配音模型被当文生图用）
      {
        let dirty = false
        for (const [type, rid] of Object.entries({ ...settings.data.capabilityDefault })) {
          const r = recipes.get(rid)
          if (!r || !r.capability.includes(type as never)) {
            delete settings.data.capabilityDefault[type]
            dirty = true
          }
        }
        if (dirty) await settings.save()
      }
      applySettingsToCapabilities(settings.data, capabilities)

      // V1：detached promise 后台执行（不依赖 ctx.jobs，避免 profile 差异）。
      // PRD §19 的官方 Job Runtime 接入留作 V1.5。
      // 工具路径与输入框快速直调（quickCreateTask）共用同一份启动逻辑。
      const startTask = (task: MediaTask) => {
        void runMediaTask(task, {
          registry: capabilities,
          recipes,
          assets,
          providers,
          workflowsDir: join(pkgRoot, 'workflows'),
          userWorkflowsDir: userWorkflowsDir(),
          taskDir: (id) => store.taskDir(id),
          preferredRecipeId: (capability) => settings.data.capabilityDefault[capability],
          recipeDefaults: (recipeId) => {
            const d = settings.data.recipes[recipeId]?.defaults
            return d ? { ...d } : undefined
          },
          workflowOverride: (recipeId) => settings.data.recipes[recipeId]?.workflowFile,
        })
          .catch((err) => {
            console.error(`[MMR] task ${task.id} execution failed:`, err)
            task.state = 'FAILED'
            if (task.steps[0]) {
              task.steps[0].state = 'FAILED'
              task.steps[0].error = {
                code: 'EXECUTION_FAILED',
                message: String(err && (err as { message?: string }).message ? (err as { message: string }).message : err),
                retryable: false,
              }
            }
          })
          .finally(() => void store.persist(task))
      }

      // 管理页网关（web 设置页 ←→ 运行时设置）。typert 由 inject 声明提供。
      const typert = (ctx as unknown as { typert?: { register(manifest: unknown): unknown } }).typert
      if (typert) {
        new MediaSettingsGateway(ctx, {
          settings,
          onChange: () => applySettingsToCapabilities(settings.data, capabilities),
          providerCall: (tool, args) => provider.callTool(tool, args),
          recipes: () => recipes.list(),
          workflowsDir: join(pkgRoot, 'workflows'),
          pkgRoot,
          userWorkflowsDir: userWorkflowsDir(),
          manageUserWorkflow: async (action, payload) => {
            const dir = userWorkflowsDir()
            if (action === 'remove') {
              // 仅用户导入的工作流可删（有 .recipe.json 落盘文件）；内置 recipe 直接拒绝
              const exists = await access(join(dir, `${payload.id}.recipe.json`)).then(
                () => true,
                () => false,
              )
              if (!exists) {
                throw new MediaError('INPUT_INVALID', '仅用户导入的工作流可删除', { retryable: false })
              }
              await deleteUserWorkflow(dir, payload.id)
              recipes.unregister(payload.id)
              for (const type of ALL_CAPABILITY_TYPES) capabilities.unregister(`${type}@${payload.id}`)
              applySettingsToCapabilities(settings.data, capabilities)
              return null
            }
            const wf = await updateUserWorkflow(dir, payload.id, payload.changes ?? {})
            if (!wf) return null
            recipes.register(wf.recipe)
            for (const type of ALL_CAPABILITY_TYPES) capabilities.unregister(`${type}@${wf.recipe.id}`)
            for (const type of wf.recipe.capability) {
              capabilities.register({
                id: `${type}@${wf.recipe.id}`,
                type,
                provider: wf.recipe.provider,
                recipeId: wf.recipe.id,
                inputs: wf.recipe.inputs,
                outputs: wf.recipe.outputs,
                available: true,
                constraints: wf.recipe.constraints,
              })
            }
            applySettingsToCapabilities(settings.data, capabilities)
            return wf
          },
          taskFactory: { create: (spec) => store.create(spec) },
          startTask,
          taskSource: { get: (id) => store.get(id) },
          assetSource: { get: (id) => assets.get(id) },
          uploadsDir: join(mediaRoot, 'uploads'),
          // 拖入素材路径交接（imagePaths/videoPaths）的解析基准；与 file-intake 的
          // .dsh/uploads 落盘根（会话工作区）同源，process.cwd() 仅兜底
          workspaceDir,
          composerSelection,
          registerAsset: (input) => {
            const asset = assets.register({ ...input, type: input.type as MediaType, parentAssets: [] })
            void assets.persist()
            return asset
          },
          providersInfo: () => [
            { id: 'comfy-local', configured: true },
            { id: 'runninghub-cn', configured: Boolean(resolveRunningHubKey('consumer', 'cn')) },
            { id: 'runninghub-global', configured: Boolean(resolveRunningHubKey('consumer', 'global')) },
            { id: 'runninghub-enterprise', configured: Boolean(resolveRunningHubKey('enterprise', 'cn') || resolveRunningHubKey('enterprise', 'global')) },
            { id: 'openrouter', configured: Boolean(resolveCloudKey('OPENROUTER_API_KEY', 'openrouter')) },
          ],
          importWorkflow: async (payload) => {
            // 管理页导入：落盘 ~/.dsh/media-workflows 并热注册（无需重启）
            const saved = await importUserWorkflow(userWorkflowsDir(), payload)
            try {
              recipes.register(saved.recipe)
            } catch {
              // 同 id 覆盖语义交由 registry；此处保证热注册流程不中断
            }
            for (const type of saved.recipe.capability) {
              capabilities.register({
                id: `${type}@${saved.recipe.id}`,
                type,
                provider: saved.recipe.provider,
                recipeId: saved.recipe.id,
                inputs: saved.recipe.inputs,
                outputs: saved.recipe.outputs,
                available: true,
                constraints: saved.recipe.constraints,
              })
            }
            // 多平台多工作流并存（类似 LLM 选择器）：导入不再抢占已有默认路由，
            // 仅当该能力尚无默认时才落默认；切换默认走管理页能力列表星标。
            if (payload.setAsDefault !== false && saved.recipe.capability.length > 0) {
              let changed = false
              for (const type of saved.recipe.capability) {
                if (!settings.data.capabilityDefault[type]) {
                  settings.data.capabilityDefault[type] = saved.recipe.id
                  changed = true
                }
              }
              if (changed) await settings.save()
            }
            applySettingsToCapabilities(settings.data, capabilities)
            return saved.recipe.id
          },
          comfyBaseUrl,
          resolveProviderKey: (providerId, region = 'cn') =>
            providerId === 'runninghub'
              ? resolveRunningHubKey('consumer', runningHubRegion(region))
              : providerId === 'runninghub-enterprise'
                ? resolveRunningHubKey('enterprise', runningHubRegion(region))
                : providerId === 'runninghub-cn'
                  ? resolveRunningHubKey('consumer', 'cn')
                  : providerId === 'runninghub-global'
                    ? resolveRunningHubKey('consumer', 'global')
                : providerId === 'openrouter'
                  ? resolveCloudKey('OPENROUTER_API_KEY', 'openrouter')
                  : undefined,
        })
        ctx.effect(() => {
          typert.register(MEDIA_SETTINGS_MANIFEST)
          return () => {}
        }, 'multimodal-runtime: mediaSettings manifest')
      }

      registerMediaTools({ tools }, {
        store,
        capabilities,
        recipes,
        assets,
        workspaceDir,
        isRecipeEnabled: (recipeId) => recipeEnabled(settings.data, recipeId),
        startTask,
        composerSelection,
      })
    })()
    // 无同步资源需要立即释放；后台任务生命周期由 Job Runtime / TaskStore 管理。
    return () => {}
  })
}

/** 扁平化工具返回：MCP 工具常返回 { content: [{type:'text',text:'...'}] } 或直接 JSON。 */
function unwrap(res: unknown): unknown {
  if (!res || typeof res !== 'object') return res
  const o = res as Record<string, unknown>
  if (o.content && Array.isArray(o.content)) {
    const texts = o.content
      .filter((b) => b && typeof b === 'object' && (b as { type?: string }).type === 'text')
      .map((b) => (b as { text?: string }).text)
      .filter(Boolean)
    if (texts.length > 0) {
      try {
        return JSON.parse(texts.join('\n'))
      } catch {
        return texts.join('\n')
      }
    }
  }
  if (o.value !== undefined) return o.value
  return res
}
