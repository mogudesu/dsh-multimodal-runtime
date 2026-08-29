# 事实核查：PRD vs 实际 API（2026-08-20 实测）

> PRD §48 要求：先读真实仓库，不根据可能过时的 API 盲写。
> 本文记录实现过程中对 PRD 假设的核实结果与偏差修正。

## 1. DeepSeek Harness（deepseek-ai/deepseek-harness）

| 项目 | 核实结果 |
|---|---|
| 仓库 | `github.com/deepseek-ai/deepseek-harness`，MIT，Cordis 元框架，TS |
| 当前版本 | dsh 0.1.0-rc.8（本机已装 rc.7，npx 缓存） |
| 形态 | "Everything is a Plugin"；Web UI 端口 3080 |
| Profile | `$DSH_HOME/profiles/<name>/`，含 `package.json`（`dsh.profile.bundles`）+ `cordis.patch.yml` |
| 本机 | `~/.dsh/profiles/{web,headless}`，web 的 bundles 为 dsh-base + dsh-web-app + dsh-skill-viewer |

## 2. MCP 客户端（@deepseek-ai/dsh-mcp-client）

来源：本机安装包 `lib/types/index.d.ts`（rc.7）+ 官方 `docs/config-catalog.md`。

- **与 PRD §6 样例完全一致**：`transport: stdio`、`serverName`、`command`、`args[]`、`env{}`、`cwd`、`toolCallTimeoutMs`、`failOnStartupError`、`reconnect{enabled,initialDelayMs,maxDelayMs,maxAttempts}`（默认 500/30000/10）。
- `serverName` 约束：`[A-Za-z0-9_-]{1,32}`，工具命名 `mcp__<serverName>__<rawName>`。
- 一个实例连一个 server；多个 server 就加载多个实例。
- 另支持 `streamable-http`（`url` + `headers`）。

## 3. 工具注册 / 工具间调用

- 工具：`ctx.tools.register(defineTool({ name, description, parameters, output:{schema,render}, execute(args, exec) }))`，effect 作用域，卸载即注销。
- 程序化调用其它工具：`ctx.tools.execute({ name, arguments, signal })` —— Provider Adapter 调 `mcp__comfy__*` 的通道。
- 长任务：`ctx.jobs.start({ kind, label, owner, run })`（dsh-jobs，PRD §19 首选）。
- 后台任务产出需返回 `{ kind: 'background', jobId }` 之类的结构化句柄。

## 4. Bundle / 安装

- Bundle 包：`package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。
- 安装：`dsh plugin --profile <name> add ./pkg`（或 npm 包 / github / tgz）。
- 层序：bundles(列表序) → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch`。
- 从 git 装 TS 包需 `prepare` 脚本预构建，且 pnpm≥10 需 allowBuilds。

## 5. comfy-mcp（Comfy 官方，Comfy-Org/comfy-mcp）

| 项目 | 核实结果 |
|---|---|
| 包 | PyPI `comfy-mcp`（v0.10.0，beta），依赖 `comfy-cli>=1.14.0`（故意不声明为依赖） |
| 协议 | stdio MCP；每个工具包装 `comfy … --where local --json` |
| 工具 | 39 个：server_info / run_workflow(wait) / job_status / wait_for_job / watch_job / fetch_outputs / launch_comfyui / stop_comfyui / search_templates / fetch_template / search_nodes / get_node / list_nodes / search_models / validate_workflow / system_stats / free_memory / upload_file / install_node / download_model 等 |
| 异步 | `run_workflow(wait=False)` 返回 `prompt_id`；`fetch_outputs(prompt_id, out_dir)` 复制输出 |
| 默认目标 | 127.0.0.1:8188；`COMFYUI_URL`/`COMFYUI_HOST` 可改远程 |
| COMFY_BIN | 可选；MCP 客户端环境通常不含 shell PATH，非标准位置需设置绝对路径 |
| 错误 | 结构化失败判定（verdict/error）；失败日志 `failures.jsonl`；`comfy not found on PATH` 表示缺引擎 |
| 安全 | 花钱操作（partner_generate 等）需确认；install_node/update 需确认；`COMFY_MCP_ASSUME_CONSENT` 不覆盖花钱场景 |

## 6. 与 PRD 的偏差与决策

| PRD 假设 | 实际处理 |
|---|---|
| MCP 配置样例含 `COMFY_BIN: <AUTO_DETECTED>` | 本机 comfy 装在托管 venv，绝对路径由 `setup.mjs --patch` 探测后**写死**进 `$DSH_HOME/cordis.patch.yml`（home 级层），避免依赖 `!!js` 运行时求值 |
| `mcp__comfy__cancel_job` | comfy-mcp 工具名未在文档中 100% 确认；Provider 用 `['cancel_job','cancel','job_cancel','stop_job']` 探测已注册工具，缺则报 UNKNOWN（不伪造） |
| comfy-mcp 返回结构 | 各工具精确返回字段未逐一验证（server 未启动）；Adapter 全部用防御性取值 + 显式标注"运行时验证" |
| `dsh plugin add` 需要本机 dsh CLI | 已提供；未在本机执行（避免未经确认改动 ~/.dsh/profile）—— 只生成了 patch 文件 |

## 7. 本机实测状态（2026-08-20 22:40）

```
Python            READY   python 3.13.14
comfy-cli         (见安装结果)
comfy-mcp         (见安装结果)
ComfyUI Workspace READY   J:/ComfyUI-WorkFisher-V2/ComfyUI
Models            READY   332 模型文件（限深 3 层）
Custom Nodes      READY   140 自定义节点目录
ComfyUI Server    OFFLINE 127.0.0.1:8188 未监听
MCP 配置          (安装后由 --patch 生成)
```

> 注意：此 ComfyUI 为 WorkFisher 整合包（自绘启动器），`comfy set-default` 指向它即可；
> 启动 ComfyUI 请用 WorkFisher 启动器或 `comfy launch`。
