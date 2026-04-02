import { tool } from "@opencode-ai/plugin"
import path from "path"
import { run } from "./_utils"

export const validate_sprite = tool({
  description: `验证精灵图（sprite sheet）是否符合网格规范。
检查：(1) 图片尺寸是否可被 cols/rows 整除，(2) magenta 色度键覆盖率，
(3) 帧间视觉连续性。可选：替换 magenta 为透明通道、提取独立帧文件。
用于 sprite 生成后的质量验证，或手动复核 AI 生成的精灵图。`,
  args: {
    image: tool.schema.string()
      .describe("精灵图文件的绝对路径"),
    cols: tool.schema.number()
      .describe("网格列数"),
    rows: tool.schema.number()
      .describe("网格行数"),
    fix_chroma: tool.schema.boolean().optional()
      .describe("是否将 magenta 背景替换为透明并保存，默认 false"),
    output: tool.schema.string().optional()
      .describe("chroma 修复后的输出路径（仅 fix_chroma=true 时使用）"),
    extract_frames: tool.schema.string().optional()
      .describe("提取独立帧到此目录路径"),
    skip_chroma: tool.schema.boolean().optional()
      .describe("跳过色度键检查（非 magenta 背景的精灵图），默认 false"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/validate_sprite.py")
    const cmd = ["python3", script, args.image,
      "--cols", String(args.cols), "--rows", String(args.rows)]
    if (args.fix_chroma) cmd.push("--fix-chroma")
    if (args.output) cmd.push("--output", args.output)
    if (args.extract_frames) cmd.push("--extract-frames", args.extract_frames)
    if (args.skip_chroma) cmd.push("--skip-chroma")
    try {
      const result = await run(cmd)
      return result.trim()
    } catch (e: any) {
      return e.stdout?.toString()?.trim() || e.message
    }
  },
})

export const remove_bg = tool({
  description: `移除图片背景，生成透明 PNG。
使用 rembg 库（基于 U2-Net 模型）进行前景分割。
用于需要叠加在视频画面上的前景元素（如人物抠图、产品图）。
输入支持任意图片格式，输出强制为 PNG（保留透明通道）。
需要 Python 包：rembg, Pillow, onnxruntime。`,
  args: {
    input: tool.schema.string().describe("原始图片的绝对路径"),
    output: tool.schema.string().describe("输出 PNG 图片的绝对路径"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/remove_bg.py")
    const result = await run(["python3", script, args.input, args.output])
    return result.trim()
  },
})
