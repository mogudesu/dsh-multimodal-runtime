/**
 * OpenRouter 模态不匹配 404 的错误映射单测。
 * 模型不支持请求的输出模态时（如文生图路由到纯文本模型），OpenRouter 返回
 * "No endpoints found that support the requested output modalities"——
 * 必须映射为 MODEL_MISSING（不可重试）+ 可执行的中文指引，避免智能体盲目重跑。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { OpenRouterProvider, collectMediaUrls } from '../src/dsh/openrouter-provider.js'
import type { AssetRegistry, Recipe } from '../src/core/index.js'
import { MediaError } from '../src/core/index.js'

const recipe: Recipe = {
  id: 'or-modality',
  name: 'modality test',
  capability: ['text-to-image'],
  provider: 'openrouter',
  run: { model: 'text-only-model' },
  inputs: [{ name: 'prompt', type: 'string', required: true }],
  outputs: [{ name: 'output', type: 'image' }],
  health: { validateOnStartup: false },
}

function makeProvider(): OpenRouterProvider {
  return new OpenRouterProvider({
    apiKey: 'k',
    assetRegistry: {
      register: (a: unknown) => a,
      persist: async () => {},
    } as unknown as AssetRegistry,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OpenRouter 模态 404 错误映射', () => {
  it('模态不匹配 404 → MODEL_MISSING + 中文指引 + 不可重试', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'No endpoints found that support the requested output modalities: image, text' },
        }),
        { status: 404 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe,
      workflowPath: '',
      inputs: { prompt: '少女壁纸' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('failed')
    expect(exec.error?.code).toBe('MODEL_MISSING')
    expect(exec.error?.retryable).toBe(false)
    expect(exec.error?.message).toContain('不支持图像输出')
    expect(exec.error?.message).toContain('text-only-model')
  })

  it('普通 404 → 保持 EXECUTION_FAILED 语义', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe,
      workflowPath: '',
      inputs: { prompt: 'x' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('failed')
    expect(exec.error?.code).toBe('EXECUTION_FAILED')
  })

  it('MediaError 直传字段完整（code/message/retryable）', () => {
    const e = new MediaError('MODEL_MISSING', 'x', { retryable: false })
    expect(e.code).toBe('MODEL_MISSING')
    expect(e.retryable).toBe(false)
  })
})

describe('OpenRouter 音频输出解析（message.audio 对象）', () => {
  it('message.audio={data,format} 裸 base64 → 补 data:audio/ 前缀', () => {
    const out: string[] = []
    collectMediaUrls(
      { choices: [{ message: { audio: { id: 'audio_1', data: 'QUJD', format: 'wav', transcript: '你好' } } }] },
      out,
    )
    expect(out).toEqual(['data:audio/wav;base64,QUJD'])
  })

  it('data 无 format 不误判（transcript 等纯文本字段不产出）', () => {
    const out: string[] = []
    collectMediaUrls({ message: { audio: { data: 'QUJD', transcript: '你好' } } }, out)
    expect(out).toEqual([])
  })

  it('音频模态请求体带 audio 参数（voice/format 可被 inputs 覆盖）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { audio: { data: 'QUJD', format: 'wav' } } }] }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const audioRecipe: Recipe = { ...recipe, capability: ['text-to-audio'], run: { model: 'openai/gpt-audio' } }
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe: audioRecipe,
      workflowPath: '',
      inputs: { prompt: '朗读测试', voice: 'verse' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('completed')
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(body['modalities']).toEqual(['audio', 'text'])
    expect(body['audio']).toEqual({ voice: 'verse', format: 'wav' })
  })

  it('图像模态请求体不带 audio 参数', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { images: [] } }] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe,
      workflowPath: '',
      inputs: { prompt: 'x' },
      assetInputs: {},
    })
    await p.waitFor(handle.providerExecutionId)
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(body['audio']).toBeUndefined()
    expect(body['modalities']).toEqual(['image', 'text'])
  })

  it('402 余额不足 → MODEL_MISSING + 充值指引', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'This request requires at least $0.50 in balance for audio output' } }),
        { status: 402 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe,
      workflowPath: '',
      inputs: { prompt: 'x' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('failed')
    expect(exec.error?.code).toBe('MODEL_MISSING')
    expect(exec.error?.retryable).toBe(false)
    expect(exec.error?.message).toContain('余额不足')
    expect(exec.error?.message).toContain('openrouter.ai/settings/credits')
  })
})

describe('OpenRouter TTS 端点 fallback（fish-audio 等 TTS 专用模型）', () => {
  const audioRecipe: Recipe = {
    ...recipe,
    capability: ['text-to-audio'],
    run: { model: 'fish-audio/s2.1-pro-free:free' },
  }

  /** chat/completions 404 modalities → audio/speech 200 音频字节 的分流 mock。 */
  function ttsFetchMock(speechStatus = 200, speechBody = 'ID3MP3DATA') {
    return vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes('/audio/speech')) {
        return new Response(speechStatus === 200 ? speechBody : JSON.stringify({ error: { message: 'speech failed' } }), {
          status: speechStatus,
          headers: { 'content-type': speechStatus === 200 ? 'audio/mpeg' : 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({
          error: { message: 'No endpoints found that support the requested output modalities: audio, text' },
        }),
        { status: 404 },
      )
    })
  }

  it('chat 404 → fallback /audio/speech 成功：产出 data:audio/mp3 URL（mp3 扩展名可识别为 audio）', async () => {
    const fetchMock = ttsFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe: audioRecipe,
      workflowPath: '',
      inputs: { prompt: '你好世界' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('completed')
    // 第二次 fetch 是 /audio/speech，body 含 prompt 文本与 mp3 格式
    const speechCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/audio/speech'))
    expect(speechCall).toBeTruthy()
    const speechBody = JSON.parse(String(speechCall?.[1]?.body)) as Record<string, unknown>
    expect(speechBody['input']).toBe('你好世界')
    expect(speechBody['response_format']).toBe('mp3')
    // 产出经 fetchOutputs 落盘为 .mp3 且类型 audio（复用 p 的 pending 任务）
    const assets = await p.fetchOutputs(handle.providerExecutionId, '/tmp/or-out', {
      provider: 'openrouter',
      recipeId: audioRecipe.id,
      prompt: '你好世界',
      parentAssets: [],
    })
    expect(assets.length).toBe(1)
    expect(assets[0]?.type).toBe('audio')
    expect(assets[0]?.localPath).toMatch(/\.mp3$/)
  })

  it('chat 404 且 speech 也失败 → MODEL_MISSING（文案不再断言模型不存在）', async () => {
    vi.stubGlobal('fetch', ttsFetchMock(500))
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe: audioRecipe,
      workflowPath: '',
      inputs: { prompt: 'x' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('failed')
    expect(exec.error?.code).toBe('MODEL_MISSING')
    expect(exec.error?.message).not.toContain('已下架')
    expect(exec.error?.message).toContain('TTS')
  })

  it('图像模态 404 不触发 TTS fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'No endpoints found that support the requested output modalities: image, text' } }),
        { status: 404 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const p = makeProvider()
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe,
      workflowPath: '',
      inputs: { prompt: 'x' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('failed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(exec.error?.message).toContain('不支持图像输出')
  })
})

describe('OpenRouter 视频异步 API', () => {
  it('文生视频：POST /videos 后轮询，完成时保留 unsigned_urls', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/videos') && init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'video-job-1', polling_url: 'https://openrouter.ai/api/v1/videos/video-job-1', status: 'pending' }), { status: 202 })
      }
      return new Response(JSON.stringify({
        id: 'video-job-1',
        status: 'completed',
        unsigned_urls: ['https://cdn.example/video-job-1.mp4'],
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const p = new OpenRouterProvider({
      apiKey: 'k',
      videoPollIntervalMs: 0,
      assetRegistry: {} as AssetRegistry,
    })
    const videoRecipe: Recipe = {
      ...recipe,
      capability: ['text-to-video'],
      run: { model: 'minimax/hailuo-3' },
      outputs: [{ name: 'output', type: 'video' }],
    }
    const handle = await p.execute({
      stepId: 'gen',
      taskId: 't1',
      recipe: videoRecipe,
      workflowPath: '',
      inputs: { prompt: '雨夜霓虹街道' },
      assetInputs: {},
    })
    const exec = await p.waitFor(handle.providerExecutionId)
    expect(exec.state).toBe('completed')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://openrouter.ai/api/v1/videos')
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(body.model).toBe('minimax/hailuo-3')
    expect(body.prompt).toBe('雨夜霓虹街道')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
