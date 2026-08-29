import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunningHubProvider } from '../src/dsh/runninghub-provider.js'

const assetRegistry = {
  register: vi.fn(),
  persist: vi.fn(async () => undefined),
} as never

describe('RunningHub 区域路由', () => {
  afterEach(() => vi.restoreAllMocks())

  it('国际版 recipe 使用 .ai 基址、国际 Key，并在执行句柄中保留区域', async () => {
    // v2 模型端点的真实响应形态：无 code 字段，{taskId, status, errorCode, errorMessage}
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ taskId: 'task-global-1', status: 'QUEUED', errorCode: '', errorMessage: '', results: null }), { status: 200 }),
    )
    const provider = new RunningHubProvider({
      assetRegistry,
      resolveApiKey: (scope, region) => `${scope}-${region}`,
      resolveBaseUrl: (region) => (region === 'global' ? 'https://www.runninghub.ai' : 'https://www.runninghub.cn'),
    })

    const handle = await provider.execute({
      recipe: {
        id: 'rh-global-image',
        name: 'global image',
        capability: ['text-to-image'],
        provider: 'runninghub',
        run: { endpoint: 'rhart-image/f-2/text-to-image', region: 'global' },
        inputs: [{ name: 'prompt', type: 'string', required: true }],
        outputs: [{ name: 'output', type: 'image' }],
        health: { validateOnStartup: false },
      },
      inputs: { prompt: 'a fox' },
      defaults: {},
      assetInputs: {},
      workflowPath: '',
      taskId: 'task-1',
      stepId: 'step-1',
    })

    expect(handle.providerExecutionId).toBe('rh-global-v2:task-global-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.runninghub.ai/openapi/v2/rhart-image/f-2/text-to-image',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json', Authorization: 'Bearer enterprise-global' } }),
    )
  })
})
