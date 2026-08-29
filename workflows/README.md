# workflows/

放置 **ComfyUI API 格式** Workflow JSON（在 ComfyUI 中 `Save (API Format)` 导出）。

命名约定：文件名 = recipe 的 `workflow.path` 相对路径。

## 获取官方模板

comfy-mcp 提供 `search_templates` / `fetch_template`，可让 Agent 直接取模板并写为可运行 JSON：

```
mcp__comfy__search_templates  tag=API,type=video
mcp__comfy__fetch_template    <template_id>
```

## 内置示例

- `txt2img-api.json` —— 文生图（EmptyImage → KSampler → VAEDecode → SaveImage）
- `wan-i2v-api.json` —— Wan 图生视频

> 注意：这两个文件 **不会**随仓库打包（需要本机 ComfyUI 的实际节点），
> 首次使用时用上述 fetch_template 流程生成，或把你的导出文件放到这里，
> 并在对应 recipe 里核对 `requiredNodes` / `requiredModels`。
