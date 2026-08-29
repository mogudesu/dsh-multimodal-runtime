/* diag v2：真实 cordis Context + 注入 tools/typert 服务，复现插件 apply */
process.on('unhandledRejection', (r) => {
  console.error('UNHANDLED REJECTION:', r && r.stack ? r.stack : r)
})
const fsRoot = process.env.USERPROFILE + '\\.dsh\\profiles\\web\\node_modules\\.pnpm'
const root = 'file:///' + process.env.USERPROFILE.replace(/\\/g, '/') + '/.dsh/profiles/web/node_modules/.pnpm'
const { readdirSync } = await import('node:fs')
const find = (filter) => readdirSync(fsRoot).find((d) => d.startsWith(filter))
const cordisUrl = root + '/' + find('@deepseek-ai+cordis@') + '/node_modules/@deepseek-ai/cordis/lib/index.js'
const { Context } = await import(cordisUrl)
console.log('cordis loaded')

const registered = []
const manifests = []
const toolsSvc = {
  register(def) {
    registered.push(def && def.name)
    return () => {}
  },
  execute: async () => ({}),
}
const typertSvc = {
  register(mf) {
    manifests.push(mf && (mf.package ?? '(no-package)'))
    return mf
  },
}

const ctx = new Context()
ctx.provide('tools', toolsSvc)
ctx.provide('typert', typertSvc)

const pluginUrl =
  'file:///' + process.env.USERPROFILE.replace(/\\/g, '/') + '/.dsh/profiles/web/node_modules/dsh-multimodal-runtime/lib/dsh/index.js'
const m = await import(pluginUrl)
console.log('loaded:', m.name)
try {
  m.apply(ctx)
  console.log('apply() returned synchronously OK')
} catch (e) {
  console.error('APPLY SYNC THROW:', (e && e.stack) || e)
}
await new Promise((r) => setTimeout(r, 5000))
console.log('tools registered:', registered.length ? registered.join(', ') : '(none)')
console.log('manifests:', manifests.length ? manifests.join(', ') : '(none)')
process.exit(0)
