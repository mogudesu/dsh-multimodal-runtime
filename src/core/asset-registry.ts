/**
 * PRD §15/§16/§17 - Asset Registry。
 * asset://<type>/<uuid> 统一 ID；目录 .dsh-media/assets/{images,videos,audio,3d}。
 * 任何媒体输出必须进入 Registry，并持久化 manifest。
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { MediaAsset, MediaType } from './types.js'
import { MediaError } from './errors.js'

const TYPE_DIR: Record<MediaType, string> = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
  '3d': '3d',
}

export class AssetRegistry {
  private assets = new Map<string, MediaAsset>()
  private dirty = false
  private manifestPath: string

  constructor(public readonly baseDir: string) {
    this.manifestPath = join(baseDir, 'assets.json')
  }

  get dirs() {
    return {
      assets: this.baseDir,
      images: join(this.baseDir, 'images'),
      videos: join(this.baseDir, 'videos'),
      audio: join(this.baseDir, 'audio'),
      '3d': join(this.baseDir, '3d'),
    }
  }

  async init(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true })
    for (const d of Object.values(this.dirs)) await mkdir(d, { recursive: true })
    await this.load()
  }

  private async load(): Promise<void> {
    try {
      const raw = await readFile(this.manifestPath, 'utf8')
      const list = JSON.parse(raw) as MediaAsset[]
      for (const a of list) this.assets.set(a.id, a)
    } catch {
      // 首次运行无 manifest，忽略
    }
  }

  /**
   * 登记资产：asset://<type>/<uuid>。
   * parentAssets 记录来源链（PRD §16）。
   */
  register(input: Omit<MediaAsset, 'id' | 'createdAt'> & { id?: string }): MediaAsset {
    const id = input.id ?? `asset://${input.type}/${randomUUID()}`
    const asset: MediaAsset = {
      ...input,
      id,
      parentAssets: input.parentAssets ?? [],
      createdAt: new Date().toISOString(),
    }
    this.assets.set(id, asset)
    this.dirty = true
    return asset
  }

  get(id: string): MediaAsset | undefined {
    return this.assets.get(id)
  }

  list(): MediaAsset[] {
    return [...this.assets.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  byType(type: MediaType): MediaAsset[] {
    return this.list().filter((a) => a.type === type)
  }

  /** 解析 asset id 到本地路径；找不到时抛 OUTPUT_MISSING。 */
  resolve(id: string): string {
    const a = this.assets.get(id)
    if (!a) throw new MediaError('OUTPUT_MISSING', `资产不存在: ${id}`, { retryable: false })
    return a.localPath
  }

  /** 目标文件路径：.dsh-media/assets/<type-dir>/<uuid>.<ext> */
  nextPath(type: MediaType, ext: string): string {
    return join(this.baseDir, TYPE_DIR[type], `${randomUUID()}.${ext.replace(/^\./, '')}`)
  }

  async persist(): Promise<void> {
    if (!this.dirty) return
    await mkdir(this.baseDir, { recursive: true })
    await writeFile(this.manifestPath, JSON.stringify(this.list(), null, 2), 'utf8')
    this.dirty = false
  }

  /** 扫描磁盘补录（未登记的输出文件，例如用户手工放进目录）。 */
  async rescan(): Promise<number> {
    let added = 0
    for (const [type, dir] of Object.entries(this.dirs)) {
      if (type === 'assets') continue
      let files: string[]
      try {
        files = await readdir(dir)
      } catch {
        continue
      }
      for (const f of files) {
        if (f.endsWith('.json')) continue
        const p = join(dir, f)
        const exists = [...this.assets.values()].some((a) => a.localPath === p)
        if (!exists) {
          this.register({
            type: type as MediaType,
            localPath: p,
            provider: 'unknown',
            parentAssets: [],
          })
          added++
        }
      }
    }
    return added
  }
}
