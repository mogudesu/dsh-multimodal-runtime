/**
 * updateRecipeMeta 改能力分类后清理旧默认路由的单测。
 * 场景：模型 s2.1-pro 最初登记为 text-to-image 并抢占文生图默认路由，用户改为
 * text-to-audio（文本配音）后，text-to-image 的默认路由必须同步清除——
 * 否则文生图任务仍会静默路由到该配音模型（OpenRouter 模态 404）。
 */
import { describe, expect, it } from 'vitest'
import { MediaSettingsGateway } from '../src/dsh/settings-gateway.js'
import type { Recipe } from '../src/core/index.js'

function fakeRecipe(id: string, capability: string[]): Recipe {
  return {
    id,
    name: id,
    provider: 'openrouter',
    capability: capability as never,
    inputs: [],
    outputs: [],
    run: { model: id },
  } as unknown as Recipe
}

/**
 * 构造注入 manageUserWorkflow 桩的 gateway 实例：
 * - settings.data.capabilityDefault 可控（模拟存量默认路由）
 * - manageUserWorkflow('update') 模拟落盘+热注册：返回更新后的 recipe
 */
function makeGateway(recipe: Recipe, capabilityDefault: Record<string, string>) {
  const saves: number[] = [] // 引用类型计数（number 快照会让闭包内自增对测试不可见）
  const opts = {
    settings: {
      data: { version: 1, recipes: {}, capabilityDefault },
      save: async () => {
        saves.push(1)
      },
    } as never,
    onChange: () => {},
    providerCall: async () => ({}),
    recipes: () => [recipe],
    workflowsDir: '/tmp/wf',
    pkgRoot: '/tmp/pkg',
    manageUserWorkflow: async (action: string, payload: { id: string; changes: { capability?: string[] } }) => {
      if (action !== 'update') return null
      if (payload.id !== recipe.id) return null // 真实语义：文件不存在 → null → gateway 抛"不存在或不可修改"
      const caps = payload.changes.capability ?? recipe.capability
      return { recipe: { ...recipe, capability: caps } }
    },
  }
  const gw = Object.create(MediaSettingsGateway.prototype) as MediaSettingsGateway
  ;(gw as unknown as { opts: unknown }).opts = opts
  return { gw, saves, capabilityDefault }
}

describe('updateRecipeMeta 默认路由清理', () => {
  it('改能力后：旧能力默认路由被清除并落盘，新能力默认保留', async () => {
    // s2.1-pro 现为 text-to-image 且是文生图默认路由；用户改为 text-to-audio
    const recipe = fakeRecipe('s2-1-pro', ['text-to-image'])
    const { gw, saves, capabilityDefault } = makeGateway(recipe, { 'text-to-image': 's2-1-pro' })
    const res = (await gw.updateRecipeMeta({ recipeId: 's2-1-pro', capability: ['text-to-audio'] })) as {
      capability: string[]
    }
    expect(res.capability).toEqual(['text-to-audio'])
    expect(capabilityDefault['text-to-image']).toBeUndefined()
    expect(saves.length).toBe(1)
  })

  it('改能力后：新能力自身的默认路由不受影响', async () => {
    const recipe = fakeRecipe('r1', ['text-to-image'])
    const { gw, capabilityDefault } = makeGateway(recipe, {
      'text-to-image': 'r1',
      'text-to-audio': 'r1', // recipe 同时声明两个能力时改组，audio 默认保留
    })
    // r1 改成 [text-to-image, text-to-audio]：两个默认都仍合法
    await gw.updateRecipeMeta({ recipeId: 'r1', capability: ['text-to-image', 'text-to-audio'] })
    expect(capabilityDefault['text-to-image']).toBe('r1')
    expect(capabilityDefault['text-to-audio']).toBe('r1')
  })

  it('其他 recipe 的默认路由不受影响', async () => {
    const recipe = fakeRecipe('r1', ['text-to-image'])
    const { gw, capabilityDefault } = makeGateway(recipe, {
      'text-to-image': 'r1',
      'image-to-image': 'other-recipe',
    })
    await gw.updateRecipeMeta({ recipeId: 'r1', capability: ['text-to-video'] })
    expect(capabilityDefault['image-to-image']).toBe('other-recipe')
    expect(capabilityDefault['text-to-image']).toBeUndefined()
  })

  it('工作流不存在时拒绝', async () => {
    const recipe = fakeRecipe('r1', ['text-to-image'])
    const { gw } = makeGateway(recipe, {})
    await expect(gw.updateRecipeMeta({ recipeId: 'nope', capability: ['text-to-audio'] })).rejects.toThrow(
      '不存在或不可修改',
    )
  })

  it('空能力列表拒绝', async () => {
    const recipe = fakeRecipe('r1', ['text-to-image'])
    const { gw } = makeGateway(recipe, {})
    await expect(gw.updateRecipeMeta({ recipeId: 'r1', capability: [] })).rejects.toThrow('至少选择一个能力分类')
  })
})
