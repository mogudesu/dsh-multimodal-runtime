/**
 * V2 - 用户自定义工作流存储（~/.dsh/media-workflows/）。
 * 每个工作流一组文件：
 *   <id>.json         ComfyUI API 格式 workflow（管理页"保存(API)"导出的那份）
 *   <id>.recipe.json  完整 Recipe（含 nodeMapping / run.endpoint 全字段）
 *   <id>.mapping.json 可选显式节点映射（手写 YAML 场景的补充）
 * 兼容手写 <id>.yaml（走 core 极简 YAML 解析，字段受限但零依赖）。
 */
import { access, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type { CapabilityType, MediaType, Recipe, WorkflowNodeMapping } from '../core/index.js'
import { MediaError } from '../core/index.js'
import { parseRecipeYaml } from '../core/index.js'

export function userWorkflowsDir(): string {
  const home =
    process.env.DSH_HOME ??
    join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  return join(home, 'media-workflows')
}

export interface UserWorkflow {
  recipe: Recipe
  mapping?: WorkflowNodeMapping
}

export interface ImportWorkflowPayload {
  name: string
  /** 能力类型数组，如 ['image-to-video'] 或多图 ['multi-image-to-video']。 */
  capability: string[]
  /** comfy-local（拖 JSON）/ runninghub（端点名称或拖 JSON）/ openrouter（模型名）。 */
  provider?: string
  /** ComfyUI API 格式 workflow 的 JSON 文本（comfy-local 必填；runninghub 工作流模式可选）。 */
  workflowJson?: string
  /** RunningHub 标准模型端点名称（run.endpoint，免 workflow 文件）。 */
  endpoint?: string
  /** OpenRouter 模型名（run.model，如 google/gemini-2.5-flash-image）。 */
  model?: string
  /** RunningHub 应用 ID（run.appId，走 /task/openapi/createTaskById 云执行）。 */
  appId?: string
  /** RunningHub 区域：cn（国内）或 global（国际）。 */
  region?: 'cn' | 'global'
  nodeMapping?: WorkflowNodeMapping | null
  /** 自定义输入 schema（云端模型参数自动解析时生成；缺省走 defaultInputs 约定）。 */
  inputs?: Recipe['inputs']
  /** 导入后是否把新 recipe 设为所选能力的默认路由（缺省视为 true，「导入即默认」）。 */
  setAsDefault?: boolean
}

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'user-workflow'
}

function outputTypeOf(caps: string[]): MediaType {
  if (caps.some((c) => c.endsWith('-video'))) return 'video'
  if (caps.some((c) => c.includes('audio') || c.includes('music'))) return 'audio'
  return 'image'
}

/**
 * 能力自动识别：扫描 workflow JSON 里的节点 class_type，返回能力分类数组。
 * 与 client.js 的 detectCaps 同一套启发式（保持两端一致）。
 * 供「自动读取当前工作流」服务端导入时预判能力，省去用户手动勾选。
 */
export function detectCapabilities(workflowJson: string): CapabilityType[] {
  const caps: CapabilityType[] = []
  let types: string[] = []
  try {
    const wf = JSON.parse(workflowJson)
    if (wf && typeof wf === 'object') {
      types = Object.values(wf)
        .map((n) =>
          n && typeof n === 'object' ? String((n as Record<string, unknown>).class_type ?? (n as Record<string, unknown>).type ?? '') : '',
        )
        .filter(Boolean)
    }
  } catch {
    return caps
  }
  const has = (re: RegExp): boolean => types.some((x) => re.test(x))
  const nImages = types.filter((x) => /LoadImage/i.test(x)).length
  const videoish = has(/WanImageToVideo|ImageToVideo|SVD|VideoCombine|AnimateDiff|I2V/i)
  if (has(/FirstLast|FLF/i) && videoish) caps.push('first-last-frame-video')
  if (videoish && nImages >= 3) caps.push('multi-image-to-video')
  else if (videoish && nImages >= 1) caps.push('image-to-video')
  if (has(/SaveAudio|EncodeAudio|MusicGen|StableAudio|AudioOutput/i)) {
    caps.push(has(/LoadVideo|VideoInput|LoadVideoUpload/i) ? 'video-to-audio' : 'text-to-audio')
  }
  if (caps.length === 0 && nImages === 0 && has(/WanTextToVideo|TextToVideo|EmptyHunyuanLatentVideo|EmptyMochiLatent|LTXV/i)) {
    caps.push('text-to-video')
  }
  if (caps.length === 0) {
    if (nImages >= 1 && has(/CheckpointLoader|UNETLoader|VAELoader|KSampler/i)) caps.push('image-to-image')
    else if (has(/CheckpointLoader|UNETLoader|EmptyLatentImage|KSampler/i)) caps.push('text-to-image')
  }
  return caps
}

/** 按能力类型给出一组合理的默认输入 schema（用户之后可在 YAML 里改）。 */
function defaultInputs(caps: string[]): Recipe['inputs'] {
  const inputs: Recipe['inputs'] = [
    { name: 'prompt', type: 'string', required: true, description: '正向提示词' },
    { name: 'negative_prompt', type: 'string', required: false },
  ]
  if (caps.some((c) => ['image-to-image', 'image-to-video', 'first-last-frame-video'].includes(c))) {
    inputs.push({ name: 'image', type: 'image', required: true })
  }
  if (caps.some((c) => c === 'text-to-image' || c === 'image-to-image')) {
    inputs.push({ name: 'width', type: 'number', required: false })
    inputs.push({ name: 'height', type: 'number', required: false })
  }
  return inputs
}

async function loadMapping(dir: string, base: string): Promise<WorkflowNodeMapping | undefined> {
  try {
    const raw = await readFile(join(dir, `${base}.mapping.json`), 'utf8')
    const obj = JSON.parse(raw) as unknown
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as WorkflowNodeMapping) : undefined
  } catch {
    return undefined
  }
}

/** 把 recipe 内的相对 workflow.path 固化为绝对路径并校验存在；不存在则视为未就绪。
 *  云端端点型 recipe（runninghub run.endpoint / openrouter run.model）没有本地 workflow 文件，直接就绪。 */
async function finalize(dir: string, base: string, recipe: Recipe): Promise<UserWorkflow | null> {
  if (!recipe.workflow?.path) {
    if (recipe.run && (recipe.run.endpoint || recipe.run.model || recipe.run.appId)) return { recipe }
    return null
  }
  const declared = recipe.workflow.path
  const abs = isAbsolute(declared) ? declared : join(dir, declared)
  try {
    await access(abs)
  } catch {
    return null
  }
  const mapping = (await loadMapping(dir, base)) ?? recipe.nodeMapping
  return { recipe: { ...recipe, workflow: { path: abs } }, mapping }
}

async function loadRecipeJson(dir: string, file: string): Promise<UserWorkflow | null> {
  const raw = await readFile(join(dir, file), 'utf8')
  const obj = JSON.parse(raw) as Record<string, unknown>
  const base = file.replace(/\.recipe\.json$/, '')
  const caps = Array.isArray(obj['capability']) ? (obj['capability'] as unknown[]).map(String) : []
  if (caps.length === 0) return null
  const recipe: Recipe = {
    ...(obj as unknown as Recipe),
    id: typeof obj['id'] === 'string' && obj['id'] ? obj['id'] : base,
    capability: caps as CapabilityType[],
    provider: typeof obj['provider'] === 'string' ? obj['provider'] : 'comfy-local',
    inputs: Array.isArray(obj['inputs']) ? (obj['inputs'] as Recipe['inputs']) : [],
    outputs: Array.isArray(obj['outputs']) ? (obj['outputs'] as Recipe['outputs']) : [],
    health: { validateOnStartup: false },
    workflow: obj['workflow'] as Recipe['workflow'],
  }
  return finalize(dir, base, recipe)
}

/** 扫描目录。缺文件/坏文件静默跳过（启动路径不允许因用户文件崩溃）。 */
export async function scanUserWorkflows(dir: string): Promise<UserWorkflow[]> {
  await mkdir(dir, { recursive: true })
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const out: UserWorkflow[] = []
  const hasRecipeJson = new Set(
    entries.filter((e) => e.endsWith('.recipe.json')).map((e) => e.replace(/\.recipe\.json$/, '')),
  )
  for (const e of entries) {
    try {
      if (e.endsWith('.recipe.json')) {
        const wf = await loadRecipeJson(dir, e)
        if (wf) out.push(wf)
      } else if ((e.endsWith('.yaml') || e.endsWith('.yml')) && !hasRecipeJson.has(e.replace(/\.ya?ml$/, ''))) {
        const raw = await readFile(join(dir, e), 'utf8')
        const recipe = parseRecipeYaml(raw, e)
        if (!recipe) continue
        const wf = await finalize(dir, e.replace(/\.ya?ml$/, ''), recipe)
        if (wf) out.push(wf)
      }
    } catch {
      // 单个文件损坏不影响其余
    }
  }
  return out
}

/** 管理页"导入工作流"落盘入口：写 <id>.json + <id>.recipe.json（云端端点型只写 recipe）。 */
export async function importUserWorkflow(dir: string, payload: ImportWorkflowPayload): Promise<UserWorkflow> {
  if (!payload.name || payload.name.trim().length === 0) {
    throw new MediaError('INPUT_INVALID', '工作流名称必填', { retryable: false })
  }
  const caps = [...new Set((payload.capability ?? []).map(String).filter(Boolean))] as CapabilityType[]
  if (caps.length === 0) {
    throw new MediaError('INPUT_INVALID', '至少选择一个能力分类', { retryable: false })
  }
  const provider = payload.provider ?? 'comfy-local'
  if (provider !== 'comfy-local' && provider !== 'runninghub' && provider !== 'openrouter') {
    throw new MediaError('INPUT_INVALID', `不支持的工作流来源: ${provider}`, {
      retryable: false,
    })
  }
  const jsonText = typeof payload.workflowJson === 'string' ? payload.workflowJson.trim() : ''
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : ''
  const model = typeof payload.model === 'string' ? payload.model.trim() : ''
  const appId = typeof payload.appId === 'string' ? payload.appId.trim() : ''
  if (provider === 'comfy-local' && !jsonText) {
    throw new MediaError('INPUT_INVALID', 'ComfyUI 导入需要拖入 API 格式 workflow JSON', { retryable: false })
  }
  if (provider === 'openrouter' && !jsonText && !model) {
    throw new MediaError('INPUT_INVALID', 'OpenRouter 导入需要填写模型名', { retryable: false })
  }
  if (provider === 'runninghub' && !jsonText && !endpoint && !appId) {
    throw new MediaError('INPUT_INVALID', 'RunningHub 导入需要填写应用/端点信息或拖入 workflow JSON', { retryable: false })
  }
  const id = slugify(payload.name)
  await mkdir(dir, { recursive: true })
  if (!jsonText) {
    // 云端端点/模型型：不落 workflow 文件，只写 recipe（run.endpoint / run.model）
    const recipe: Recipe = {
      id,
      name: payload.name.trim(),
      capability: caps,
      provider,
      run: provider === 'openrouter' ? { model } : appId ? { appId, region: payload.region } : { endpoint, region: payload.region },
      nodeMapping: payload.nodeMapping ?? undefined,
      inputs: payload.inputs && payload.inputs.length > 0 ? payload.inputs : defaultInputs(caps),
      outputs: [{ name: 'output', type: outputTypeOf(caps) }],
      health: { validateOnStartup: false },
    }
    await writeFile(join(dir, `${id}.recipe.json`), JSON.stringify(recipe, null, 2), 'utf8')
    return { recipe }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new MediaError('WORKFLOW_INVALID', 'workflowJson 不是合法 JSON', { retryable: false })
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MediaError('WORKFLOW_INVALID', 'workflowJson 必须是 API 格式的 JSON 对象', { retryable: false })
  }
  const wfPath = join(dir, `${id}.json`)
  await writeFile(wfPath, JSON.stringify(parsed, null, 2), 'utf8')
  const recipe: Recipe = {
    id,
    name: payload.name.trim(),
    capability: caps,
    provider,
    workflow: { path: wfPath },
    inputs: defaultInputs(caps),
    outputs: [{ name: 'output', type: outputTypeOf(caps) }],
    health: { validateOnStartup: false },
    nodeMapping: payload.nodeMapping ?? undefined,
    run: provider === 'runninghub' ? { region: payload.region } : undefined,
  }
  await writeFile(join(dir, `${id}.recipe.json`), JSON.stringify(recipe, null, 2), 'utf8')
  return { recipe, mapping: payload.nodeMapping ?? undefined }
}

/** 增量修改用户工作流：读 <id>.recipe.json，套用 changes 后回写，Id 稳定不重建。
 *  支持 name / capability 字段（id 不动以保留所有历史 task 关联；如需改名让 id 联动另作方案）。 */
export async function updateUserWorkflow(
  dir: string,
  recipeId: string,
  changes: { name?: string; capability?: string[] },
): Promise<UserWorkflow | null> {
  const file = join(dir, `${recipeId}.recipe.json`)
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch {
    return null
  }
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  if (changes.name !== undefined) {
    const n = changes.name.trim()
    if (n) obj['name'] = n
  }
  if (changes.capability !== undefined) {
    const caps = changes.capability.map(String).filter(Boolean)
    if (caps.length === 0) {
      throw new MediaError('INPUT_INVALID', '至少选择一个能力分类', { retryable: false })
    }
    obj['capability'] = caps
  }
  await writeFile(file, JSON.stringify(obj, null, 2), 'utf8')
  return finalize(dir, recipeId, obj as unknown as Recipe)
}

/** 删除用户工作流：移除 .recipe.json 与可能的 .json（workflow 模板），不存在不报错。 */
export async function deleteUserWorkflow(dir: string, recipeId: string): Promise<void> {
  await unlink(join(dir, `${recipeId}.recipe.json`)).catch(() => {})
  await unlink(join(dir, `${recipeId}.json`)).catch(() => {})
  await unlink(join(dir, `${recipeId}.mapping.json`)).catch(() => {})
}
