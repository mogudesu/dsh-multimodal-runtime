/**
 * PRD §9 - Recipe Registry。
 * 优先级：已验证 Recipe > 官方/已安装 Template > 用户 Workflow > Agent 动态修改 > 从零生成。
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { CapabilityType, Recipe } from './types.js'
import { MediaError } from './errors.js'

export class RecipeRegistry {
  private recipes = new Map<string, Recipe>()

  register(recipe: Recipe): void {
    this.recipes.set(recipe.id, recipe)
  }

  unregister(id: string): boolean {
    return this.recipes.delete(id)
  }

  get(id: string): Recipe | undefined {
    return this.recipes.get(id)
  }

  list(): Recipe[] {
    return [...this.recipes.values()]
  }

  byCapability(type: CapabilityType): Recipe[] {
    return this.list().filter((r) => r.capability.includes(type))
  }

  /** 低显存变体查找（PRD §39 第一次 OOM 时切换）。 */
  lowMemoryVariantOf(id: string): Recipe | undefined {
    const r = this.recipes.get(id)
    if (!r?.lowMemoryVariant) return undefined
    return this.recipes.get(r.lowMemoryVariant)
  }
}

/** 从目录批量加载 YAML recipe（V1 用极简 YAML 子集解析，避免引入 yaml 依赖）。 */
export async function loadRecipesFromDir(dir: string): Promise<Recipe[]> {
  const out: Recipe[] = []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (!e.endsWith('.yaml') && !e.endsWith('.yml')) continue
    const raw = await readFile(join(dir, e), 'utf8')
    const recipe = parseRecipeYaml(raw, e)
    if (recipe) out.push(recipe)
  }
  return out
}

interface StackEntry {
  indent: number
  obj: Record<string, unknown>
}

/** 极简 YAML 子集解析：仅支持本插件 recipe 文件用到的结构（嵌套 map + 单层列表项）。 */
export function parseRecipeYaml(raw: string, filename: string): Recipe | null {
  const lines = raw.split(/\r?\n/)
  const recipe: Record<string, unknown> = {}
  const stack: StackEntry[] = []
  let pending: { parent: Record<string, unknown>; key: string; indent: number } | null = null

  const lastKey = (o: Record<string, unknown>): string | undefined =>
    Object.keys(o)[Object.keys(o).length - 1]

  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t === '---') continue
    const indent = line.length - line.trimStart().length

    // 列表项：挂到 pending key（或最近容器）上，自动建数组
    if (t.startsWith('- ')) {
      const container = pending ? pending.parent : stack.length > 0 ? stack[stack.length - 1]!.obj : recipe
      const key = pending ? pending.key : lastKey(container)
      if (key !== undefined) {
        const item = coerce(t.slice(2).trim())
        const cur = container[key]
        container[key] = Array.isArray(cur) ? [...cur, item] : [item]
      }
      pending = null
      continue
    }

    const m = t.match(/^([\w-]+):\s*(.*)$/)
    if (!m || m[1] === undefined) throw new MediaError('WORKFLOW_INVALID', `Recipe YAML 解析失败 ${filename}: ${t}`)
    const key = m[1]
    const rawValue = (m[2] ?? '').trim()

    // 未落实的 pending key 遇到更深的行 → 落实为对象并入栈
    if (pending && indent > pending.indent) {
      const obj: Record<string, unknown> = {}
      pending.parent[pending.key] = obj
      stack.push({ indent: pending.indent, obj })
    }
    pending = null

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) stack.pop()
    const parent = stack.length > 0 ? stack[stack.length - 1]!.obj : recipe

    if (rawValue === '' || rawValue === 'null') {
      pending = { parent, key, indent }
    } else {
      parent[key] = coerce(rawValue)
    }
  }
  return normalizeRecipe(recipe, filename)
}

function coerce(v: string): unknown {
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v === 'true' || v === 'false') return v === 'true'
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => coerce(s.trim())).filter((x) => x !== undefined)
  }
  return v
}

function normalizeRecipe(r: Record<string, unknown>, filename: string): Recipe | null {
  const id = typeof r.id === 'string' ? r.id : filename.replace(/\.ya?ml$/, '')
  const caps = Array.isArray(r.capability) ? r.capability.map(String) : []
  if (!id || caps.length === 0) return null
  return {
    id,
    name: String(r.name ?? id),
    capability: caps as CapabilityType[],
    provider: String(r.provider ?? 'comfy-local'),
    workflow: r.workflow as Recipe['workflow'],
    inputs: toInputArray(r.inputs),
    outputs: toOutputArray(r.outputs),
    health: {
      validateOnStartup: (r.health as { validateOnStartup?: boolean } | undefined)?.validateOnStartup ?? true,
    },
    lowMemoryVariant: (r.lowMemoryVariant as string | undefined) ?? undefined,
    constraints: r.constraints as Recipe['constraints'],
  }
}

/** YAML 的 inputs 是 { name: {type,required} } 对象 → 数组。 */
function toInputArray(v: unknown): Recipe['inputs'] {
  if (!v || typeof v !== 'object') return []
  return Object.entries(v as Record<string, unknown>).map(([name, spec]) => {
    const s = (spec ?? {}) as Record<string, unknown>
    return {
      name,
      type: (s.type as Recipe['inputs'][number]['type']) ?? 'string',
      required: s.required === true,
      enum: Array.isArray(s.enum) ? (s.enum as Array<string | number>) : undefined,
      description: typeof s.description === 'string' ? s.description : undefined,
    }
  })
}

function toOutputArray(v: unknown): Recipe['outputs'] {
  if (!v || typeof v !== 'object') return []
  return Object.entries(v as Record<string, unknown>).map(([name, spec]) => {
    const s = (spec ?? {}) as Record<string, unknown>
    return { name, type: (s.type as Recipe['outputs'][number]['type']) ?? 'image' }
  })
}
