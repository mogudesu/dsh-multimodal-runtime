/**
 * PRD §7 - Comfy Setup 检测链（插件内 TS 版）。
 * 与 scripts/setup.mjs 保持同一检测逻辑；setup.mjs 是零依赖的可执行 CLI。
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { constants } from 'node:fs'
import { connect } from 'node:net'
import type { ComponentState, ComponentStatus, SetupReport } from '../core/index.js'

const execFileP = promisify(execFile)

export interface DetectionEnv {
  comfyPath?: string
  comfyBin?: string
  port?: number
  venvPython?: string
  dshHome?: string
}

function whichCandidates(name: string): string[] {
  return [name, name + '.exe', name + '.cmd', name + '.bat']
}

async function findInPath(name: string): Promise<string | null> {
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(';')) {
    if (!dir) continue
    for (const c of whichCandidates(name)) {
      const p = join(dir, c)
      try {
        await access(p, constants.X_OK)
        return p
      } catch {
        // continue
      }
    }
  }
  return null
}

async function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect({ host, port, timeout: 800 })
    sock.once('connect', () => {
      sock.destroy()
      resolve(true)
    })
    sock.once('error', () => resolve(false))
    sock.once('timeout', () => {
      sock.destroy()
      resolve(false)
    })
  })
}

async function commandExists(name: string): Promise<boolean> {
  try {
    await execFileP('where', [name], { windowsHide: true, timeout: 5000 })
    return true
  } catch {
    return false
  }
}

async function commandVersion(name: string): Promise<string> {
  try {
    const { stdout } = await execFileP(name, ['--version'], { windowsHide: true, timeout: 8000 })
    return stdout.trim().split(/\r?\n/)[0] ?? ''
  } catch {
    return ''
  }
}

async function countFiles(dir: string, depth: number, max: number): Promise<number> {
  if (depth <= 0) return 0
  let n = 0
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch {
    return 0
  }
  for (const e of entries) {
    if (n > max) return n
    const p = join(dir, e)
    try {
      const st = await import('node:fs/promises').then((m) => m.stat(p))
      if (st.isDirectory()) {
        n += await countFiles(p, depth - 1, max)
      } else {
        n++
      }
    } catch {
      // ignore
    }
  }
  return n
}

async function countDirs(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir)
    let n = 0
    for (const e of entries) {
      try {
        const st = await import('node:fs/promises').then((m) => m.stat(join(dir, e)))
        if (st.isDirectory()) n++
      } catch {
        // ignore
      }
    }
    return n
  } catch {
    return 0
  }
}

export async function runDetection(env: DetectionEnv = {}): Promise<SetupReport> {
  const port = env.port ?? 8188
  const comfyPath = env.comfyPath ?? process.env.COMFYUI_PATH ?? 'J:/ComfyUI-WorkFisher-V2/ComfyUI'
  const comfyBin = env.comfyBin ?? process.env.COMFY_BIN ?? ''
  const components: ComponentStatus[] = []

  // 1. Python
  let pythonState: ComponentState = 'NOT_INSTALLED'
  let pythonDetail = '未找到 python'
  for (const cand of ['python', 'py']) {
    const ver = await commandVersion(cand)
    if (ver && /3\.(1[0-9]|[0-9])/.test(ver)) {
      pythonState = 'READY'
      pythonDetail = `${cand} ${ver}`
      break
    }
  }
  components.push({ name: 'Python', state: pythonState, detail: pythonDetail, hint: pythonState === 'READY' ? undefined : '安装 Python >= 3.10' })

  // 2. comfy-cli
  const comfyCliOk = comfyBin ? true : await commandExists('comfy')
  const comfyCliVer = comfyBin ? 'COMFY_BIN 已指定' : await commandVersion('comfy')
  components.push({
    name: 'comfy-cli',
    state: comfyCliOk ? 'READY' : 'NOT_INSTALLED',
    detail: comfyCliOk ? (comfyCliVer || 'found') : '未找到 comfy 命令',
    hint: comfyCliOk ? undefined : 'pip install "comfy-cli>=1.14.0"',
  })

  // 3. comfy-mcp
  const mcpOk = await commandExists('comfy-mcp')
  components.push({
    name: 'comfy-mcp',
    state: mcpOk ? 'READY' : 'NOT_INSTALLED',
    detail: mcpOk ? 'found' : '未找到 comfy-mcp 命令',
    hint: mcpOk ? undefined : 'pip install comfy-mcp',
  })

  // 4. ComfyUI workspace
  let wsState: ComponentState = 'NOT_INSTALLED'
  let wsDetail = '未找到 ComfyUI 目录'
  try {
    await access(join(comfyPath, 'comfyui_version.py'))
    wsState = 'READY'
    wsDetail = comfyPath
  } catch {
    try {
      await access(join(comfyPath, 'main.py'))
      wsState = 'READY'
      wsDetail = comfyPath
    } catch {
      // 未找到
    }
  }
  components.push({
    name: 'ComfyUI Workspace',
    state: wsState,
    detail: wsDetail,
    hint: wsState === 'READY' ? undefined : '安装 ComfyUI 或用 comfy set-default <path> 指定',
  })

  // 5. comfy executable（launch 需要）
  let binState: ComponentState = 'NOT_INSTALLED'
  let binDetail = 'comfy-cli 不可用'
  if (comfyBin) {
    try {
      await access(comfyBin)
      binState = 'READY'
      binDetail = comfyBin
    } catch {
      binState = 'BROKEN'
      binDetail = `COMFY_BIN 指向的文件不存在: ${comfyBin}`
    }
  } else if (comfyCliOk) {
    binState = 'READY'
    binDetail = 'comfy 在 PATH 中'
  }
  components.push({ name: 'comfy executable', state: binState, detail: binDetail, hint: binState === 'READY' ? undefined : '设置 COMFY_BIN 环境变量' })

  // 6. MCP 配置（dsh profile / home patch 里是否有 comfy server 行）
  const dshHome = env.dshHome ?? process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '', '.dsh')
  let mcpConfigState: ComponentState = 'NOT_INSTALLED'
  let mcpConfigDetail = '未找到 dsh patch 配置'
  try {
    const { readFile } = await import('node:fs/promises')
    const profileDirs = await readdir(join(dshHome, 'profiles')).catch(() => [] as string[])
    let found = false
    for (const prof of profileDirs) {
      if (found) break
      for (const f of ['cordis.patch.yml', 'cordis.yml']) {
        try {
          const raw = await readFile(join(dshHome, 'profiles', prof, f), 'utf8')
          if (raw.includes('mcp-client') || raw.includes('comfy')) {
            found = true
            mcpConfigDetail = `${prof}/${f} 已包含 MCP 配置`
            break
          }
        } catch {
          // ignore
        }
      }
    }
    mcpConfigState = found ? 'READY' : 'NOT_INSTALLED'
  } catch {
    // ignore
  }
  components.push({
    name: 'MCP 配置',
    state: mcpConfigState,
    detail: mcpConfigDetail,
    hint: mcpConfigState === 'READY' ? undefined : '运行 scripts/setup.mjs --patch 生成 MCP 配置',
  })

  // 7. ComfyUI Server
  const online = await isPortOpen('127.0.0.1', port)
  components.push({
    name: 'ComfyUI Server',
    state: online ? 'READY' : 'OFFLINE',
    detail: online ? `127.0.0.1:${port} 在线` : `127.0.0.1:${port} 未监听`,
    hint: online ? undefined : '启动 ComfyUI（comfy launch 或 WorkFisher 启动器）',
  })

  // 8. Models
  const modelsDir = join(comfyPath, 'models')
  const modelCount = wsState === 'READY' ? await countFiles(modelsDir, 3, 500) : 0
  components.push({
    name: 'Models',
    state: wsState === 'READY' ? 'READY' : 'NOT_INSTALLED',
    detail: wsState === 'READY' ? `已扫描 ${modelCount} 个模型文件（限深 3 层）` : 'workspace 缺失',
  })

  // 9. Custom Nodes
  const nodesDir = join(comfyPath, 'custom_nodes')
  const nodeCount = wsState === 'READY' ? await countDirs(nodesDir) : 0
  components.push({
    name: 'Custom Nodes',
    state: wsState === 'READY' ? 'READY' : 'NOT_INSTALLED',
    detail: wsState === 'READY' ? `${nodeCount} 个自定义节点目录` : 'workspace 缺失',
  })

  // 汇总
  const severity: Record<ComponentState, number> = { READY: 0, PARTIAL: 1, OFFLINE: 2, BROKEN: 2, NOT_INSTALLED: 2 }
  const worst = components.reduce((acc, c) => Math.max(acc, severity[c.state]), 0)
  const overall: ComponentState = worst === 0 ? 'READY' : worst === 1 ? 'PARTIAL' : 'BROKEN'

  return {
    components,
    overall,
    summary: {
      python: pythonDetail,
      comfyCli: comfyCliOk ? (comfyCliVer || 'ready') : 'missing',
      comfyMcp: mcpOk ? 'ready' : 'missing',
      workspace: wsState === 'READY' ? comfyPath : 'missing',
      server: online ? `online:${port}` : 'offline',
      models: modelCount,
      customNodes: nodeCount,
      mcpConfig: mcpConfigState,
    },
    generatedAt: new Date().toISOString(),
  }
}
