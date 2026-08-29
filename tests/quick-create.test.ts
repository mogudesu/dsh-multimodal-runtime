import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MediaSettingsGateway } from '../src/dsh/settings-gateway.js'
import type { Recipe } from '../src/core/index.js'

/** 最小可用 recipe 桩：能力 text-to-image。 */
function fakeRecipe(id: string, capability: string[] = ['text-to-image']): Recipe {
  return {
    id,
    name: id,
    provider: 'comfy-local',
    capability: capability as never,
    inputs: [],
    outputs: [],
    workflow: { path: '' },
    run: async () => {},
  } as unknown as Recipe
}

/** 构造仅注入 quickCreateTask 依赖的 gateway 实例（绕开 cordis 构造，直接注入 opts）。 */
function makeGateway(recipes: Recipe[]) {
  const created: unknown[] = []
  const started: unknown[] = []
  const opts = {
    settings: { data: { version: 1, recipes: {}, capabilityDefault: {} }, save: async () => {} } as never,
    onChange: () => {},
    providerCall: async () => ({}),
    recipes: () => recipes,
    workflowsDir: '/tmp/wf',
    pkgRoot: '/tmp/pkg',
    taskFactory: {
      create: (spec) => {
        const task = { id: 'task-' + (created.length + 1), state: 'RUNNING', ...spec }
        created.push(spec)
        return task as never
      },
    },
    startTask: (task: unknown) => started.push(task),
  }
  const gw = Object.create(MediaSettingsGateway.prototype) as MediaSettingsGateway
  ;(gw as unknown as { opts: unknown }).opts = opts
  return { gw, created, started }
}

describe('quickCreateTask（输入框快速直调）', () => {
  it('合法 payload：创建单步任务并启动，返回 taskId', async () => {
    const { gw, created, started } = makeGateway([fakeRecipe('r1')])
    const res = (await gw.quickCreateTask(undefined, {
      capability: 'text-to-image',
      recipeId: 'r1',
      prompt: '三只猫',
      width: 1024,
      height: 1024,
    })) as { taskId: string; state: string }
    expect(res.taskId).toBe('task-1')
    expect(res.state).toBe('RUNNING')
    expect(started.length).toBe(1)
    expect(created[0]).toMatchObject({
      goal: '三只猫',
      steps: [{ id: 'gen', capability: 'text-to-image', recipeId: 'r1', inputs: { prompt: '三只猫', width: 1024, height: 1024 } }],
    })
  })

  it('无 recipeId：走默认路由（step 不带 recipeId）', async () => {
    const { gw, created } = makeGateway([fakeRecipe('r1')])
    await gw.quickCreateTask(undefined, { capability: 'text-to-audio', prompt: 'hi' })
    expect(created[0]).toMatchObject({ steps: [{ id: 'gen', capability: 'text-to-audio', recipeId: undefined }] })
  })

  it('空 prompt 拒绝', async () => {
    const { gw } = makeGateway([])
    await expect(gw.quickCreateTask(undefined, { capability: 'text-to-image', prompt: '   ' })).rejects.toThrow('prompt')
  })

  it('recipeId 不存在拒绝', async () => {
    const { gw } = makeGateway([fakeRecipe('r1')])
    await expect(
      gw.quickCreateTask(undefined, { capability: 'text-to-image', recipeId: 'nope', prompt: 'x' }),
    ).rejects.toThrow('recipeId')
  })

  it('recipeId 能力不符时自适应降级到 recipe 声明的首个能力', async () => {
    const { gw, created } = makeGateway([fakeRecipe('r1')])
    const res = (await gw.quickCreateTask(undefined, { capability: 'text-to-video', recipeId: 'r1', prompt: 'x' })) as { taskId: string }
    expect(res.taskId).toBe('task-1')
    // capability 应被自适应到 recipe 声明的 text-to-image
    expect(created[0]).toMatchObject({ steps: [{ capability: 'text-to-image' }] })
  })

  it('goal 超 60 字截断', async () => {
    const { gw, created } = makeGateway([])
    const long = 'a'.repeat(80)
    await gw.quickCreateTask(undefined, { capability: 'text-to-image', prompt: long })
    expect((created[0] as { goal: string }).goal.length).toBe(61)
  })
})

describe('quickCreateTask 拖入素材路径交接（videoPaths/imagePaths）', () => {
  /** 临时工作区 + .dsh/uploads 落盘文件；registerAsset/ uploadsDir 注入后走真实读盘管线。 */
  async function makeWorkspaceGateway() {
    const workspaceDir = await mkdtemp(join(tmpdir(), 'mmr-ws-'))
    const uploadsDir = await mkdtemp(join(tmpdir(), 'mmr-up-'))
    const relDir = join(workspaceDir, '.dsh', 'uploads', '2026-08-28')
    await mkdir(relDir, { recursive: true })
    const videoBytes = Buffer.from('fake-video-bytes-' + Math.random())
    await writeFile(join(relDir, 'clip.mp4'), videoBytes)
    const registered: Array<Record<string, unknown>> = []
    const { gw, created, started } = makeGateway([])
    const opts = (gw as unknown as { opts: Record<string, unknown> }).opts
    opts.workspaceDir = workspaceDir
    opts.uploadsDir = uploadsDir
    opts.registerAsset = (input: Record<string, unknown>) => {
      registered.push(input)
      return { id: 'asset-' + registered.length }
    }
    return {
      gw,
      created,
      started,
      registered,
      uploadsDir,
      workspaceDir,
      videoRel: '.dsh/uploads/2026-08-28/clip.mp4',
      videoAbs: join(relDir, 'clip.mp4'),
      cleanup: () => Promise.all([rm(workspaceDir, { recursive: true, force: true }), rm(uploadsDir, { recursive: true, force: true })]),
    }
  }

  it('videoPaths 交接：读工作区文件 → 去重落盘 → 登记资产 → inputs.assets', async () => {
    const ctx = await makeWorkspaceGateway()
    try {
      await ctx.gw.quickCreateTask(undefined, { capability: 'video-upscale', prompt: '放大这段视频', videoPaths: [ctx.videoRel] })
      expect(ctx.started.length).toBe(1)
      expect(ctx.registered).toHaveLength(1)
      expect(ctx.registered[0]).toMatchObject({ type: 'video', provider: 'file-intake', prompt: 'clip.mp4' })
      expect((ctx.created[0] as { steps: Array<{ inputs: { assets?: string[] } }> }).steps[0].inputs.assets).toEqual(['asset-1'])
      const staged = await readdir(ctx.uploadsDir)
      expect(staged.some((f) => f.startsWith('ref-') && f.endsWith('.mp4'))).toBe(true)
    } finally {
      await ctx.cleanup()
    }
  })

  it('相对路径按会话工作区解析（session cwd 优先，宿主 cwd 指向别处也不受影响）', async () => {
    const ctx = await makeWorkspaceGateway()
    try {
      // 模拟实测故障：宿主进程 cwd（workspaceDir）≠ 会话工作区；文件只在会话工作区里
      const wrongBase = await mkdtemp(join(tmpdir(), 'mmr-wrongbase-'))
      ;(ctx.gw as unknown as { opts: Record<string, unknown> }).opts.workspaceDir = wrongBase
      ;(ctx.gw as unknown as { ctx: unknown }).ctx = {
        sessions: { get: (id: string) => ({ header: { cwd: ctx.workspaceDir } }) },
      }
      await ctx.gw.quickCreateTask('sess-1', { capability: 'video-upscale', prompt: 'x', videoPaths: [ctx.videoRel] })
      expect(ctx.registered).toHaveLength(1)
      await rm(wrongBase, { recursive: true, force: true })
    } finally {
      await ctx.cleanup()
    }
  })

  it('绝对路径素材直接接受（任意目录拖入的源文件）', async () => {
    const ctx = await makeWorkspaceGateway()
    try {
      await ctx.gw.quickCreateTask(undefined, { capability: 'video-upscale', prompt: 'x', videoPaths: [ctx.videoAbs] })
      expect(ctx.registered).toHaveLength(1)
      expect(ctx.registered[0]).toMatchObject({ type: 'video', provider: 'file-intake' })
    } finally {
      await ctx.cleanup()
    }
  })

  it('越出 .dsh/uploads/ 的引用拒绝（防路径穿越）', async () => {
    const ctx = await makeWorkspaceGateway()
    try {
      await expect(
        ctx.gw.quickCreateTask(undefined, { capability: 'video-upscale', prompt: 'x', videoPaths: ['.dsh/settings/secret.json'] }),
      ).rejects.toThrow('素材')
      expect(ctx.started.length).toBe(0)
    } finally {
      await ctx.cleanup()
    }
  })

  it('不存在的绝对路径拒绝', async () => {
    const ctx = await makeWorkspaceGateway()
    try {
      await expect(
        ctx.gw.quickCreateTask(undefined, { capability: 'video-upscale', prompt: 'x', videoPaths: ['C:/Windows/system32/config.sys'] }),
      ).rejects.toThrow('素材')
      expect(ctx.started.length).toBe(0)
    } finally {
      await ctx.cleanup()
    }
  })

  it('文件不存在的引用拒绝', async () => {
    const ctx = await makeWorkspaceGateway()
    try {
      await expect(
        ctx.gw.quickCreateTask(undefined, { capability: 'video-upscale', prompt: 'x', videoPaths: ['.dsh/uploads/2026-08-28/gone.mp4'] }),
      ).rejects.toThrow('素材')
      expect(ctx.started.length).toBe(0)
    } finally {
      await ctx.cleanup()
    }
  })
})
