/**
 * OpenRouterProvider - 图像/音频使用 chat/completions，视频使用专用异步 /videos API。
 * execute 发起请求立即返回句柄，waitFor 等待 settle，fetchOutputs 把输出落盘并登记 Asset。
 * 模型名来自 recipe.run.model 或 inputs.model。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { MediaAsset, MediaCapability, MediaExecution, MediaExecutionState } from '../core/index.js'
import { MediaError } from '../core/index.js'
import type { AssetRegistry, RecipeRegistry } from '../core/index.js'
import type { MediaExecutionHandle, MediaExecutionRequest, ProviderHealth } from './comfy-provider.js'
import type { FetchOutputsMeta, MediaProvider } from './media-provider.js'
import { extFromUrlOrType } from './media-provider.js'
import { applyExposedDefaults } from './runninghub-provider.js'

export interface OpenRouterProviderOptions {
  apiKey?: string
  /** 动态取 Key（管理页保存后热生效，优先于静态 apiKey）。 */
  resolveApiKey?: () => string | undefined
  baseUrl?: string
  assetRegistry: AssetRegistry
  /** 单次请求上限（默认 600s）。 */
  requestTimeoutMs?: number
  /** 视频任务轮询间隔（默认 10s；测试和嵌入式宿主可设为 0）。 */
  videoPollIntervalMs?: number
}

interface PendingJob {
  state: MediaExecutionState
  error?: string
  errObj?: unknown
  mediaUrls?: string[]
  mediaType?: MediaAsset['type']
  promise?: Promise<void>
}

function strOf(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}


/** 能力 → OpenRouter modalities：音频能力用 audio 模态，其余（图像/视频）统一 image 模态。 */
export function modalitiesOf(caps: string[]): string[] {
  return caps.some((c) => c.includes('audio')) ? ['audio', 'text'] : ['image', 'text']
}

/** 深扫 message：收集 images[].image_url.url、audio 字段与 data:/http(s) 媒体 URL（按扩展名判定）。 */
export function collectMediaUrls(v: unknown, out: string[]): void {
  if (Array.isArray(v)) {
    for (const x of v) collectMediaUrls(x, out)
    return
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (o['image_url'] && typeof o['image_url'] === 'object') {
      const u = strOf(o['image_url'], ['url'])
      if (u) out.push(u)
    }
    // OpenAI 系音频输出对象：message.audio = { id, data: <base64>, transcript, format }
    // data 是裸 base64（无 data: 前缀），靠 data+format 字段对识别后补前缀。
    if (
      typeof o['data'] === 'string' && o['data'].length > 0 &&
      typeof o['format'] === 'string' && o['format'].length > 0
    ) {
      out.push(`data:audio/${o['format']};base64,${o['data']}`)
    }
    for (const x of Object.values(o)) collectMediaUrls(x, out)
    return
  }
  if (
    typeof v === 'string' &&
    /^(data:(image|audio|video)\/|https?:\/\/\S+\.(png|jpe?g|webp|gif|mp3|wav|m4a|ogg|aac|flac|mp4|webm|mov)(\?\S*)?$)/i.test(v)
  ) {
    out.push(v)
  }
}
function mimeOf(path: string): string {
  const m = path.match(/\.([a-z0-9]+)$/i)
  const ext = m?.[1]?.toLowerCase() ?? 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'm4a') return 'audio/mp4'
  if (ext === 'ogg') return 'audio/ogg'
  if (ext === 'aac') return 'audio/aac'
  if (ext === 'flac') return 'audio/flac'
  if (ext === 'mp4') return 'video/mp4'
  if (ext === 'webm') return 'video/webm'
  if (ext === 'mov') return 'video/quicktime'
  return 'image/png'
}

async function toDataUrl(localPath: string): Promise<string> {
  const buf = await readFile(localPath).catch(() => {
    throw new MediaError('OUTPUT_MISSING', `资产文件不可读: ${localPath}`, { retryable: false })
  })
  return `data:${mimeOf(localPath)};base64,${Buffer.from(buf).toString('base64')}`
}

function inferMediaType(path: string): MediaAsset['type'] {
  if (/\.(mp4|mov|webm|mkv|avi)$/i.test(path)) return 'video'
  if (/\.(wav|mp3|flac|m4a|ogg|aac)$/i.test(path)) return 'audio'
  return 'image'
}

export class OpenRouterProvider implements MediaProvider {
  readonly id = 'openrouter'
  private readonly baseUrl: string
  private readonly requestTimeoutMs: number
  private readonly videoPollIntervalMs: number
  private readonly pending = new Map<string, PendingJob>()
  private seq = 0

  constructor(private readonly opts: OpenRouterProviderOptions) {
    this.baseUrl = (opts.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 10 * 60 * 1000
    this.videoPollIntervalMs = Math.max(0, opts.videoPollIntervalMs ?? 10_000)
  }

  /** 现取 Key：管理页保存 / 环境变量变化后无需重启即生效。 */
  private key(): string | undefined {
    return this.opts.resolveApiKey?.() ?? this.opts.apiKey
  }

  async healthCheck(): Promise<ProviderHealth> {
    const apiKey = this.key()
    if (!apiKey) {
      return { online: false, detail: '未配置 OpenRouter API Key（管理页填写或设环境变量 OPENROUTER_API_KEY）' }
    }
    try {
      const res = await fetch(`${this.baseUrl}/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) {
        return { online: false, detail: `OpenRouter /key HTTP ${res.status}` }
      }
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const info = (json['data'] ?? {}) as Record<string, unknown>
      return { online: true, detail: strOf(info, ['label']) ?? 'key 有效', serverInfo: info }
    } catch (err) {
      return { online: false, detail: err instanceof Error ? err.message : String(err) }
    }
  }

  async getCapabilities(recipes: RecipeRegistry): Promise<MediaCapability[]> {
    const caps: MediaCapability[] = []
    for (const r of recipes.list()) {
      if (r.provider !== this.id) continue
      for (const type of r.capability) {
        caps.push({
          id: `${type}@${r.id}`,
          type,
          provider: this.id,
          recipeId: r.id,
          inputs: r.inputs,
          outputs: r.outputs,
          available: Boolean(this.key()),
          constraints: r.constraints,
        })
      }
    }
    return caps
  }

  async execute(request: MediaExecutionRequest): Promise<MediaExecutionHandle> {
    if (!this.key()) {
      throw new MediaError('MODEL_MISSING', 'OpenRouter API Key 未配置（管理页或环境变量 OPENROUTER_API_KEY）', {
        retryable: false,
      })
    }
    const effective: Record<string, unknown> = { ...(request.defaults ?? {}) }
    for (const [k, v] of Object.entries(request.inputs ?? {})) {
      if (v !== undefined && v !== null) effective[k] = v
    }
    // 暴露参数默认值补齐（导入模型时自动解析出的 voice/format/duration 等）。
    applyExposedDefaults(request.recipe.nodeMapping, effective)
    const model =
      request.recipe.run?.model ?? (typeof effective['model'] === 'string' ? effective['model'] : undefined)
    if (!model) {
      throw new MediaError('MODEL_MISSING', `Recipe ${request.recipe.id} 未指定 OpenRouter 模型（recipe.run.model 或 inputs.model）`, {
        retryable: false,
      })
    }
    const id = `or-${++this.seq}`
    const isVideo = request.recipe.capability.some((c) => c.includes('video') && !c.includes('video-to-audio'))
    const job: PendingJob = {
      state: 'running',
      mediaType: isVideo ? 'video' : modalitiesOf(request.recipe.capability).includes('audio') ? 'audio' : 'image',
    }
    this.pending.set(id, job)
    let runPromise: Promise<string[]>
    if (isVideo) {
      runPromise = this.runVideo(model, request.recipe.capability, effective, Object.values(request.assetInputs))
    } else {
      const content: Array<Record<string, unknown>> = [{ type: 'text', text: String(effective['prompt'] ?? '') }]
      for (const p of Object.values(request.assetInputs)) {
        content.push({ type: 'image_url', image_url: { url: await toDataUrl(p) } })
      }
      const mods = modalitiesOf(request.recipe.capability)
      // 音频模态必须带 audio 参数（OpenAI 语音输出约定）：voice/format 可被 inputs 覆盖，默认 alloy/wav。
      const audioReq = mods.includes('audio')
        ? {
            voice: String(effective['voice'] ?? 'alloy'),
            format: String(effective['format'] ?? effective['audioFormat'] ?? 'wav'),
          }
        : undefined
      runPromise = this.runCompletion(model, content, mods, audioReq)
    }
    job.promise = runPromise
      .then((urls) => {
        job.mediaUrls = urls
        job.state = 'completed'
      })
      .catch((err) => {
        job.state = 'failed'
        job.errObj = err
        job.error = err instanceof Error ? err.message : String(err)
      })
    return { providerExecutionId: id, state: 'queued' }
  }

  /** OpenRouter 视频生成：提交后轮询异步任务，完成后保存 unsigned_urls。 */
  private async runVideo(
    model: string,
    capabilities: string[],
    effective: Record<string, unknown>,
    assetPaths: string[],
  ): Promise<string[]> {
    const body: Record<string, unknown> = {
      model,
      prompt: String(effective['prompt'] ?? ''),
    }
    for (const key of ['duration', 'resolution', 'aspect_ratio', 'size', 'seed']) {
      const value = effective[key] ?? (key === 'aspect_ratio' ? effective['aspectRatio'] : undefined)
      if (value !== undefined && value !== null && value !== '') {
        body[key] = key === 'duration' || key === 'seed' ? Number(value) : value
      }
    }
    if (effective['generate_audio'] !== undefined || effective['generateAudio'] !== undefined) {
      body.generate_audio = effective['generate_audio'] ?? effective['generateAudio']
    }
    const images = await Promise.all(assetPaths.map(toDataUrl))
    if (images.length > 0) {
      const firstLast = capabilities.some((c) => c.includes('first-last-frame'))
      const multiReference = capabilities.some((c) => c.includes('multi-image'))
      if (firstLast) {
        body.frame_images = images.slice(0, 2).map((url, index) => ({
          type: 'image_url',
          image_url: { url },
          frame_type: index === 0 ? 'first_frame' : 'last_frame',
        }))
      } else if (multiReference) {
        body.input_references = images.map((url) => ({ type: 'image_url', image_url: { url } }))
      } else {
        body.frame_images = [{ type: 'image_url', image_url: { url: images[0] }, frame_type: 'first_frame' }]
      }
    }
    let submit: Response
    try {
      submit = await fetch(`${this.baseUrl}/videos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.key()}`,
          'Content-Type': 'application/json',
          'X-Title': 'DSH Multimodal Runtime',
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new MediaError('PROVIDER_OFFLINE', `OpenRouter 视频请求失败: ${String(err)}`, { retryable: true })
    }
    const submitted = (await submit.json().catch(() => ({}))) as Record<string, unknown>
    if (!submit.ok || submitted['error']) {
      const msg = strOf(submitted['error'], ['message']) ?? JSON.stringify(submitted).slice(0, 300)
      throw new MediaError(submit.status === 401 || submit.status === 403 ? 'MODEL_MISSING' : 'EXECUTION_FAILED', `OpenRouter 视频错误(${submit.status}): ${msg}`, {
        retryable: submit.status >= 500,
      })
    }
    const jobId = strOf(submitted, ['id'])
    if (!jobId) throw new MediaError('OUTPUT_MISSING', 'OpenRouter 视频提交成功但未返回任务 ID', { retryable: true })
    const pollingUrl = strOf(submitted, ['polling_url']) ?? `${this.baseUrl}/videos/${encodeURIComponent(jobId)}`
    const deadline = Date.now() + this.requestTimeoutMs
    while (Date.now() <= deadline) {
      let poll: Response
      try {
        poll = await fetch(pollingUrl, { headers: { Authorization: `Bearer ${this.key()}` } })
      } catch (err) {
        throw new MediaError('PROVIDER_OFFLINE', `OpenRouter 视频状态请求失败: ${String(err)}`, { retryable: true })
      }
      const statusJson = (await poll.json().catch(() => ({}))) as Record<string, unknown>
      if (!poll.ok) {
        const msg = strOf(statusJson['error'], ['message']) ?? JSON.stringify(statusJson).slice(0, 300)
        throw new MediaError('EXECUTION_FAILED', `OpenRouter 视频状态错误(${poll.status}): ${msg}`, { retryable: poll.status >= 500 })
      }
      const status = String(statusJson['status'] ?? 'pending').toLowerCase()
      if (status === 'completed') {
        const urls = Array.isArray(statusJson['unsigned_urls']) ? statusJson['unsigned_urls'].filter((u): u is string => typeof u === 'string' && u.length > 0) : []
        return urls.length > 0 ? urls : [`${this.baseUrl}/videos/${encodeURIComponent(jobId)}/content?index=0`]
      }
      if (['failed', 'cancelled', 'expired'].includes(status)) {
        const detail = strOf(statusJson, ['error', 'message']) ?? `状态 ${status}`
        throw new MediaError('EXECUTION_FAILED', `OpenRouter 视频生成失败：${detail}`, { retryable: status === 'failed' })
      }
      if (this.videoPollIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, this.videoPollIntervalMs))
    }
    throw new MediaError('TIMEOUT', `OpenRouter 视频任务 ${jobId} 超时`, { retryable: true })
  }

  private async runCompletion(
    model: string,
    content: Array<Record<string, unknown>>,
    modalities: string[],
    audio?: { voice: string; format: string },
  ): Promise<string[]> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.key()}`,
          'Content-Type': 'application/json',
          'X-Title': 'DSH Multimodal Runtime',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          modalities,
          ...(audio ? { audio } : {}),
        }),
      })
    } catch (err) {
      // fetch 网络层失败时 String(err) 只得 'TypeError: fetch failed'，
      // 底层原因（ECONNRESET/ETIMEDOUT/DNS 等）在 err.cause —— 必须透传以便诊断
      const cause = (err as { cause?: { code?: string; message?: string } })?.cause
      const detail = cause?.code ?? cause?.message
      throw new MediaError(
        'PROVIDER_OFFLINE',
        `OpenRouter 请求失败: ${String(err)}${detail ? `（原因: ${detail}）` : ''}。请检查网络连接（含代理设置）后重试`,
        { retryable: true },
      )
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok || json['error']) {
      const msg = strOf(json['error'], ['message']) ?? JSON.stringify(json).slice(0, 300)
      // 模态不匹配 404：TTS 专用模型（如 fish-audio/*）不支持 chat completions——
      // 音频模态先 fallback 到 /audio/speech 端点（OpenAI TTS 兼容，返回原始音频字节）。
      if (msg.includes('No endpoints found that support the requested output modalities')) {
        if (modalities.includes('audio')) {
          const text = content.filter((c) => c['type'] === 'text').map((c) => String(c['text'] ?? '')).join('\n')
          const ttsUrl = await this.runSpeech(model, text)
          if (ttsUrl) return [ttsUrl]
        }
        const kind = modalities.includes('audio') ? '音频' : '图像'
        throw new MediaError(
          'MODEL_MISSING',
          `模型 ${model} 不支持${kind}输出（该模型未提供聊天接口可用的${kind}输出端点；若为 TTS 专用模型请确认模型名正确，或换用 openai/gpt-audio 等模型）。请到 设置→多模态生成 更换模型后重试`,
          { retryable: false },
        )
      }
      // 402 余额不足：音频/图像输出要求账户最低余额，给充值指引。
      if (res.status === 402) {
        throw new MediaError(
          'MODEL_MISSING',
          `OpenRouter 账户余额不足：${msg}。请到 https://openrouter.ai/settings/credits 充值（音频/图像输出通常要求 ≥$0.50 余额）后重试`,
          { retryable: false },
        )
      }
      throw new MediaError(res.status === 401 || res.status === 403 ? 'MODEL_MISSING' : 'EXECUTION_FAILED', `OpenRouter 错误(${res.status}): ${msg}`, {
        retryable: res.status >= 500,
      })
    }
    const urls: string[] = []
    const choices = Array.isArray(json['choices']) ? (json['choices'] as Array<Record<string, unknown>>) : []
    for (const c of choices) {
      collectMediaUrls(c['message'], urls)
    }
    if (urls.length === 0) {
      throw new MediaError('OUTPUT_MISSING', `OpenRouter ${model} 未返回图像/音频输出（确认该模型支持对应输出模态）`, {
        retryable: true,
      })
    }
    return urls
  }

  /**
   * TTS 端点（POST /audio/speech，OpenAI 兼容）：TTS 专用模型（如 fish-audio/*）不走
   * chat completions，改由此端点合成。响应为原始音频字节（response_format=mp3），
   * 转成 data:audio/mp3 URL 复用既有落盘/登记管线。失败返回 null（由调用方回退原错误）。
   */
  private async runSpeech(model: string, text: string): Promise<string | null> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.key()}`,
          'Content-Type': 'application/json',
          'X-Title': 'DSH Multimodal Runtime',
        },
        body: JSON.stringify({ model, input: text, response_format: 'mp3' }),
      })
    } catch {
      return null
    }
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.startsWith('audio/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength === 0) return null
    // mime 用 audio/mp3（而非 mpeg）：落盘扩展名 .mp3 能被 inferMediaType 正确识别为 audio
    return `data:audio/mp3;base64,${buf.toString('base64')}`
  }

  private snapshot(providerExecutionId: string, job: PendingJob): MediaExecution {
    return {
      id: providerExecutionId,
      provider: this.id,
      providerExecutionId,
      taskId: '',
      stepId: '',
      state: job.state,
      error:
        job.state === 'failed' && job.errObj instanceof MediaError
          ? { code: job.errObj.code, message: job.errObj.message, retryable: job.errObj.retryable }
          : job.state === 'failed' && job.error
            ? { code: 'EXECUTION_FAILED', message: job.error, retryable: true }
            : undefined,
    }
  }

  private requireJob(providerExecutionId: string): PendingJob {
    const job = this.pending.get(providerExecutionId)
    if (!job) {
      throw new MediaError('INPUT_INVALID', `未知 OpenRouter 执行句柄: ${providerExecutionId}`, { retryable: false })
    }
    return job
  }

  async getStatus(providerExecutionId: string): Promise<MediaExecution> {
    return this.snapshot(providerExecutionId, this.requireJob(providerExecutionId))
  }

  async waitFor(providerExecutionId: string): Promise<MediaExecution> {
    const job = this.requireJob(providerExecutionId)
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new MediaError('TIMEOUT', `OpenRouter 执行 ${providerExecutionId} 超时`, { retryable: true })), this.requestTimeoutMs)
    })
    try {
      await Promise.race([job.promise, timeout])
    } finally {
      if (timer) clearTimeout(timer)
    }
    return this.snapshot(providerExecutionId, job)
  }

  /** 同步 HTTP 无法中途取消：no-op。 */
  async cancel(_providerExecutionId: string): Promise<void> {}

  async fetchOutputs(providerExecutionId: string, outDir: string, meta: FetchOutputsMeta): Promise<MediaAsset[]> {
    const job = this.requireJob(providerExecutionId)
    const urls = job.mediaUrls ?? []
    if (urls.length === 0) {
      throw new MediaError('OUTPUT_MISSING', `OpenRouter 无可落盘输出（${providerExecutionId}）`, { retryable: true })
    }
    await mkdir(outDir, { recursive: true })
    const assets: MediaAsset[] = []
    for (const [i, url] of urls.entries()) {
      const dm = url.match(/^data:([^;]+);base64,(.*)$/s)
      let localPath: string
      if (dm) {
        const sub = String(dm[1]).split('/')[1] ?? 'png'
        localPath = join(outDir, `${randomUUID().slice(0, 8)}-${i + 1}.${sub.replace(/[^a-z0-9]/gi, '') || 'png'}`)
        await writeFile(localPath, Buffer.from(String(dm[2]), 'base64'))
      } else {
        const urlExt = extFromUrlOrType(url)
        const ext = job.mediaType === 'video' && url.includes('/videos/') ? 'mp4' : urlExt
        localPath = join(outDir, `${randomUUID().slice(0, 8)}-${i + 1}.${ext}`)
        const res = await fetch(url, url.startsWith(this.baseUrl) ? { headers: { Authorization: `Bearer ${this.key()}` } } : undefined).catch((err) => {
          throw new MediaError('OUTPUT_MISSING', `下载输出失败 ${url}: ${String(err)}`, { retryable: true })
        })
        if (!res.ok) throw new MediaError('OUTPUT_MISSING', `下载输出失败 ${url}: HTTP ${res.status}`, { retryable: true })
        await writeFile(localPath, Buffer.from(await res.arrayBuffer()))
      }
      assets.push(
        this.opts.assetRegistry.register({
          type: inferMediaType(localPath),
          localPath,
          provider: meta.provider,
          recipeId: meta.recipeId,
          executionId: providerExecutionId,
          prompt: meta.prompt,
          parentAssets: meta.parentAssets,
        }),
      )
    }
    await this.opts.assetRegistry.persist()
    this.pending.delete(providerExecutionId)
    return assets
  }
}
