/**
 * PRD §23 - Level 0 结构 QC（确定性检查）。
 * 图片：文件存在/可读/宽高有效/大小有效；视频：可解码/duration/分辨率/fps/非空；
 * 音频：duration/sample rate/channel/是否静音。
 * 优先使用 ffprobe 等确定性程序；无 ffprobe 时降级为文件级检查并明确标注。
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import type { MediaAsset, MediaType } from './types.js'
import type { EvaluationCriteria, EvaluationResult, MediaEvaluator } from './evaluator.js'
import { semanticUnavailable } from './evaluator.js'

const execFileP = promisify(execFile)

export interface StructuralQcOptions {
  ffprobePath?: string
  minFileBytes?: number
}

interface ProbeInfo {
  durationSec?: number
  width?: number
  height?: number
  fps?: number
  sampleRate?: number
  channels?: number
  audioPresent?: boolean
  format: string
}

export class StructuralEvaluator implements MediaEvaluator {
  constructor(private readonly opts: StructuralQcOptions = {}) {}

  supports(type: MediaType): boolean {
    return type === 'image' || type === 'video' || type === 'audio'
  }

  async evaluate(asset: MediaAsset, criteria: EvaluationCriteria = {}): Promise<EvaluationResult> {
    const findings = [...(await this.structural(asset, criteria))]
    const ok = findings.every((f) => f.passed)
    return {
      ok,
      level: 'structural',
      findings,
      semanticEvaluation: 'unavailable',
      tool: 'structural',
    }
  }

  private async structural(asset: MediaAsset, criteria: EvaluationCriteria): Promise<Array<{ item: string; passed: boolean; detail: string }>> {
    const out: Array<{ item: string; passed: boolean; detail: string }> = []
    const minBytes = criteria.minSizeBytes ?? this.opts.minFileBytes ?? 1024

    let st
    try {
      st = await stat(asset.localPath)
    } catch {
      out.push({ item: '文件存在', passed: false, detail: `${asset.localPath} 不存在或不可读` })
      return out
    }
    out.push({ item: '文件存在', passed: true, detail: st.size + ' bytes' })
    if (st.size <= 0) {
      out.push({ item: '非空', passed: false, detail: '文件大小为 0' })
      return out
    }
    if (st.size < minBytes) {
      out.push({ item: '文件大小', passed: false, detail: `${st.size} < ${minBytes}` })
    } else {
      out.push({ item: '文件大小', passed: true, detail: `${st.size} bytes` })
    }

    // 视频/音频走 ffprobe；图片用 ffprobe 取尺寸（若无 ffprobe 则靠扩展名+大小）
    const probe = await this.probe(asset)
    if (probe) {
      if (asset.type === 'image' && probe.width && probe.height) {
        out.push({ item: '宽高', passed: true, detail: `${probe.width}×${probe.height}` })
      }
      if (asset.type === 'video') {
        out.push({ item: '可解码', passed: true, detail: probe.format })
        if (probe.durationSec !== undefined) {
          const minDur = criteria.minDurationSec ?? 0
          const pass = probe.durationSec >= minDur
          out.push({ item: 'duration', passed: pass, detail: `${probe.durationSec.toFixed(2)}s${minDur ? ` >= ${minDur}s` : ''}` })
        }
        if (probe.width && probe.height) out.push({ item: '分辨率', passed: true, detail: `${probe.width}×${probe.height}` })
        if (probe.fps !== undefined) out.push({ item: 'fps', passed: true, detail: probe.fps.toFixed(2) })
      }
      if (asset.type === 'audio') {
        const hasAudio = probe.audioPresent === true
        out.push({ item: '音轨', passed: hasAudio, detail: hasAudio ? 'audio stream found' : '没有可用音频轨道' })
        out.push({ item: '可解码', passed: hasAudio, detail: probe.format })
        if (probe.durationSec !== undefined) {
          const minDur = criteria.minDurationSec ?? 0
          out.push({ item: 'duration', passed: probe.durationSec >= minDur, detail: `${probe.durationSec.toFixed(2)}s` })
        }
        if (probe.sampleRate !== undefined) out.push({ item: 'sample rate', passed: true, detail: probe.sampleRate + ' Hz' })
        if (probe.channels !== undefined) out.push({ item: 'channel', passed: true, detail: probe.channels + '' })
        // 静音检测：依赖 volumedetect 是否可用，失败则标记 unknown（不伪造）
        const silence = await this.silenceCheck(asset)
        if (silence !== undefined) {
          out.push({ item: '静音检测', passed: silence < 0.999, detail: `mean_volume=${silence.toFixed(2)} dB` })
        }
      }
    } else {
      out.push({ item: 'ffprobe', passed: false, detail: 'ffprobe 不可用，仅完成文件级检查（结构 QC 降级）' })
    }
    return out
  }

  private async probe(asset: MediaAsset): Promise<ProbeInfo | undefined> {
    const ffprobe = this.opts.ffprobePath ?? 'ffprobe'
    try {
      const { stdout } = await execFileP(
        ffprobe,
        ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', asset.localPath],
        { timeout: 15_000, windowsHide: true },
      )
      const data = JSON.parse(stdout) as {
        format?: { duration?: string; format_name?: string }
        streams?: Array<{ codec_type?: string; width?: number; height?: number; avg_frame_rate?: string; sample_rate?: string; channels?: number }>
      }
      const video = data.streams?.find((s) => s.codec_type === 'video')
      const audio = data.streams?.find((s) => s.codec_type === 'audio')
      const fps = video?.avg_frame_rate ? parseRate(video.avg_frame_rate) : undefined
      return {
        durationSec: data.format?.duration ? Number(data.format.duration) : undefined,
        width: video?.width,
        height: video?.height,
        fps,
        sampleRate: audio?.sample_rate ? Number(audio.sample_rate) : undefined,
        channels: audio?.channels,
        audioPresent: Boolean(audio),
        format: data.format?.format_name ?? extname(asset.localPath).replace('.', ''),
      }
    } catch {
      return undefined
    }
  }

  private async silenceCheck(asset: MediaAsset): Promise<number | undefined> {
    const ffprobe = this.opts.ffprobePath ?? 'ffprobe'
    try {
      const { stderr } = await execFileP(
        ffprobe,
        ['-v', 'error', '-f', 'lavfi', '-i', `amovie=${asset.localPath.replace(/\\/g, '/')},volumedetect`, '-show_entries', 'frame_tags=lavfi.astats.Overall.RMS_level', '-of', 'default=noprint_wrappers=1:nokey=1'],
        { timeout: 15_000, windowsHide: true },
      )
      const m = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/)
      return m ? Number(m[1]) : undefined
    } catch {
      return undefined
    }
  }
}

function parseRate(rate: string): number | undefined {
  const [a, b] = rate.split('/').map(Number)
  if (!a || !b) return undefined
  return a / b
}

/** 语义评估统一入口：无分析器时返回 unavailable（PRD §24）。 */
export { semanticUnavailable }
