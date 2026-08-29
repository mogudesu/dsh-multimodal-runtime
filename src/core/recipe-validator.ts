/**
 * PRD §10 - Recipe 健康检查。
 * validate_workflow + search_models + search_nodes → READY / DEGRADED / BROKEN。
 * BROKEN 的 Recipe Agent 禁止选择。
 */
import type { Recipe, RecipeHealth } from './types.js'

export interface RecipeValidationInputs {
  /** recipeId -> workflow 是否通过 validate_workflow。 */
  workflowValid?: (workflowPath: string) => Promise<boolean> | boolean
  /** 模型名是否存在于本机（search_models 结果）。 */
  hasModel?: (name: string) => boolean | Promise<boolean>
  /** 节点类是否存在于本机（search_nodes 结果）。 */
  hasNode?: (name: string) => boolean | Promise<boolean>
  /** Provider 是否在线。 */
  providerOnline?: boolean | Promise<boolean>
}

export class RecipeValidator {
  /**
   * 规则：
   * - 缺 requiredNodes → BROKEN（NODE_MISSING）
   * - 缺 requiredModels → BROKEN（MODEL_MISSING）
   * - workflow 无效 → BROKEN（WORKFLOW_INVALID）
   * - Provider 离线 → BROKEN（PROVIDER_OFFLINE）
   * - 只有部分模型缺失或未显式验证 → DEGRADED
   */
  async validate(recipe: Recipe, inputs: RecipeValidationInputs = {}): Promise<RecipeHealth> {
    const reasons: string[] = []
    let status: RecipeHealth['status'] = 'READY'

    const workflowValid = recipe.workflow?.path ? await inputs.workflowValid?.(recipe.workflow.path) : undefined
    if (workflowValid === false) {
      status = 'BROKEN'
      reasons.push('WORKFLOW_INVALID: ' + recipe.workflow!.path)
    }

    if (inputs.providerOnline === false) {
      status = 'BROKEN'
      reasons.push('PROVIDER_OFFLINE')
    }

    const requiredModels = recipe.constraints?.requiredModels ?? []
    let missingModels = 0
    for (const m of requiredModels) {
      const ok = await inputs.hasModel?.(m)
      if (ok === false) {
        missingModels++
        reasons.push(`MODEL_MISSING: ${m}`)
      }
    }
    if (missingModels > 0) {
      status = missingModels === requiredModels.length ? 'BROKEN' : 'DEGRADED'
    }

    const requiredNodes = recipe.constraints?.requiredNodes ?? []
    let missingNodes = 0
    for (const n of requiredNodes) {
      const ok = await inputs.hasNode?.(n)
      if (ok === false) {
        missingNodes++
        reasons.push(`NODE_MISSING: ${n}`)
      }
    }
    if (missingNodes > 0) {
      status = 'BROKEN'
    }

    // 未声明任何约束，但 workflow 路径缺失 → 无法验证，标记 DEGRADED 而非 BROKEN。
    if (recipe.workflow?.path && workflowValid === undefined) {
      if (status === 'READY') status = 'DEGRADED'
      reasons.push('WORKFLOW_UNVERIFIED: 尚未执行 validate_workflow')
    }

    if (status === 'READY' && reasons.length === 0) reasons.push('all checks passed')
    return { status, reasons, checkedAt: new Date().toISOString() }
  }
}
