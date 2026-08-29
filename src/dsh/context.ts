/**
 * PRD §48-5 隔离要求：DSH 集成层只通过本文件定义的边界类型访问 Harness。
 * Comfy 特有代码不得越过 provider 目录；Harness 特有类型不得进入 core。
 */

/** dsh-tools 的 ToolRuntime 最小投影（真实类型见 @deepseek-ai/dsh-tools）。 */
export interface ToolRuntimeLike {
  register(definition: unknown): () => void
  execute(input: {
    name: string
    arguments: unknown
    signal: AbortSignal
  }): Promise<unknown>
}

/** dsh-jobs 的 JobRuntime 最小投影。 */
export interface JobsLike {
  start(spec: {
    kind: string
    label: string
    owner?: unknown
    run: () => Promise<unknown>
  }): string
}

/** dsh-workspace 的最小投影（.dsh-media 应放在当前 workspace 下，PRD §17）。 */
export interface WorkspaceLike {
  current(): { path: string } | undefined
}

export interface DshContext {
  tools?: ToolRuntimeLike
  jobs?: JobsLike
  workspace?: WorkspaceLike
}
