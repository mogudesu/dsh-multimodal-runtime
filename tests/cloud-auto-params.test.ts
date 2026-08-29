import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { importUserWorkflow } from '../src/dsh/user-workflows.js'
import { applyExposedDefaults, endpointAssetSlots } from '../src/dsh/runninghub-provider.js'
import { buildAppAutoMapping, mapRhCatalogParams, openRouterAutoParams, parseRhSwitchOptions, inferOpenRouterCapability, requiredAssetCheck } from '../src/dsh/settings-gateway.js'

describe('RH 应用 apiCallDemo 全字段自动映射（buildAppAutoMapping）', () => {
  it('资产/提示词进槽位，数值/枚举参数进 params + exposedParams', () => {
    const built = buildAppAutoMapping([
      { nodeId: '2', fieldName: 'video', fieldValue: '' },
      { nodeId: '68', fieldName: 'image', fieldValue: '' },
      { nodeId: '85', fieldName: 'seconds', fieldValue: '10' },
      { nodeId: '88', fieldName: 'resolution', fieldValue: '720p' },
    ])
    expect(built.mapping.videos).toEqual([{ node: '2', field: 'video' }])
    expect(built.mapping.images).toEqual([{ node: '68', field: 'image' }])
    // duration-like（seconds）统一挂 duration 键：前端时长滑块 inputs.duration 直接命中
    expect(built.mapping.params?.['duration']).toEqual({ node: '85', field: 'seconds' })
    expect(built.mapping.params?.['resolution']).toEqual({ node: '88', field: 'resolution' })
    expect(built.mapping.exposedParams).toEqual([
      { id: 'app-duration-85', label: 'seconds', nodeId: '85', field: 'duration', type: 'number', default: 10 },
      { id: 'app-resolution-88', label: 'resolution', nodeId: '88', field: 'resolution', type: 'text', default: '720p' },
    ])
    // 图+视频混合输入 → 专用能力
    expect(built.capability).toBe('image-and-video-to-video')
  })

  it('纯数值参数应用（无资产）不推断能力，prompt 字段不进暴露参数', () => {
    const built = buildAppAutoMapping([
      { nodeId: '39', fieldName: 'text', fieldValue: '' },
      { nodeId: '50', fieldName: 'strength', fieldValue: '0.8' },
    ])
    expect(built.mapping.prompt).toEqual({ node: '39', field: 'text' })
    expect(built.mapping.exposedParams).toEqual([
      { id: 'app-strength-50', label: 'strength', nodeId: '50', field: 'strength', type: 'number', default: 0.8 },
    ])
    expect(built.capability).toBeUndefined()
  })

  it('垃圾输入容错（非数组/空字段项跳过）', () => {
    expect(buildAppAutoMapping(undefined).mapping).toEqual({})
    expect(buildAppAutoMapping([null, { nodeId: '', fieldName: '' }, { nodeId: '1' }]).mapping).toEqual({})
  })

  it('fieldType + description 识别（真实 apiCallDemo：fieldName 通用 value 靠 description 区分）', () => {
    const built = buildAppAutoMapping([
      { nodeId: '2', fieldName: 'video', fieldType: 'VIDEO', fieldValue: 'x.mp4', description: '上传表情视频' },
      { nodeId: '68', fieldName: 'image', fieldType: 'IMAGE', fieldValue: 'x.png', description: '上传人物图' },
      { nodeId: '85', fieldName: 'value', fieldType: 'INT', fieldValue: '10', description: '生成秒数（越多越慢）' },
      { nodeId: '88', fieldName: 'value', fieldType: 'INT', fieldValue: '1024', description: '分辨率（最长边）' },
    ])
    // 资产走 fieldType，不进参数列表
    expect(built.mapping.videos).toEqual([{ node: '2', field: 'video' }])
    expect(built.mapping.images).toEqual([{ node: '68', field: 'image' }])
    // 两个 fieldName 都是 value，靠 description 派生为 duration / resolution，互不覆盖
    expect(built.mapping.params?.['duration']).toEqual({ node: '85', field: 'value' })
    expect(built.mapping.params?.['resolution']).toEqual({ node: '88', field: 'value' })
    expect(built.mapping.exposedParams).toEqual([
      { id: 'app-duration-85', label: '生成秒数', nodeId: '85', field: 'duration', type: 'number', default: 10 },
      { id: 'app-resolution-88', label: '分辨率', nodeId: '88', field: 'resolution', type: 'number', default: 1024 },
    ])
    expect(built.capability).toBe('image-and-video-to-video')
  })

  it('超分视频应用（仅 video + SWITCH 枚举）→ video-upscale + select optionValues', () => {
    const built = buildAppAutoMapping([
      { nodeId: '19', fieldName: 'video', fieldType: 'VIDEO', fieldValue: 'x.mp4', description: 'video' },
      { nodeId: '20', fieldName: 'select', fieldType: 'SWITCH', fieldValue: '1', description: 'select', fieldData: JSON.stringify([{ name: 'input2', index: 2, description: '放大4倍' }, { name: 'input1', index: 1, description: '放大2倍' }]) },
    ], '【视频放大硬件之光】NVIDIA RTX VSR 底层硬件级视界增强视频放大')
    expect(built.mapping.videos).toEqual([{ node: '19', field: 'video' }])
    expect(built.capability).toBe('video-upscale')
    // SWITCH 枚举 → select，options 显示 label、optionValues 提交 index
    expect(built.mapping.exposedParams).toEqual([
      { id: 'app-select-20', label: 'select', nodeId: '20', field: 'select', type: 'select', options: ['放大4倍', '放大2倍'], optionValues: ['2', '1'], default: '1' },
    ])
  })
})

describe('RH SWITCH 枚举解析（parseRhSwitchOptions）', () => {
  it('解析 fieldData 字符串枚举 → options/optionValues/default', () => {
    const sw = parseRhSwitchOptions(JSON.stringify([{ name: 'input2', index: 2, description: '放大4倍' }, { name: 'input1', index: 1, description: '放大2倍' }]), '1')
    expect(sw).toEqual({ options: ['放大4倍', '放大2倍'], optionValues: ['2', '1'], default: '1' })
  })
  it('非法 fieldData 返回 null', () => {
    expect(parseRhSwitchOptions('not-json', '1')).toBeNull()
    expect(parseRhSwitchOptions(null, '1')).toBeNull()
    expect(parseRhSwitchOptions('[]', '1')).toBeNull()
  })
})

describe('OpenRouter 未收录模型启发式推断（inferOpenRouterCapability）', () => {
  it('按模型名关键词推断能力', () => {
    expect(inferOpenRouterCapability('deepgram/flux-tts:free')).toBe('text-to-audio')
    expect(inferOpenRouterCapability('suno/music-v1')).toBe('text-to-music')
    expect(inferOpenRouterCapability('kling/video-1')).toBe('text-to-video')
    expect(inferOpenRouterCapability('google/gemini-2.5-flash-image')).toBe('text-to-image')
    expect(inferOpenRouterCapability('some/unknown')).toBe('text-to-image')
  })
})

describe('素材-能力匹配校验（requiredAssetCheck）', () => {
  it('仅收视频能力：带图无视频 → 素材不匹配；无视频 → 需要视频；有视频 → 通过', () => {
    expect(requiredAssetCheck('video-upscale', { imageCount: 1, videoCount: 0 })).toContain('素材不匹配')
    expect(requiredAssetCheck('video-upscale', { imageCount: 0, videoCount: 0 })).toContain('需要输入视频')
    expect(requiredAssetCheck('video-upscale', { imageCount: 0, videoCount: 1 })).toBeNull()
    expect(requiredAssetCheck('video-to-audio', { imageCount: 0, videoCount: 2 })).toBeNull()
  })
  it('图+视频能力：缺任一明确告知缺什么；齐全通过', () => {
    expect(requiredAssetCheck('image-and-video-to-video', { imageCount: 0, videoCount: 0 })).toContain('同时输入图片和视频')
    expect(requiredAssetCheck('image-and-video-to-video', { imageCount: 1, videoCount: 0 })).toContain('还需要输入视频')
    expect(requiredAssetCheck('image-and-video-to-video', { imageCount: 0, videoCount: 1 })).toContain('还需要输入图片')
    expect(requiredAssetCheck('image-and-video-to-video', { imageCount: 1, videoCount: 1 })).toBeNull()
  })
  it('仅收图片能力：带视频无图片 → 素材不匹配；宽松能力不校验', () => {
    expect(requiredAssetCheck('image-upscale', { imageCount: 0, videoCount: 1 })).toContain('素材不匹配')
    expect(requiredAssetCheck('remove-background', { imageCount: 0, videoCount: 0 })).toContain('需要输入图片')
    expect(requiredAssetCheck('image-to-3d', { imageCount: 1, videoCount: 0 })).toBeNull()
    // 宽松能力（工作流内置默认图可跑）：不校验
    expect(requiredAssetCheck('image-to-video', { imageCount: 0, videoCount: 0 })).toBeNull()
    expect(requiredAssetCheck('text-to-image', { imageCount: 0, videoCount: 0 })).toBeNull()
    expect(requiredAssetCheck('text-to-video', { imageCount: 2, videoCount: 0 })).toBeNull()
  })
})

describe('RH 官方目录端点参数映射（mapRhCatalogParams）', () => {
  it('LIST/INT/STRING/BOOLEAN/IMAGE 全类型覆盖（真实 capabilities.json 形状）', () => {
    const { inputs, exposedParams } = mapRhCatalogParams([
      { key: 'text_prompt', type: 'STRING', required: true, maxLength: 3000 },
      { key: 'format', type: 'LIST', required: false, options: ['wav', 'mp3', 'pcm'], default: 'wav' },
      { key: 'speech_rate', type: 'INT', required: true, default: 0 },
      { key: 'sample_rate', type: 'STRING', required: false, default: '24000' },
      { key: 'enable_enhance', type: 'BOOLEAN', required: false, default: true },
      { key: 'image_url', type: 'IMAGE', required: false, maxSizeMB: 10 },
    ])
    // prompt-like STRING 不进暴露参数，但保留 inputs schema（prompt 别名注入）
    expect(inputs.find((i) => i.name === 'text_prompt')?.type).toBe('string')
    expect(exposedParams.find((p) => p.field === 'text_prompt')).toBeUndefined()
    expect(inputs.find((i) => i.name === 'format')?.enum).toEqual(['wav', 'mp3', 'pcm'])
    expect(exposedParams.find((p) => p.field === 'format')).toMatchObject({ type: 'select', options: ['wav', 'mp3', 'pcm'], default: 'wav' })
    expect(inputs.find((i) => i.name === 'speech_rate')?.type).toBe('number')
    expect(exposedParams.find((p) => p.field === 'speech_rate')).toMatchObject({ type: 'number', default: 0 })
    expect(exposedParams.find((p) => p.field === 'sample_rate')).toMatchObject({ type: 'text', default: '24000' })
    expect(inputs.find((i) => i.name === 'enable_enhance')?.type).toBe('boolean')
    expect(exposedParams.find((p) => p.field === 'enable_enhance')).toMatchObject({ type: 'select', options: ['true', 'false'], default: 'true' })
    // IMAGE 只进 inputs，不进暴露参数
    expect(inputs.find((i) => i.name === 'image_url')?.type).toBe('image')
    expect(exposedParams.find((p) => p.field === 'image_url')).toBeUndefined()
    // 基础 prompt schema 始终存在
    expect(inputs[0]).toMatchObject({ name: 'prompt', type: 'string' })
  })

  it('垃圾输入容错', () => {
    expect(mapRhCatalogParams(undefined).inputs).toHaveLength(2)
    expect(mapRhCatalogParams([null, { key: '', type: 'INT' }]).exposedParams).toHaveLength(0)
  })
})

describe('OpenRouter 模型参数自动推导（openRouterAutoParams）', () => {
  it('视频模型：duration/aspect_ratio/resolution', () => {
    const { inputs, exposedParams } = openRouterAutoParams('text-to-video')
    expect(exposedParams.find((p) => p.field === 'duration')).toMatchObject({ type: 'slider', min: 1, max: 20, default: 5 })
    expect(exposedParams.find((p) => p.field === 'aspect_ratio')).toMatchObject({ type: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' })
    expect(exposedParams.find((p) => p.field === 'resolution')).toMatchObject({ type: 'select', options: ['480p', '720p', '1080p'], default: '720p' })
    expect(inputs.find((i) => i.name === 'resolution')?.enum).toEqual(['480p', '720p', '1080p'])
  })

  it('音频模型：voice/format；图像模型：无参数', () => {
    const audio = openRouterAutoParams('text-to-audio')
    expect(audio.exposedParams.find((p) => p.field === 'voice')).toMatchObject({ type: 'select', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], default: 'alloy' })
    expect(audio.exposedParams.find((p) => p.field === 'format')).toMatchObject({ type: 'select', options: ['wav', 'mp3'], default: 'wav' })
    const image = openRouterAutoParams('text-to-image')
    expect(image.exposedParams).toHaveLength(0)
  })

  it('图生视频能力补 image 输入', () => {
    const { inputs } = openRouterAutoParams('image-to-video')
    expect(inputs.find((i) => i.name === 'image')?.type).toBe('image')
  })
})

describe('暴露参数默认值补齐（applyExposedDefaults）', () => {
  it('缺失/空值键用 default 兜底，已有值不覆盖', () => {
    const effective: Record<string, unknown> = { duration: 8, format: '' }
    applyExposedDefaults(
      {
        exposedParams: [
          { id: '1', label: '时长', nodeId: '', field: 'duration', type: 'number', default: 5 },
          { id: '2', label: '格式', nodeId: '', field: 'format', type: 'select', default: 'wav' },
          { id: '3', label: '比例', nodeId: '', field: 'aspect_ratio', type: 'select', default: '16:9' },
        ],
      },
      effective,
    )
    expect(effective).toEqual({ duration: 8, format: 'wav', aspect_ratio: '16:9' })
  })

  it('无 exposedParams / 非法条目容错', () => {
    const effective: Record<string, unknown> = {}
    applyExposedDefaults(undefined, effective)
    applyExposedDefaults({ exposedParams: [null, { id: 'x', label: 'x', nodeId: '', field: '', type: 'text' }] }, effective)
    expect(effective).toEqual({})
  })
})

describe('端点资产对位（endpointAssetSlots）', () => {
  it('第 n 个同类 schema ↔ 第 n 个同类资产槽位（按 slot 序号）', () => {
    const schemas = [
      { name: 'image_url', type: 'image' },
      { name: 'second_image', type: 'image' },
      { name: 'video_url', type: 'video' },
    ]
    const assets = { image10: '/a/10.png', image2: '/a/2.png', image: '/a/1.png', video: '/a/v.mp4' }
    expect(endpointAssetSlots(schemas, assets)).toEqual([
      { name: 'image_url', localPath: '/a/1.png' },
      { name: 'second_image', localPath: '/a/2.png' },
      { name: 'video_url', localPath: '/a/v.mp4' },
    ])
  })

  it('资产多于 schema 时多余资产忽略；无资产返回空', () => {
    expect(endpointAssetSlots([{ name: 'image_url', type: 'image' }], { image: '/1.png', image2: '/2.png' })).toEqual([
      { name: 'image_url', localPath: '/1.png' },
    ])
    expect(endpointAssetSlots([{ name: 'image_url', type: 'image' }], {})).toEqual([])
  })
})

describe('importUserWorkflow inputs 透传', () => {
  it('云端端点导入携带自定义 inputs（缺省 defaultInputs 不变）', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-cap-'))
    try {
      await importUserWorkflow(dir, {
        name: 'rh-ep-test',
        capability: ['text-to-audio'],
        provider: 'runninghub',
        endpoint: 'bytedance/doubao-seed-audio-1.0',
        inputs: [
          { name: 'prompt', type: 'string', required: true },
          { name: 'speech_rate', type: 'number' },
          { name: 'audio_url', type: 'audio' },
        ],
      })
      const raw = JSON.parse(await readFile(join(dir, 'rh-ep-test.recipe.json'), 'utf8')) as Record<string, unknown>
      const inputs = raw['inputs'] as Array<Record<string, unknown>>
      expect(inputs).toHaveLength(3)
      expect(inputs.find((i) => i['name'] === 'speech_rate')?.['type']).toBe('number')
      expect(inputs.find((i) => i['name'] === 'audio_url')?.['type']).toBe('audio')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('不传 inputs 时保持 defaultInputs 约定', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-cap-'))
    try {
      await importUserWorkflow(dir, {
        name: 'rh-ep-default',
        capability: ['text-to-image'],
        provider: 'runninghub',
        endpoint: 'text-to-image',
      })
      const raw = JSON.parse(await readFile(join(dir, 'rh-ep-default.recipe.json'), 'utf8')) as Record<string, unknown>
      const inputs = raw['inputs'] as Array<Record<string, unknown>>
      expect(inputs.find((i) => i['name'] === 'prompt')).toBeTruthy()
      expect(inputs.find((i) => i['name'] === 'width')).toBeTruthy()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
