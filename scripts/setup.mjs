#!/usr/bin/env node
/**
 * Mogu Multimodal Runtime - Comfy Setup CLI（PRD §7 一键安装与诊断）
 *
 * 用法：
 *   node scripts/setup.mjs            # 检测本机 Comfy 环境（默认）
 *   node scripts/setup.mjs --json     # 输出 JSON
 *   node scripts/setup.mjs --install  # 安装 comfy-cli + comfy-mcp 到托管 venv
 *   node scripts/setup.mjs --patch    # 生成 DSH MCP 配置 patch（写 $DSH_HOME/cordis.patch.yml）
 *   node scripts/setup.mjs --all      # install + patch + detect
 *
 * 零依赖：只使用 Node 内置模块。
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access, appendFile, readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, dirname } from 'node:path'
import { connect } from 'node:net'
import { fileURLToPath } from 'node:url'

const execFileP = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------- 环境常量（可覆盖） ----------
const ENV = {
  comfyPath: process.env.COMFYUI_PATH || 'J:/ComfyUI-WorkFisher-V2/ComfyUI',
  comfyBin: process.env.COMFY_BIN || '',
  port: Number(process.env.COMFY_PORT || 8188),
  dshHome: process.env.DSH_HOME || join(process.env.USERPROFILE || '', '.dsh'),
  venvPython: process.env.MMR_PYTHON || 'C:/Users/25350/.workbuddy/binaries/python/envs/default',
}

// ---------- 工具函数 ----------
async function findInPath(name) {
  const pathEnv = process.env.PATH || ''
  for (const dir of pathEnv.split(';')) {
    if (!dir) continue
    for (const c of [name, name + '.exe', name + '.cmd', name + '.bat']) {
      try {
        await access(join(dir, c), constants.X_OK)
        return join(dir, c)
      } catch {}
    }
  }
  return null
}

async function commandExists(name) {
  try {
    await execFileP('where', [name], { windowsHide: true, timeout: 5000 })
    return true
  } catch {
    return false
  }
}

async function commandVersion(name) {
  try {
    const { stdout } = await execFileP(name, ['--version'], { windowsHide: true, timeout: 8000 })
    return (stdout.trim().split(/\r?\n/)[0] || '').slice(0, 120)
  } catch {
    return ''
  }
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const sock = connect({ host, port, timeout: 800 })
    sock.once('connect', () => { sock.destroy(); resolve(true) })
    sock.once('error', () => resolve(false))
    sock.once('timeout', () => { sock.destroy(); resolve(false) })
  })
}

async function countFiles(dir, depth, max) {
  if (depth <= 0) return 0
  let n = 0
  let entries = []
  try { entries = await readdir(dir) } catch { return 0 }
  for (const e of entries) {
    if (n > max) return n
    const p = join(dir, e)
    try {
      const st = await stat(p)
      n += st.isDirectory() ? await countFiles(p, depth - 1, max) : 1
    } catch {}
  }
  return n
}

async function countDirs(dir) {
  try {
    const entries = await readdir(dir)
    let n = 0
    for (const e of entries) {
      try { if ((await stat(join(dir, e))).isDirectory()) n++ } catch {}
    }
    return n
  } catch { return 0 }
}

// ---------- 检测链 ----------
export async function detect() {
  const components = []
  const add = (name, state, detail, hint) => components.push({ name, state, detail, hint })

  // Python
  let pyState = 'NOT_INSTALLED'
  let pyDetail = '未找到 python'
  for (const cand of ['python', 'py']) {
    const ver = await commandVersion(cand)
    if (ver && /3\.(1[0-9]|[0-9])/.test(ver)) { pyState = 'READY'; pyDetail = `${cand} ${ver}`; break }
  }
  add('Python', pyState, pyDetail, pyState === 'READY' ? undefined : '安装 Python >= 3.10')

  // comfy-cli
  const cliOk = ENV.comfyBin ? true : await commandExists('comfy')
  const cliVer = ENV.comfyBin ? 'COMFY_BIN 已指定' : await commandVersion('comfy')
  add('comfy-cli', cliOk ? 'READY' : 'NOT_INSTALLED', cliOk ? (cliVer || 'found') : '未找到 comfy 命令',
    cliOk ? undefined : 'pip install "comfy-cli>=1.14.0"')

  // comfy-mcp
  const mcpOk = await commandExists('comfy-mcp')
  add('comfy-mcp', mcpOk ? 'READY' : 'NOT_INSTALLED', mcpOk ? 'found' : '未找到 comfy-mcp 命令',
    mcpOk ? undefined : 'pip install comfy-mcp')

  // ComfyUI workspace
  let ws = 'NOT_INSTALLED'
  let wsDetail = '未找到 ComfyUI 目录'
  try { await access(join(ENV.comfyPath, 'comfyui_version.py')); ws = 'READY'; wsDetail = ENV.comfyPath } catch {
    try { await access(join(ENV.comfyPath, 'main.py')); ws = 'READY'; wsDetail = ENV.comfyPath } catch {}
  }
  add('ComfyUI Workspace', ws, wsDetail, ws === 'READY' ? undefined : '安装 ComfyUI 或 comfy set-default <path>')

  // comfy executable
  let bin = 'NOT_INSTALLED'
  let binDetail = 'comfy-cli 不可用'
  if (ENV.comfyBin) {
    try { await access(ENV.comfyBin); bin = 'READY'; binDetail = ENV.comfyBin }
    catch { bin = 'BROKEN'; binDetail = `COMFY_BIN 指向的文件不存在: ${ENV.comfyBin}` }
  } else if (cliOk) { bin = 'READY'; binDetail = 'comfy 在 PATH 中' }
  add('comfy executable', bin, binDetail, bin === 'READY' ? undefined : '设置 COMFY_BIN 环境变量')

  // MCP 配置
  let mcpState = 'NOT_INSTALLED'
  let mcpDetail = '未找到 dsh patch 配置'
  try {
    const profs = await readdir(join(ENV.dshHome, 'profiles')).catch(() => [])
    for (const prof of profs) {
      for (const f of ['cordis.patch.yml', 'cordis.yml']) {
        try {
          const raw = await readFile(join(ENV.dshHome, 'profiles', prof, f), 'utf8')
          if (raw.includes('mcp-client') || raw.includes('comfy')) {
            mcpState = 'READY'; mcpDetail = `${prof}/${f} 已包含 MCP 配置`
            break
          }
        } catch {}
      }
      if (mcpState === 'READY') break
    }
    // 也检查 home 级 patch
    if (mcpState !== 'READY') {
      try {
        const raw = await readFile(join(ENV.dshHome, 'cordis.patch.yml'), 'utf8')
        if (raw.includes('mcp-client') || raw.includes('comfy')) { mcpState = 'READY'; mcpDetail = '~/.dsh/cordis.patch.yml 已包含 MCP 配置' }
      } catch {}
    }
  } catch {}
  add('MCP 配置', mcpState, mcpDetail, mcpState === 'READY' ? undefined : '运行 node scripts/setup.mjs --patch')

  // ComfyUI Server
  const online = await isPortOpen('127.0.0.1', ENV.port)
  add('ComfyUI Server', online ? 'READY' : 'OFFLINE', online ? `127.0.0.1:${ENV.port} 在线` : `127.0.0.1:${ENV.port} 未监听`,
    online ? undefined : '启动 ComfyUI（comfy launch 或 WorkFisher 启动器）')

  // Models / Custom Nodes
  const modelsDir = join(ENV.comfyPath, 'models')
  const nodesDir = join(ENV.comfyPath, 'custom_nodes')
  const modelCount = ws === 'READY' ? await countFiles(modelsDir, 3, 500) : 0
  const nodeCount = ws === 'READY' ? await countDirs(nodesDir) : 0
  add('Models', ws === 'READY' ? 'READY' : 'NOT_INSTALLED', ws === 'READY' ? `已扫描 ${modelCount} 个模型文件（限深 3 层）` : 'workspace 缺失')
  add('Custom Nodes', ws === 'READY' ? 'READY' : 'NOT_INSTALLED', ws === 'READY' ? `${nodeCount} 个自定义节点目录` : 'workspace 缺失')

  const severity = { READY: 0, PARTIAL: 1, OFFLINE: 2, BROKEN: 2, NOT_INSTALLED: 2 }
  const worst = Math.max(...components.map((c) => severity[c.state]))
  const overall = worst === 0 ? 'READY' : worst === 1 ? 'PARTIAL' : 'BROKEN'

  return {
    components,
    overall,
    summary: {
      python: pyDetail, comfyCli: cliOk ? (cliVer || 'ready') : 'missing',
      comfyMcp: mcpOk ? 'ready' : 'missing',
      workspace: ws === 'READY' ? ENV.comfyPath : 'missing',
      server: online ? `online:${ENV.port}` : 'offline',
      models: modelCount, customNodes: nodeCount, mcpConfig: mcpState,
    },
    generatedAt: new Date().toISOString(),
  }
}

// ---------- 安装 ----------
async function pythonOf() {
  const py = join(ENV.venvPython, 'Scripts', 'python.exe')
  try { await access(py); return py } catch { return 'python' }
}

async function install() {
  console.log('[setup] 安装 comfy-cli + comfy-mcp ...')
  const py = await pythonOf()
  const pip = py === 'python' ? ['-m', 'pip'] : ['-m', 'pip']
  const steps = [
    ['install', '-U', 'comfy-cli>=1.14.0'],
    ['install', '-U', 'comfy-mcp'],
  ]
  for (const args of steps) {
    const { stdout, stderr } = await execFileP(py, [...pip, ...args], { timeout: 600000, windowsHide: true })
    const out = (stdout + stderr).slice(-600)
    console.log(out)
  }
  console.log('[setup] 安装完成。若 comfy 不在 PATH，请设置 COMFY_BIN 指向', join(ENV.venvPython, 'Scripts', 'comfy.exe'))
}

// ---------- Patch 生成（PRD §6 / publish.md 层序：home-level patch） ----------
async function findComfyMcp() {
  const venvExe = join(ENV.venvPython, 'Scripts', 'comfy-mcp.exe')
  try { await access(venvExe); return venvExe } catch {}
  return findInPath('comfy-mcp')
}

function mcpPatchYaml({ comfyBin, comfyMcpPath }) {
  const lines = [
    '# Mogu Multimodal Runtime - Comfy MCP 配置（自动生成）',
    '- insert:',
    '    - id: mogu-comfy-local',
    "      name: '@deepseek-ai/dsh-mcp-client'",
    '      config:',
    '        serverName: comfy',
    '        transport: stdio',
    `        command: ${comfyMcpPath || 'comfy-mcp'}`,
    '        args: []',
  ]
  if (comfyBin) {
    lines.push('        env:')
    lines.push(`          COMFY_BIN: ${comfyBin.replace(/\\/g, '/')}`)
  }
  lines.push('        cwd: !!js process.cwd()')
  lines.push('        toolCallTimeoutMs: 60000')
  lines.push('        failOnStartupError: false')
  lines.push('        reconnect:')
  lines.push('          enabled: true')
  lines.push('          initialDelayMs: 500')
  lines.push('          maxDelayMs: 30000')
  lines.push('          maxAttempts: 10')
  return lines.join('\n') + '\n'
}

async function patch() {
  const homePatch = join(ENV.dshHome, 'cordis.patch.yml')
  let comfyBin = ENV.comfyBin
  if (!comfyBin) {
    const found = await findInPath('comfy')
    if (found) comfyBin = found
  }
  const comfyMcpPath = await findComfyMcp()
  if (!comfyBin) {
    console.warn('[setup] 未找到 comfy，生成的 patch 将不带 COMFY_BIN（依赖 PATH 或稍后手动加）')
  }
  if (!comfyMcpPath) {
    console.warn('[setup] 未找到 comfy-mcp，patch 使用裸命令 comfy-mcp（需确保其在 DSH 宿主 PATH 中）')
  }
  const content = mcpPatchYaml({ comfyBin: comfyBin || '', comfyMcpPath })

  let existing = ''
  try { existing = await readFile(homePatch, 'utf8') } catch {}
  if (existing.trim() && existing.trim() !== '[]') {
    // 已有内容：只在内容不含本插件标记时追加（不破坏用户已有行）
    if (existing.includes('mogu-comfy-local')) {
      console.log('[setup] patch 已存在（mogu-comfy-local），跳过写入')
    } else {
      const merged = existing.trimEnd() + '\n' + content
      await writeFile(homePatch, merged, 'utf8')
      console.log('[setup] 已追加到', homePatch)
    }
  } else {
    await mkdir(ENV.dshHome, { recursive: true })
    await writeFile(homePatch, content, 'utf8')
    console.log('[setup] 已写入', homePatch)
  }
  console.log('[setup] 重启 dsh（或重新加载 profile）后生效。工具名形如 mcp__comfy__server_info。')
}

// ---------- 入口 ----------
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const jsonMode = flags.has('--json')
const doInstall = flags.has('--install') || flags.has('--all')
const doPatch = flags.has('--patch') || flags.has('--all')

async function main() {
  if (doInstall) await install()
  if (doPatch) await patch()
  const report = await detect()
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`\nMogu Multimodal Runtime - Comfy Setup 诊断\n${'─'.repeat(46)}`)
    for (const c of report.components) {
      const mark = c.state === 'READY' ? '✓' : c.state === 'OFFLINE' ? '○' : '✗'
      console.log(`${mark} ${c.name.padEnd(20)} ${c.state.padEnd(14)} ${c.detail}`)
      if (c.hint) console.log(`  → ${c.hint}`)
    }
    console.log(`${'─'.repeat(46)}\nOVERALL: ${report.overall}`)
    console.log(`Models: ${report.summary.models} · Custom Nodes: ${report.summary.customNodes} · Server: ${report.summary.server}`)
  }
  process.exit(report.overall === 'READY' ? 0 : 1)
}

main().catch((e) => {
  console.error('[setup] 失败:', e.message)
  process.exit(2)
})
