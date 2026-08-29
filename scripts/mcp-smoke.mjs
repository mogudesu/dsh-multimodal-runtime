/**
 * comfy-mcp 冒烟测试：走真实 MCP stdio 协议，验证工具是否可用。
 * 用法: node scripts/mcp-smoke.mjs
 */
import { spawn } from 'node:child_process'

const MCP = 'C:/Users/25350/.workbuddy/binaries/python/envs/default/Scripts/comfy-mcp.exe'
const COMFY_BIN = 'C:/Users/25350/.workbuddy/binaries/python/envs/default/Scripts/comfy.exe'

const child = spawn(MCP, [], {
  env: { ...process.env, COMFY_BIN },
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true,
})

let buf = ''
const pending = new Map()

child.stdout.on('data', (d) => {
  buf += d.toString()
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      }
    } catch {}
  }
})

function rpc(method, params = {}, id) {
  const rid = id ?? Math.floor(Math.random() * 1e9)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(rid); reject(new Error(`RPC ${method} 超时`)) }, 90000)
    pending.set(rid, (msg) => { clearTimeout(timer); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result) })
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: rid, method, params }) + '\n')
  })
}

const t = setTimeout(() => { console.error('总超时'); process.exit(1) }, 60000)

try {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mmr-smoke', version: '0.1.0' },
  })
  console.log('initialize ok, server:', init.serverInfo?.name, init.serverInfo?.version)

  // initialized 通知：部分 server 不实现，容错跳过
  try { await rpc('notifications/initialized', {}, 'n-init') } catch {}

  const list = await rpc('tools/list', {})
  const names = (list.tools ?? []).map((t) => t.name)
  console.log(`tools/list: ${names.length} 个工具`)
  console.log('---关键工具---')
  console.log('server_info:', names.includes('server_info'))
  console.log('run_workflow:', names.includes('run_workflow'))
  console.log('fetch_outputs:', names.includes('fetch_outputs'))
  console.log('validate_workflow:', names.includes('validate_workflow'))
  console.log('job 相关:', names.filter((n) => /job/.test(n)))
  console.log('cancel 相关:', names.filter((n) => /cancel/.test(n)))

  // 打印关键工具的 inputSchema（真实参数名，用于修正 Adapter）
  const tools = list.tools ?? []
  for (const want of ['job', 'run_workflow', 'fetch_outputs', 'validate_workflow', 'generate_image']) {
    const t = tools.find((x) => x.name === want)
    if (t) {
      console.log(`\n=== ${want} inputSchema ===`)
      console.log(JSON.stringify(t.inputSchema ?? t.input_schema ?? {}, null, 1).slice(0, 1200))
    }
  }

  // 真实调用 server_info（ComfyUI 8188 在线）
  const info = await rpc('tools/call', { name: 'server_info', arguments: {} })
  const text = info?.content?.[0]?.text ?? ''
  console.log('server_info 返回:', text.slice(0, 300))
  const parsed = safeParse(text)
  if (parsed) {
    console.log('online:', parsed.online ?? parsed.running ?? '?')
    if (parsed.hardware) console.log('gpu:', parsed.hardware.gpu?.model ?? '?', 'vram:', parsed.hardware.gpu?.vram_bytes ?? '?')
  }
} catch (e) {
  console.error('SMOKE_FAIL:', e.message)
  process.exitCode = 1
} finally {
  clearTimeout(t)
  child.kill()
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return null }
}
