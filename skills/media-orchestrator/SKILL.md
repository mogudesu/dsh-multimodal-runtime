---
name: media-orchestrator
description: 核心多模态媒体生成调度器。当用户要求生成图片、生图、绘制二次元/写实壁纸、生成视频、生成音频、视频/图片超分、抠图、转换媒体，或消息带有【生成图片】/【生成视频】/【生成音频】等标签时必须触发。通过 media_create_task 实际生成媒体资产。
---

# media-orchestrator

通过 media_* 高层工具完成"文本 → 图片 → 视频 → 音频"的媒体生产闭环。

## 核心原则（PRD §29）

1. **生成类请求的固定第一步：先调 media_capabilities（零参数），再调 media_create_task。没有例外。**
   media_capabilities 的返回里有三个关键字段：
   - `capabilities`：可用能力与工作流列表；
   - `activeComposerTasks`：**输入框芯片直调已创建的任务**（taskId / capability / recipeId / prompt / state）——用户在输入框选好工作流发送后，插件已经直接把任务建好了，用户消息不会带任何标签或说明；
   - `composerSelection`：用户在芯片里**当前选中的**模式/工作流（mode / capability / recipeId / duration），可能还没有对应任务（如音频模式）。
2. **activeComposerTasks 非空时（红线）**：直接调用 media_create_task，steps[0] 用该条目的 capability 与 recipeId、inputs.prompt 用用户原文——运行时会**去重命中已建任务**并在对话内展示进度卡片。此时**严禁以"信息不足"为由反问用户**（工作流是用户亲手选的），**严禁另建不同工作流的新任务**，**严禁用其他工具重跑**。
3. **activeComposerTasks 为空但 composerSelection 存在时**：按 composerSelection 的 capability / recipeId / duration 调 media_create_task，同样**不要反问**（用户已用芯片表达意图）。
4. 两者都没有时，按用户文本选择能力直接创建；只有文本完全无法判断方向时才提问。
5. **必须调用工具生成，严禁光发提示词**：任何生成需求都必须落到 media_create_task；严禁调用 mcp__comfy_* 或搜索本地脚本拼工作流！
6. **创建即收尾，严禁循环轮询**：media_create_task 返回 taskId 后**立即结束本轮回复**，一句话告知即可；卡片自动展示进度，**严禁反复调 media_task_status 轮询**。
7. **参考图直接使用**：参考图只用 ① 消息中携带的图片 ② 已有 Asset ID（asset://...）。找不到就基于消息内描述生成，严禁翻找本地缓存。
8. 复用已有 Recipe，不要从零构造复杂 ComfyUI Workflow。多阶段任务建立依赖（dependsOn）。媒体传递用 Asset ID（asset://...），不复制路径字符串。

## 音频/配音专项

- 用户带声线要求的（如"用温柔女声朗读：……"）：**朗读文本 = 剔除声线指令后的正文**，声线经 inputs.voice 或 recipe 支持的参数表达；composerSelection 里有用户所选 recipe 时必须使用它。
- 生成成功后一句话收尾，进度与产出由卡片展示。

## 快速调用范例

### 1. 生成图片（文生图 / 图生图）
`
media_create_task {
  goal: "生成二次元角色躺床上壁纸",
  steps: [ { id: "gen", capability: "text-to-image", inputs: { prompt: "1girl, lying in bed, gentle expression, soft lighting, 16:9 wallpaper", width: 1280, height: 720 } } ]
}
`

### 2. 生成视频（图生视频 / 多参生视频）
`
media_create_task {
  goal: "生成角色躺床上动态视频壁纸",
  steps: [ { id: "gen", capability: "multi-image-to-video", inputs: { prompt: "gentle smile, blinking, subtle hair floating, cinematic lighting", width: 1280, height: 720, duration: 5 } } ]
}
`

### 3. 芯片直调去重命中（视频超分等）
`
media_capabilities → { activeComposerTasks: [ { taskId, capability: "video-upscale", recipeId: "nvidia-rtx-vsr", prompt: "生成视频", state: "RUNNING" } ] }
media_create_task {
  goal: "生成视频",
  steps: [ { id: "gen", capability: "video-upscale", recipeId: "nvidia-rtx-vsr", inputs: { prompt: "生成视频" } } ]
}
→ 返回同一个 taskId（去重命中），简短告知用户生成中即可
`

## 执行流程
1. 判断是否涉及芯片直调（见上节；涉及则先 media_capabilities）
2. 调用 media_create_task 启动任务
3. 得到返回后，输出一句简短回复（如"已为您开始生成，进度将在下方卡片实时展示。"）并结束本轮。
