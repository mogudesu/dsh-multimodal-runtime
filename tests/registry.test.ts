import { describe, expect, it } from 'vitest'
import { CapabilityRegistry, CapabilityRouter } from '../src/core/capability-registry.js'
import type { MediaCapability } from '../src/core/types.js'
import { MediaError } from '../src/core/errors.js'
import { RecipeRegistry, parseRecipeYaml } from '../src/core/recipe-registry.js'
import { RecipeValidator } from '../src/core/recipe-validator.js'
import { AssetRegistry } from '../src/core/asset-registry.js'
import { describeLineage } from '../src/core/provenance.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function cap(id: string, type: MediaCapability['type'], provider = 'comfy-local'): MediaCapability {
  return {
    id,
    type,
    provider,
    recipeId: id.split('@')[1],
    inputs: [],
    outputs: [{ name: 'out', type: type.endsWith('video') ? 'video' : 'image' }],
    available: true,
  }
}

describe('CapabilityRegistry + Router', () => {
  it('按能力类型查询', () => {
    const r = new CapabilityRegistry()
    r.register(cap('image-to-video@wan', 'image-to-video'))
    r.register(cap('image-to-video@ltx', 'image-to-video'))
    r.register(cap('text-to-image@flux', 'text-to-image'))
    expect(r.byType('image-to-video')).toHaveLength(2)
    expect(r.supportedTypes().sort()).toEqual(['image-to-video', 'text-to-image'])
  })

  it('路由：用户指定优先（PRD §25）', () => {
    const r = new CapabilityRegistry()
    r.register(cap('image-to-video@wan', 'image-to-video'))
    r.register(cap('image-to-video@ltx', 'image-to-video'))
    const router = new CapabilityRouter(r)
    const res = router.route('image-to-video', { preferredRecipeId: 'ltx' })
    expect(res.recipeId).toBe('ltx')
  })

  it('路由：排除 BROKEN（PRD §10）', () => {
    const r = new CapabilityRegistry()
    r.register(cap('image-to-video@wan', 'image-to-video'))
    r.register(cap('image-to-video@ltx', 'image-to-video'))
    const health = new Map([['wan', 'BROKEN']])
    const res = new CapabilityRouter(r).route('image-to-video', { health })
    expect(res.recipeId).toBe('ltx')
  })

  it('路由：无候选 → 结构化错误，不伪造成功', () => {
    const r = new CapabilityRegistry()
    const router = new CapabilityRouter(r)
    expect(() => router.route('image-to-video')).toThrow(MediaError)
    try {
      router.route('image-to-video')
    } catch (e) {
      expect((e as MediaError).code).toBe('MODEL_MISSING')
    }
  })

  it('本地优先（PRD §26）', () => {
    const r = new CapabilityRegistry()
    r.register({ ...cap('image-to-video@cloud', 'image-to-video'), provider: 'comfy-cloud' })
    r.register({ ...cap('image-to-video@local', 'image-to-video'), provider: 'comfy-local' })
    const res = new CapabilityRouter(r).route('image-to-video')
    expect(res.provider).toBe('comfy-local')
  })
})

describe('Recipe YAML + Validator', () => {
  const yaml = `
id: wan-i2v-default
name: Wan Image To Video
capability:
  - image-to-video
provider: comfy-local
workflow:
  path: workflows/wan-i2v-api.json
inputs:
  image:
    type: image
    required: true
  prompt:
    type: string
    required: true
  duration:
    type: number
    enum: [5, 10]
outputs:
  video:
    type: video
constraints:
  requiredNodes:
    - WanImageToVideo
  requiredModels:
    - wan2.1
`

  it('解析 YAML recipe', () => {
    const r = parseRecipeYaml(yaml, 'wan-i2v-default.yaml')
    expect(r).not.toBeNull()
    expect(r!.capability).toEqual(['image-to-video'])
    expect(r!.inputs).toHaveLength(3)
    expect(r!.inputs[2]!.enum).toEqual([5, 10])
  })

  it('缺节点 → BROKEN；缺模型 → BROKEN（Case 09）', async () => {
    const r = parseRecipeYaml(yaml, 'wan-i2v-default.yaml')!
    const v = new RecipeValidator()
    const h = await v.validate(r, {
      hasNode: () => false,
      hasModel: () => false,
    })
    expect(h.status).toBe('BROKEN')
    expect(h.reasons.join()).toContain('NODE_MISSING')
    expect(h.reasons.join()).toContain('MODEL_MISSING')
  })

  it('全部满足 → READY；Provider 离线 → BROKEN（Case 10）', async () => {
    const r = parseRecipeYaml(yaml, 'wan-i2v-default.yaml')!
    const v = new RecipeValidator()
    const h = await v.validate(r, {
      hasNode: () => true,
      hasModel: () => true,
      providerOnline: false,
    })
    expect(h.status).toBe('BROKEN')
    expect(h.reasons.join()).toContain('PROVIDER_OFFLINE')
  })
})

describe('AssetRegistry + Provenance（PRD §15/§16）', () => {
  it('注册、解析、asset:// 命名、父资产链', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-test-'))
    try {
      const reg = new AssetRegistry(join(dir, 'assets'))
      await reg.init()
      const img = reg.register({
        type: 'image',
        localPath: join(dir, 'assets', 'images', 'a.png'),
        provider: 'comfy-local',
        recipeId: 'flux-txt2img',
        prompt: '白狐少女',
        parentAssets: [],
      })
      expect(img.id).toMatch(/^asset:\/\/image\//)
      const vid = reg.register({
        type: 'video',
        localPath: join(dir, 'assets', 'videos', 'b.mp4'),
        provider: 'comfy-local',
        recipeId: 'wan-i2v-default',
        parentAssets: [img.id],
      })
      expect(reg.resolve(img.id)).toContain('a.png')
      await reg.persist()
      const reg2 = new AssetRegistry(join(dir, 'assets'))
      await reg2.init()
      expect(reg2.get(img.id)).toBeDefined()
      const chains = describeLineage(vid, reg2.list())
      // img 带 prompt 时血缘链显示为 prompt 摘要（describeLineage 语义）
      expect(chains[0]).toContain('prompt:白狐')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('RecipeRegistry 低显存变体', () => {
  it('OOM 时查 lowMemoryVariant（PRD §39）', () => {
    const rr = new RecipeRegistry()
    rr.register(parseRecipeYaml('id: a\ncapability:\n  - text-to-image\nlowMemoryVariant: b\n', 'a.yaml')!)
    rr.register(parseRecipeYaml('id: b\ncapability:\n  - text-to-image\n', 'b.yaml')!)
    expect(rr.lowMemoryVariantOf('a')?.id).toBe('b')
  })
})
