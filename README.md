# dsh-multimodal-runtime

![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC_BY--NC_4.0-lightgrey) ![Node](https://img.shields.io/badge/node-%3E%3D_20-339933) ![Version](https://img.shields.io/badge/version-0.1.0-blue) ![Tests](https://img.shields.io/badge/tests-vitest%20%C3%97%2029-green)

**Mogu Multimodal Runtime** —— DeepSeek Harness 多模态能力运行（V1）。

让以文本推理为核心的 DeepSeek Harness 通过 MCP + Skill + 高层 Tool 获得调用本地comfyui，runninghub的模型应用，openrouter的模型生成图片，视频，音频的能力；
"生成 → 处理 → 理解 → 编排"多模态任务的能力。 Provider：**Comfy Local**
（官方 comfy-mcp + 本机 ComfyUI）。

```
用户 → DeepSeek Harness(推理/规划) → Multimodal Runtime → Capability Router
      → ComfyLocalProvider → mcp__comfy__* → ComfyUI → Asset Registry → 交付
```

## 已实现（V1 Phase 1~5 核心）

| 模块 | 说明 | PRD |
|---|---|---|
| `src/core/` | 纯 TS 核心：Capability Registry、Recipe Registry+Validator、Task DAG、Scheduler、Retry Policy、Asset Registry、来源追踪、结构 QC | §8-21, §23, §37 |
| `src/dsh/` | DSH 集成层：插件入口、6 个 `media_*` 工具、ComfyLocalProvider、TaskRunner | §11, §18-19, §27-28 |
| `scripts/setup.mjs` | Comfy Setup CLI：检测 / 安装 / 生成 MCP 配置 | §7 |
| `skills/media-orchestrator/` | Agent 编排手册（如何拆 DAG、如何失败恢复） | §29 |
| `recipes/` | 默认空——能力全部来自用户导入；内置示例移至 `recipes.disabled/`（需要时手动移回即恢复） | §9 |

### 高层工具（模型日常只接触这些）

```
media_capabilities   查询可用能力（text-to-image / image-to-video / ...）
media_create_task    创建并启动任务 DAG（支持 dependsOn 依赖链）
media_task_status    查询任务/步骤状态与产出
media_asset_info     查询资产详情与来源链
media_cancel_task    取消任务
media_setup          一键诊断本机 Comfy 环境
```

底层 `mcp__comfy__*`（server_info / run_workflow / fetch_outputs / ...）由
ComfyLocalProvider 内部调用，仅在调试或 Runtime 无法覆盖时直接使用（§28）。

## 管理页（Web 设置 → 多模态生成）

插件自带 Web 管理页（client 半区，`client.js`），在 DSH Web GUI 的
**设置 → 多模态生成** 中提供：

- **默认空态**：不预置任何工作流模板，能力列表初始为空；导入工作流后才出现能力分组
- **导入工作流（简化版，免勾选）**：
  - **ComfyUI**：点「自动读取当前工作流」一键读取 ComfyUI 最近一次运行的工作流（`GET /history`）
    并自动识别能力导入；也可手动拖入 API 格式 JSON 兜底。能力分类全自动识别（文生图 / 图生图 /
    文生视频 / 图生视频 / 首尾帧视频 / 多图多参视频 / 视频配音 / 文本配音），不再需要勾选。
  - **RunningHub**：粘贴工作流链接或 workflowId，点「读取并导入」调 `getJsonApiFormat` 拉取云端工作流并导入。
  - **OpenRouter**：在「模型服务」区填 API Key 后，再填模型名点「添加模型」手动登记。
  落盘 `~/.dsh/media-workflows/` 并热注册，导入即设为所选能力默认路由
- **启用/停用** 每个 Recipe（停用后路由器不再选中，实时生效，无需重启）
- **模型服务**：RunningHub 在一个统一配置卡内选择国内版（`www.runninghub.cn`）或国际版（`www.runninghub.ai`），
  工作流/AI 应用 Key 与模型 API Key 集中配置，模型目录随所选版本刷新并展示完整端点；OpenRouter API Key 也在页面内保存，均为**保存即热生效**。
  旧环境变量 `RUNNINGHUB_API_KEY` / `RUNNINGHUB_ENTERPRISE_API_KEY` 继续兼容，国际版可用
  `RUNNINGHUB_GLOBAL_API_KEY` / `RUNNINGHUB_GLOBAL_ENTERPRISE_API_KEY`。
- **能力默认**：星标指定每种能力（文生图/图生视频/…）的首选 Recipe
- **工作流文件**：把 Recipe 指向已导入的任意 API 格式 JSON 覆盖其缺省 workflow
- **默认参数**：生图模型（checkpoint 下拉，来自本机 models 目录）、宽/高、
  步数、CFG、采样器、调度器 —— 作为 step inputs 未给时的兜底值注入 workflow

设置持久化在 `~/.dsh/media-settings.json`；运行时按引用共享同一份内存对象，
页面改动立即影响后续 `media_create_task` 的路由与注入。

## 对话框多模态生成（输入区集成）

会话输入区集成（对齐主流对话产品的选择器交互）：

- **✦ 多模态生成菜单**：composer 工具行左侧菜单按钮，选 生成图像 / 生成视频 / 生成音频
- **参数芯片条**：选择后输入区上方出现芯片条——模式 chip（× 可收回）+ 工作流下拉
  （列出该模式下已导入的 recipe，「默认路由」表示不指定）+ 比例下拉（16:9 / 9:16 / 1:1 / 4:3 / 3:4，音频无此项）
- **指令前缀**：参数变化时自动在输入框草稿首行维护一行【多模态生成】指令
  （capability / recipeId / 尺寸 + 润色要求），要求 Agent 先用匹配的提示词技能
  （anima-prompt / anima-scene-prompt / minimax-h3-prompt）把需求润色成专业提示词，
  再调用 `media_create_task`（step 携带 `recipeId` 指定工作流、宽高写入 inputs）；
  用户照常输入需求、照常发送，消息发出后芯片自动收回
- **step 级工作流指定**：`media_create_task` 的 steps 支持 `recipeId` 字段
  （导入即校验存在性与能力归属，runner 对显式 recipeId 跳过默认路由）

## 环境要求

```text
Node >= 20（DeepSeek Harness 运行时）
Python >= 3.10
comfy-cli >= 1.14.0
comfy-mcp（Comfy 官方 MCP server）
本地 ComfyUI（默认 127.0.0.1:8188）
```

## 安装（4 步）

### 1. 安装 Comfy 工具链（自动）

```bash
cd dsh-multimodal-runtime
node scripts/setup.mjs --install     # pip 安装 comfy-cli + comfy-mcp 到托管 venv
```

### 2. 生成 MCP 配置

```bash
node scripts/setup.mjs --patch       # 探测 COMFY_BIN，写入 $DSH_HOME/cordis.patch.yml
```

生成的配置（工具名 `mcp__comfy__*`）：

```yaml
- insert:
    - id: mogu-comfy-local
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: comfy
        transport: stdio
        command: comfy-mcp
        args: []
        env: { COMFY_BIN: "<探测到的绝对路径>" }   # 非标准位置时自动写入
        cwd: !!js process.cwd()
        toolCallTimeoutMs: 60000
        failOnStartupError: false
        reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30000, maxAttempts: 10 }
```

### 3. 安装插件到 profile

```bash
cd dsh-multimodal-runtime
dsh plugin --profile web add .          # 或: dsh plugin --profile web add ./dsh-multimodal-runtime
```

（等价于手动在 `~/.dsh/profiles/web/package.json` 加依赖 + `bundles` 追加
`dsh-multimodal-runtime`。）

### 4. 启动 ComfyUI + 重启 dsh

```bash
comfy launch          # 或使用 WorkFisher 启动器
```

重启 dsh 后模型可见 `media_capabilities` 等工具，即可用自然语言生成媒体。

## 诊断

```bash
node scripts/setup.mjs          # 全部组件状态（READY/PARTIAL/BROKEN/NOT_INSTALLED）
node scripts/setup.mjs --json   # JSON 输出（供插件/脚本消费）
```

示例输出：

```
✓ Python               READY          python 3.13.14
✗ comfy-cli            NOT_INSTALLED  未找到 comfy 命令
✓ ComfyUI Workspace    READY          J:/ComfyUI-WorkFisher-V2/ComfyUI
○ ComfyUI Server       OFFLINE        127.0.0.1:8188 未监听
Models: 332 · Custom Nodes: 140 · Server: offline
```

## 使用示例

用户输入："生成一张 1024×1024 白狐少女战斗关键帧，然后用它做 5 秒视频。"

Agent（遵循 media-orchestrator skill）会自动：

1. `media_capabilities` → 确认 `text-to-image`、`image-to-video` 可用
2. `media_create_task` → DAG：`img-01 → video-01`
3. 轮询 `media_task_status` → 拿到 `asset://image/...` → 自动作为 video 输入
4. `media_asset_info` → 展示最终资产与来源链

## 目录

```
dsh-multimodal-runtime/
├── package.json            # dsh.bundle 声明（插件包）
├── cordis.patch.yml        # bundle patch（运行时插件行）
├── scripts/setup.mjs       # Comfy Setup CLI（零依赖）
├── src/
│   ├── core/               # 纯 TS 核心（可独立单测）
│   ├── dsh/                # DSH 集成层（插件入口/工具/Provider）
│   └── setup/detect.ts     # 检测链（media_setup 工具用）
├── skills/media-orchestrator/SKILL.md
├── recipes/                # 默认空（能力来自用户导入；内置示例在 recipes.disabled/）
├── workflows/              # ComfyUI API 格式 Workflow JSON
├── tests/                  # vitest 单元测试（29 个）
└── docs/verified-apis.md   # PRD vs 实际 API 事实核查
```

## 测试与构建

```bash
npm install
npm test          # vitest（29 个用例）
npm run build     # tsc → lib/
```

## 安全边界（PRD §40）

- 不自动删除/覆盖用户 Workflow、模型、ComfyUI 配置。
- 不自动安装来源未知的 Custom Node / Model（需显式同意）。
- 花钱/联网的生成类操作需确认。
- 无视觉/视频/音频分析 Provider 时，语义 QC 一律返回 `unavailable`，不伪造"我看过了"。

## Roadmap

- V1：Comfy Local + DAG + Asset DAG + 结构 QC + media_* 工具 ✅（本仓库）
- V1.5：Vision / Video / Audio Analyzer → 语义 QC
- V2：Comfy Cloud、多 Provider 路由、成本/显存路由、自动 Fallback
- V3：Blender / Unity / Unreal / Browser / 更多 MCP

## 作者

**爱吃冬菇的蘑菇（Mogu）**

- Bilibili 主页：[https://space.bilibili.com/45311091](https://space.bilibili.com/45311091)

如果这个插件对你有帮助，欢迎去 Bilibili 关注作者，或给本仓库点一个 ⭐ Star。

## 开源协议

本项目采用 [**CC BY-NC 4.0（署名—非商业性使用 4.0 国际）**](./LICENSE) 协议发布。

| 你可以 | 条件 |
|---|---|
| ✅ 复制、分发本插件 | 必须**注明作者**（爱吃冬菇的蘑菇）与本仓库链接 |
| ✅ 修改、二次开发 | 仅限**非商业用途**，且同样注明作者 |
| ❌ 商业使用 | 未经作者授权，不得用于商用产品、付费服务或商业分发 |

商业授权 / 合作请通过 [Bilibili 主页](https://space.bilibili.com/45311091) 联系作者。

Copyright (c) 2026 爱吃冬菇的蘑菇（Mogu）
