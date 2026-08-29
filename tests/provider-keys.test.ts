/**
 * Provider Key 动态解析（热生效）单测。
 * 管理页保存 Key / 环境变量变化后，Provider 必须在下次调用时立即看到新 Key，
 * 不允许再出现「启动时固化、保存后要重启」的断点。
 */
import { describe, expect, it } from 'vitest'
import { RunningHubProvider } from '../src/dsh/runninghub-provider.js'
import { OpenRouterProvider } from '../src/dsh/openrouter-provider.js'
import { RecipeRegistry } from '../src/core/index.js'
import type { AssetRegistry, Recipe } from '../src/core/index.js'

const baseRecipe: Recipe = {
  id: 'key-test',
  name: 'key test',
  capability: ['text-to-image'],
  provider: 'runninghub',
  run: { endpoint: 'images/generation' },
  inputs: [{ name: 'prompt', type: 'string', required: true }],
  outputs: [{ name: 'output', type: 'image' }],
  health: { validateOnStartup: false },
}

/** getCapabilities 不触网：仅按 Key 存在与否标记 available。 */
function registryWith(provider: string): RecipeRegistry {
  const recipes = new RecipeRegistry()
  recipes.register({ ...baseRecipe, provider })
  return recipes
}

describe('Provider Key 动态解析', () => {
  it('RunningHub：resolveApiKey 变化时能力可用性即时跟随', async () => {
    const recipes = registryWith('runninghub')
    let key: string | undefined
    const p = new RunningHubProvider({ resolveApiKey: () => key, assetRegistry: {} as AssetRegistry })

    expect((await p.getCapabilities(recipes)).every((c) => !c.available)).toBe(true)
    key = 'rh-key-1'
    expect((await p.getCapabilities(recipes)).every((c) => c.available)).toBe(true)
    key = undefined
    expect((await p.getCapabilities(recipes)).every((c) => !c.available)).toBe(true)
  })

  it('RunningHub：无 Key 时 healthCheck 明确提示且不触网', async () => {
    const p = new RunningHubProvider({ assetRegistry: {} as AssetRegistry })
    const health = await p.healthCheck()
    expect(health.online).toBe(false)
    expect(health.detail).toContain('未配置')
  })

  it('OpenRouter：resolveApiKey 优先，静态 apiKey 兜底', async () => {
    const recipes = registryWith('openrouter')
    let key: string | undefined = 'dyn-key'
    const p = new OpenRouterProvider({ apiKey: 'static-key', resolveApiKey: () => key, assetRegistry: {} as AssetRegistry })
    expect((await p.getCapabilities(recipes)).every((c) => c.available)).toBe(true)

    // 动态解析失效时回退静态 Key
    key = undefined
    expect((await p.getCapabilities(recipes)).every((c) => c.available)).toBe(true)

    // 两者皆无 → 不可用
    const p2 = new OpenRouterProvider({ assetRegistry: {} as AssetRegistry })
    expect((await p2.getCapabilities(recipes)).every((c) => !c.available)).toBe(true)
  })
})
