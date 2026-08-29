import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { importUserWorkflow, scanUserWorkflows, slugify } from '../src/dsh/user-workflows.js'
import { buildNodeInfoList } from '../src/dsh/runninghub-provider.js'
import { latestComfyPrompt, latestComfyQueuePrompt, mapRhEndpoints } from '../src/dsh/settings-gateway.js'
import { applyInputsToWorkflow, applyNodeMappingToWorkflow } from '../src/dsh/comfy-provider.js'
import type { WorkflowNodeMapping } from '../src/core/index.js'
import { MediaError } from '../src/core/index.js'

import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const WF = {
  '6': { class_type: 'CLIPTextEncode', inputs: { text: '' } },
  '10': { class_type: 'LoadImage', inputs: { image: '' } },
  '3': { class_type: 'EmptyLatentImage', inputs: { noise_seed: 0 } },
}

describe('用户自定义工作流导入/加载', () => {
  it('导入落盘 recipe + workflow，scan 可读回', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-uw-'))
    try {
      const uw = await importUserWorkflow(dir, {
        name: '我的 视频工作流',
        capability: ['text-to-video', 'image-to-video'],
        provider: 'runninghub',
        workflowJson: JSON.stringify(WF),
      })
      expect(uw.recipe.id).toBe(slugify('我的 视频工作流'))
      expect(uw.recipe.id.length).toBeGreaterThan(0)
      expect(uw.recipe.provider).toBe('runninghub')
      expect(uw.recipe.capability).toContain('text-to-video')
      expect(uw.recipe.nodeMapping).toBeUndefined()
      expect(uw.recipe.workflow?.path).toBeTruthy()

      const scanned = await scanUserWorkflows(dir)
      expect(scanned).toHaveLength(1)
      expect(scanned[0].recipe.id).toBe(uw.recipe.id)
      expect(scanned[0].recipe.provider).toBe('runninghub')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('setAsDefault 只作用于宿主层默认路由，不写入落盘 recipe', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-uw-'))
    try {
      await importUserWorkflow(dir, {
        name: 'default-flow',
        capability: ['text-to-image'],
        provider: 'runninghub',
        workflowJson: JSON.stringify(WF),
        setAsDefault: true,
      })
      const scanned = await scanUserWorkflows(dir)
      expect(scanned).toHaveLength(1)
      const raw = JSON.parse(await readFile(`${dir}/default-flow.recipe.json`, 'utf8')) as Record<string, unknown>
      expect(raw['setAsDefault']).toBeUndefined()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('nodeMapping 随导入持久化并可读回', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-uw-'))
    try {
      const mapping: WorkflowNodeMapping = { prompt: { node: '6' }, images: [{ node: '10' }] }
      await importUserWorkflow(dir, {
        name: 'mapped-flow',
        capability: ['image-to-video'],
        provider: 'runninghub',
        workflowJson: JSON.stringify(WF),
        nodeMapping: mapping,
      })
      const scanned = await scanUserWorkflows(dir)
      expect(scanned[0].mapping?.prompt?.node).toBe('6')
      expect(scanned[0].recipe.nodeMapping?.images?.[0]?.node).toBe('10')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('拒绝空名称 / 非法 JSON / 空能力', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-uw-'))
    try {
      const base = { name: 'x', capability: ['text-to-video'], workflowJson: '{}' }
      await expect(importUserWorkflow(dir, { ...base, name: '  ' })).rejects.toThrow(MediaError)
      await expect(importUserWorkflow(dir, { ...base, workflowJson: 'not-json' })).rejects.toThrow(MediaError)
      await expect(importUserWorkflow(dir, { ...base, capability: [] })).rejects.toThrow(MediaError)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('节点映射注入（纯函数）', () => {
  it('buildNodeInfoList：标量走 inputs、资产槽位走 uploads（image/image2...）', () => {
    const mapping: WorkflowNodeMapping = {
      prompt: { node: '6' },
      negativePrompt: { node: '7', field: 'text' },
      images: [{ node: '10' }, { node: '11', field: 'image' }],
      params: { seed: { node: '3', field: 'noise_seed' } },
    }
    const list = buildNodeInfoList(
      mapping,
      { prompt: '一只猫', negative_prompt: '模糊', seed: 42 },
      { image: 'a.png', image2: 'b.png' },
    )
    expect(list).toEqual([
      { nodeId: '6', fieldName: 'text', fieldValue: '一只猫' },
      { nodeId: '7', fieldName: 'text', fieldValue: '模糊' },
      { nodeId: '10', fieldName: 'image', fieldValue: 'a.png' },
      { nodeId: '11', fieldName: 'image', fieldValue: 'b.png' },
      { nodeId: '3', fieldName: 'noise_seed', fieldValue: '42' },
    ])
  })

  it('buildNodeInfoList 跳过空值槽位', () => {
    const list = buildNodeInfoList({ prompt: { node: '6' }, images: [{ node: '10' }] }, {}, {})
    expect(list).toEqual([])
  })

  it('applyNodeMappingToWorkflow：按映射写入字段且不修改模板原对象', () => {
    const mapping: WorkflowNodeMapping = {
      prompt: { node: '6' },
      images: [{ node: '10' }],
      params: { seed: { node: '3', field: 'noise_seed' } },
    }
    const res = applyNodeMappingToWorkflow(WF, mapping, { prompt: 'hello', seed: 7 }, { image: 'x.png' })
    expect(res.applied.length).toBeGreaterThan(0)
    expect(res.workflow['6'].inputs['text']).toBe('hello')
    expect(res.workflow['10'].inputs['image']).toBe('x.png')
    expect(res.workflow['3'].inputs['noise_seed']).toBe(7)
    // 深拷贝语义：模板不被污染
    expect(WF['6'].inputs['text']).toBe('')
    expect(WF['3'].inputs['noise_seed']).toBe(0)
  })

  it('applyNodeMappingToWorkflow 拒绝非 API 格式输入', () => {
    expect(() => applyNodeMappingToWorkflow([1, 2], {}, {}, {})).toThrow(MediaError)
  })
})
describe('RunningHub 应用/端点导入（batch-v2-03）', () => {
  it('appId 型导入：run.appId 落盘且可读回，不写 workflow 文件', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-app-'))
    try {
      const uw = await importUserWorkflow(dir, {
        name: 'rh app',
        capability: ['image-to-image'],
        provider: 'runninghub',
        appId: '18991234567',
        nodeMapping: { prompt: { node: '39', field: 'text' }, images: [{ node: '39', field: 'image' }] },
      })
      expect(uw.recipe.run?.appId).toBe('18991234567')
      expect(uw.recipe.workflow).toBeUndefined()
      expect(uw.recipe.nodeMapping?.prompt?.node).toBe('39')
      const scanned = await scanUserWorkflows(dir)
      expect(scanned).toHaveLength(1)
      expect(scanned[0].recipe.run?.appId).toBe('18991234567')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('endpoint 型导入：run.endpoint 落盘', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-ep-'))
    try {
      const uw = await importUserWorkflow(dir, {
        name: 'rh ep',
        capability: ['text-to-video'],
        provider: 'runninghub',
        endpoint: 'text-to-video',
      })
      expect(uw.recipe.run?.endpoint).toBe('text-to-video')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('runninghub 三形态缺一即拒（无 appId/endpoint/json）', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mmr-none-'))
    try {
      await expect(
        importUserWorkflow(dir, { name: 'x', capability: ['text-to-image'], provider: 'runninghub' }),
      ).rejects.toThrow(MediaError)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('应用 nodeInfo 兜底（defaultAppNodeInfo）', () => {
  it('无映射时 prompt→text、图片按序→image（约定 nodeId 39）', async () => {
    const { defaultAppNodeInfo } = await import('../src/dsh/runninghub-provider.js')
    const list = defaultAppNodeInfo({ prompt: '一只猫' }, { image: 'a.png', image2: 'b.png' })
    expect(list).toEqual([
      { nodeId: '39', fieldName: 'text', fieldValue: '一只猫' },
      { nodeId: '39', fieldName: 'image', fieldValue: 'a.png' },
      { nodeId: '39', fieldName: 'image', fieldValue: 'b.png' },
    ])
  })
})

describe('gateway 辅助函数（parseAppId / endpointCapability / buildAppNodeMapping）', () => {
  it('parseAppId：链接与纯 ID 均可，非法返回 null', async () => {
    const { parseAppId } = await import('../src/dsh/settings-gateway.js')
    expect(parseAppId('https://www.runninghub.cn/app/18991234567')).toBe('18991234567')
    expect(parseAppId('https://www.runninghub.cn/ai-detail/1950866462321876993')).toBe('1950866462321876993')
    expect(parseAppId('/run/ai-app/1950866462321876993')).toBe('1950866462321876993')
    expect(parseAppId('18991234567')).toBe('18991234567')
    expect(parseAppId('https://runninghub.cn/workflow/abc123')).toBeNull()
    expect(parseAppId('')).toBeNull()
  })

  it('endpointCapability：端点名推断能力', async () => {
    const { endpointCapability } = await import('../src/dsh/settings-gateway.js')
    expect(endpointCapability('image-to-video')).toBe('image-to-video')
    expect(endpointCapability('text-to-video')).toBe('text-to-video')
    expect(endpointCapability('tts')).toBe('text-to-audio')
    expect(endpointCapability('images/generation')).toBe('text-to-image')
  })

  it('buildAppNodeMapping：图片输入能力挂 image 槽', async () => {
    const { buildAppNodeMapping } = await import('../src/dsh/settings-gateway.js')
    const t2i = buildAppNodeMapping('text-to-image', '39')
    expect(t2i.images).toBeUndefined()
    const i2v = buildAppNodeMapping('image-to-video', '7')
    expect(i2v.prompt).toEqual({ node: '7', field: 'text' })
    expect(i2v.images).toEqual([{ node: '7', field: 'image' }])
  })
})

describe('OpenRouter 多模态（modalitiesOf / collectMediaUrls）', () => {
  it('modalitiesOf：音频能力 → audio 模态，其余 → image', async () => {
    const { modalitiesOf } = await import('../src/dsh/openrouter-provider.js')
    expect(modalitiesOf(['text-to-audio'])).toEqual(['audio', 'text'])
    expect(modalitiesOf(['video-to-audio', 'text-to-audio'])).toEqual(['audio', 'text'])
    expect(modalitiesOf(['text-to-image', 'image-to-image'])).toEqual(['image', 'text'])
    expect(modalitiesOf(['image-to-video'])).toEqual(['image', 'text'])
  })

  it('collectMediaUrls：images 数组 / data URL / 扩展名 URL 全收', async () => {
    const { collectMediaUrls } = await import('../src/dsh/openrouter-provider.js')
    const out: string[] = []
    collectMediaUrls(
      {
        images: [{ type: 'image_url', image_url: { url: 'https://cdn.x/y.png' } }],
        audio: { url: 'https://cdn.x/a.mp3' },
        content: 'data:audio/mp3;base64,AAAA',
      },
      out,
    )
    expect(out).toContain('https://cdn.x/y.png')
    expect(out).toContain('https://cdn.x/a.mp3')
    expect(out).toContain('data:audio/mp3;base64,AAAA')
  })

  it('collectMediaUrls：普通文本与网页链接不误收', async () => {
    const { collectMediaUrls } = await import('../src/dsh/openrouter-provider.js')
    const out: string[] = []
    collectMediaUrls({ content: '看看 https://example.com/page 介绍' }, out)
    expect(out).toEqual([])
  })
})
describe('RH Key 类型标签（batch-v2-04）', () => {
  it('rhApiTypeLabel：英文/中文/未知值映射', async () => {
    const { rhApiTypeLabel } = await import('../src/dsh/settings-gateway.js')
    expect(rhApiTypeLabel('ENTERPRISE_SHARED')).toBe('企业级-共享')
    expect(rhApiTypeLabel('shared')).toBe('企业级-共享')
    expect(rhApiTypeLabel('EXCLUSIVE')).toBe('企业级-独占')
    expect(rhApiTypeLabel('CONSUMER_MEMBER')).toBe('消费级-会员')
    expect(rhApiTypeLabel('')).toBe('未知类型')
    expect(rhApiTypeLabel('weird-type')).toBe('weird-type')
  })
})

describe('RH 端点目录（data/rh-endpoints.json，batch-v2-04）', () => {
  it('299 端点全部映射到内部 8 能力且字段完整', () => {
    const raw = readFileSync(join(projectRoot, 'data', 'rh-endpoints.json'), 'utf8')
    const catalog = JSON.parse(raw) as { count: number; endpoints: Array<{ endpoint: string; name: string; task: string; output: string; cap: string; pop: number }> }
    const VALID_CAPS = new Set([
      'text-to-image', 'image-to-image', 'text-to-video', 'image-to-video',
      'first-last-frame-video', 'multi-image-to-video', 'video-to-audio', 'text-to-audio',
    ])
    expect(catalog.endpoints.length).toBe(catalog.count)
    expect(catalog.endpoints.length).toBeGreaterThan(200)
    for (const e of catalog.endpoints) {
      expect(VALID_CAPS.has(e.cap)).toBe(true)
      expect(['image', 'video', 'audio']).toContain(e.output)
      expect(e.endpoint).toMatch(/^[\w./-]+$/)
      expect(e.name.length).toBeGreaterThan(0)
    }
  })
})

describe('latestComfyPrompt：/history 格式兼容', () => {
  const wf = {
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '' } },
    '10': { class_type: 'LoadImage', inputs: { image: '' } },
  }
  it('新版数组格式（prompt 为 [序号, promptId, workflow, extraData, outputs]）取 prompt 内工作流', () => {
    const hist = {
      aaa: { prompt: [1, 'aaa', wf, { extra_pnginfo: {} }, ['10']] },
    }
    expect(latestComfyPrompt(hist)).toEqual(wf)
  })
  it('旧版对象格式直接返回', () => {
    const hist = { bbb: { prompt: wf } }
    expect(latestComfyPrompt(hist)).toEqual(wf)
  })
  it('多条目取最近一条（插入序末尾）', () => {
    const wf2 = { '1': { class_type: 'KSampler', inputs: {} } }
    const hist = {
      a: { prompt: wf },
      b: { prompt: [2, 'b', wf2, {}, []] },
    }
    expect(latestComfyPrompt(hist)).toEqual(wf2)
  })
  it('垃圾输入返回 null（字符串数组/空对象/非对象）', () => {
    expect(latestComfyPrompt({ x: { prompt: ['pid', 'str'] } })).toBeNull()
    expect(latestComfyPrompt({ x: { prompt: {} } })).toBeNull()
    expect(latestComfyPrompt(null)).toBeNull()
    expect(latestComfyPrompt([1, 2])).toBeNull()
  })
})

describe('latestComfyQueuePrompt：/queue 兜底', () => {
  const wf = { '6': { class_type: 'CLIPTextEncode', inputs: { text: '' } } }
  const wf2 = { '3': { class_type: 'KSampler', inputs: {} } }
  it('运行中队列首项被解析（item[2] 为工作流）', () => {
    const q = { queue_running: [[1, 'aaa', wf, {}, []]], queue_pending: [] }
    expect(latestComfyQueuePrompt(q)).toEqual(wf)
  })
  it('运行中优先于排队', () => {
    const q = { queue_running: [[2, 'b', wf2, {}, []]], queue_pending: [[1, 'a', wf, {}, []]] }
    expect(latestComfyQueuePrompt(q)).toEqual(wf2)
  })
  it('运行中为空时取排队首项', () => {
    const q = { queue_running: [], queue_pending: [[1, 'a', wf, {}, []]] }
    expect(latestComfyQueuePrompt(q)).toEqual(wf)
  })
  it('垃圾输入返回 null', () => {
    expect(latestComfyQueuePrompt(null)).toBeNull()
    expect(latestComfyQueuePrompt([1, 2])).toBeNull()
    expect(latestComfyQueuePrompt({ queue_running: 'x' })).toBeNull()
    expect(latestComfyQueuePrompt({ queue_running: [['pid', 'str']] })).toBeNull()
  })
})

describe('mapRhEndpoints：官方目录映射', () => {
  const raw = {
    version: '2026-08-25',
    endpoints: [
      { endpoint: 'foo/text-to-image', name_cn: 'Foo 文生图', task: 'text-to-image', output_type: 'image', popularity: 3 },
      { endpoint: 'bar/lip-sync', name_cn: 'Bar 对口型', task: 'lip-sync-video', output_type: 'string', popularity: 1 },
      { endpoint: 'old/[Deprecated]', name_cn: '旧端点', task: 'text-to-image', output_type: 'image', popularity: 1 },
      { endpoint: 'x/text-to-3d', name_cn: '3D', task: 'text-to-3d', output_type: 'string', popularity: 1 },
    ],
  }
  const cat = mapRhEndpoints(raw)
  it('task→cap 映射 + [Deprecated] 与不可映射 task 过滤', () => {
    expect(cat.count).toBe(2)
    expect(cat.endpoints.map((e) => e.endpoint)).toEqual(['bar/lip-sync', 'foo/text-to-image'])
    expect(cat.endpoints[0].cap).toBe('video-to-audio')
    expect(cat.endpoints[0].output).toBe('audio')
    expect(cat.endpoints[1].cap).toBe('text-to-image')
  })
  it('按 pop 升序排序', () => {
    expect(cat.endpoints[0].pop).toBeLessThanOrEqual(cat.endpoints[1].pop)
  })
  it('空/垃圾输入返回空目录', () => {
    expect(mapRhEndpoints(null).count).toBe(0)
    expect(mapRhEndpoints({ endpoints: 'x' }).count).toBe(0)
  })
})

describe('applyInputsToWorkflow 提示词兜底注入', () => {
  it('当工作流使用 CR Prompt Text 时能成功注入 prompt', () => {
    const raw = {
      '1': { class_type: 'LoadImage', inputs: { image: 'old.png' } },
      '19': { class_type: 'CR Prompt Text', inputs: { prompt: '旧提示词' } },
    }
    const res = applyInputsToWorkflow(raw, { prompt: '新二次元角色CG' })
    expect(res.applied).toContain('prompt')
    expect((res.workflow['19']?.inputs as Record<string, unknown>)?.prompt).toBe('新二次元角色CG')
  })
})

describe('applyInputsToWorkflow ResolutionSelector 枚举适配', () => {
  const wfWithSelector = (cur: string) => ({
    '16': { class_type: 'ResolutionSelector', inputs: { aspect_ratio: cur, megapixels: 0.4 } },
    '19': { class_type: 'CR Prompt Text', inputs: { prompt: '旧' } },
  })

  it('裸比例 9:16 映射到已装合法枚举标签', () => {
    const res = applyInputsToWorkflow(wfWithSelector('16:9 (Widescreen)'), { aspect_ratio: '9:16' })
    expect((res.workflow['16']?.inputs as Record<string, unknown>)?.aspect_ratio).toBe('9:16 (Portrait Widescreen)')
  })

  it('旧标签 9:16 (Vertical) 归一化到已装合法枚举标签', () => {
    const res = applyInputsToWorkflow(wfWithSelector('16:9 (Widescreen)'), { aspect_ratio: '9:16 (Vertical)' })
    expect((res.workflow['16']?.inputs as Record<string, unknown>)?.aspect_ratio).toBe('9:16 (Portrait Widescreen)')
  })

  it('节点当前值比例与目标一致时保持原标签不覆盖', () => {
    const res = applyInputsToWorkflow(wfWithSelector('9:16 (Portrait Widescreen)'), { aspect_ratio: '9:16 (Vertical)' })
    expect((res.workflow['16']?.inputs as Record<string, unknown>)?.aspect_ratio).toBe('9:16 (Portrait Widescreen)')
  })

  it('裸比例 4:3 / 3:4 / 21:9 映射到带标签枚举', () => {
    expect((applyInputsToWorkflow(wfWithSelector('16:9 (Widescreen)'), { aspect_ratio: '4:3' }).workflow['16']?.inputs as Record<string, unknown>)?.aspect_ratio).toBe('4:3 (Standard)')
    expect((applyInputsToWorkflow(wfWithSelector('16:9 (Widescreen)'), { aspect_ratio: '3:4' }).workflow['16']?.inputs as Record<string, unknown>)?.aspect_ratio).toBe('3:4 (Portrait Standard)')
    expect((applyInputsToWorkflow(wfWithSelector('16:9 (Widescreen)'), { aspect_ratio: '21:9' }).workflow['16']?.inputs as Record<string, unknown>)?.aspect_ratio).toBe('21:9 (Ultrawide)')
  })
})
