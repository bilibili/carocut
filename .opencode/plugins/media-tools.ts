import { type Plugin, tool } from "@opencode-ai/plugin"
import path from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "fs"
import crypto from "crypto"
import { loadEnv, run } from "../tools/_utils"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function getCacheDir(worktree: string, type: string = "image-search"): string {
  const dir = path.join(worktree, ".opencode", ".cache", type)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function cacheKey(args: Record<string, unknown>): string {
  const hash = crypto.createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 16)
  return hash + ".json"
}

function readCache(cacheDir: string, key: string): string | null {
  const file = path.join(cacheDir, key)
  if (!existsSync(file)) return null
  const age = Date.now() - statSync(file).mtimeMs
  if (age > CACHE_TTL_MS) return null
  return readFileSync(file, "utf-8")
}

function writeCache(cacheDir: string, key: string, data: string): void {
  writeFileSync(path.join(cacheDir, key), data, "utf-8")
}

export const MediaToolsPlugin: Plugin = async (ctx) => {
  const env = await loadEnv(ctx.worktree)
  const merged = { ...env, ...process.env }
  const tools: Record<string, ReturnType<typeof tool>> = {}

  // ── Image: search (requires PEXELS or PIXABAY key) ──────────────────
  const hasPexels = !!merged.PEXELS_API_KEY
  const hasPixabay = !!merged.PIXABAY_API_KEY
  await ctx.client.app.log({
    body: {
      service: "media-tools",
      level: "info",
      message: "Plugin initialized",
      extra: { hasPexels, hasPixabay },
    },
  })
  if (hasPexels || hasPixabay) {
    const sources = [
      ...(hasPexels ? ["pexels"] : []),
      ...(hasPixabay ? ["pixabay"] : []),
      ...(hasPexels && hasPixabay ? ["both"] : []),
    ] as [string, ...string[]]
    const defaultSource = sources[0]

    tools.images_search = tool({
      description: `在${hasPexels ? " Pexels" : ""}${hasPixabay ? " Pixabay" : ""} 搜索免费可商用的库存图片。
支持关键词搜索、颜色筛选、方向筛选。
返回 JSON 格式结果，包含图片 URL、尺寸、摄影师信息。
搜索策略：先用英文关键词搜索，如果结果不足则尝试同义词扩展。
结果可保存为 JSON 文件供后续处理。`,
      args: {
        query: tool.schema.string().describe("搜索关键词（推荐英文），如 'modern office workspace'"),
        source: tool.schema.enum(sources).optional()
          .describe(`图片来源，默认 ${defaultSource}`),
        count: tool.schema.number().optional()
          .describe(`期望结果数量，默认 3${hasPexels ? "，Pexels 最大 80" : ""}${hasPixabay ? "，Pixabay 最大 200" : ""}`),
        orientation: tool.schema.enum(["landscape", "portrait", "square", "horizontal", "vertical"]).optional()
          .describe("图片方向，视频制作通常选 landscape"),
        color: tool.schema.string().optional()
          .describe("颜色筛选，如 'blue', 'red', '#ffffff'"),
        page: tool.schema.number().optional()
          .describe("结果页码，默认 1"),
        output: tool.schema.string().optional()
          .describe("保存搜索结果的 JSON 文件绝对路径"),
      },
      async execute(args, context) {
        const env = await loadEnv(context.worktree)
        const cacheDir = getCacheDir(context.worktree, "image-search")
        const source = args.source ?? defaultSource
        const key = cacheKey({ query: args.query, source, count: args.count, orientation: args.orientation, color: args.color, page: args.page })

        const cached = readCache(cacheDir, key)
        if (cached) {
          if (args.output) writeFileSync(args.output, cached, "utf-8")
          return cached
        }

        const script = path.join(context.worktree, ".opencode/scripts/search_images.py")
        const cmd = ["python3", script, "--query", args.query]
        cmd.push("--source", source)
        if (args.count) cmd.push("--count", String(args.count))
        if (args.orientation) cmd.push("--orientation", args.orientation)
        if (args.color) cmd.push("--color", args.color)
        if (args.page) cmd.push("--page", String(args.page))
        if (args.output) cmd.push("--output", args.output)
        const result = await run(cmd, { env })
        const trimmed = result.trim()

        writeCache(cacheDir, key, trimmed)
        return trimmed
      },
    })

    // ── Video: search (reuses same PEXELS / PIXABAY keys) ──────────────
    tools.videos_search = tool({
      description: `在${hasPexels ? " Pexels" : ""}${hasPixabay ? " Pixabay" : ""} 搜索免费可商用的库存视频（B-Roll）。
支持关键词搜索、方向筛选、时长筛选。
返回 JSON 格式结果，包含视频 URL（HD/SD）、缩略图、尺寸、时长、创作者信息。
搜索策略：先用英文关键词搜索，如果结果不足则尝试同义词扩展。
结果可保存为 JSON 文件供后续处理。`,
      args: {
        query: tool.schema.string().describe("搜索关键词（推荐英文），如 'aerial city skyline'"),
        source: tool.schema.enum(sources).optional()
          .describe(`视频来源，默认 ${defaultSource}`),
        count: tool.schema.number().optional()
          .describe(`期望结果数量，默认 3${hasPexels ? "，Pexels 最大 80" : ""}${hasPixabay ? "，Pixabay 最大 200" : ""}`),
        orientation: tool.schema.enum(["landscape", "portrait", "square", "horizontal", "vertical"]).optional()
          .describe("视频方向，视频制作通常选 landscape"),
        min_duration: tool.schema.number().optional()
          .describe("最短时长（秒）"),
        max_duration: tool.schema.number().optional()
          .describe("最长时长（秒）"),
        page: tool.schema.number().optional()
          .describe("结果页码，默认 1"),
        output: tool.schema.string().optional()
          .describe("保存搜索结果的 JSON 文件绝对路径"),
      },
      async execute(args, context) {
        const env = await loadEnv(context.worktree)
        const cacheDir = getCacheDir(context.worktree, "video-search")
        const source = args.source ?? defaultSource
        const key = cacheKey({ query: args.query, source, count: args.count, orientation: args.orientation, min_duration: args.min_duration, max_duration: args.max_duration, page: args.page })

        const cached = readCache(cacheDir, key)
        if (cached) {
          if (args.output) writeFileSync(args.output, cached, "utf-8")
          return cached
        }

        const script = path.join(context.worktree, ".opencode/scripts/search_videos.py")
        const cmd = ["python3", script, "--query", args.query]
        cmd.push("--source", source)
        if (args.count) cmd.push("--count", String(args.count))
        if (args.orientation) cmd.push("--orientation", args.orientation)
        if (args.min_duration) cmd.push("--min-duration", String(args.min_duration))
        if (args.max_duration) cmd.push("--max-duration", String(args.max_duration))
        if (args.page) cmd.push("--page", String(args.page))
        if (args.output) cmd.push("--output", args.output)
        const result = await run(cmd, { env })
        const trimmed = result.trim()

        writeCache(cacheDir, key, trimmed)
        return trimmed
      },
    })
  }

  // ── Image: generate (requires CARO_LLM key & CARO_LLM_MODEL) ────────────────────────
  if (merged.CARO_LLM_API_KEY && merged.CARO_LLM_MODEL) {
    tools.images_geneate = tool({
      description: `通过 OpenAI 兼容 API 生成自定义图片。
用于 storyboard 中无法从库存图片获取的特定场景（如品牌定制插画、特定数据可视化背景）。
支持参考图片输入（URL 或本地路径）和 sprite 模式（生成精灵图序列帧）。
Sprite 模式内置自动验证和重试：生成后检查尺寸是否可被 cols/rows 整除，
失败时自动强化 prompt 重试（最多 max_retries 次）。
生成的图片强制保存为 PNG 格式。
注意：生成速度较慢，优先使用 search 获取库存图片。`,
      args: {
        prompt: tool.schema.string()
          .describe("图片生成提示词（英文），需详细描述画面内容、风格、构图"),
        output: tool.schema.string()
          .describe("输出文件的绝对路径（强制 .png 后缀）"),
        reference: tool.schema.array(tool.schema.string()).optional()
          .describe("参考图片路径或 URL 列表"),
        system_prompt: tool.schema.string().optional()
          .describe("覆盖内置的系统提示词"),
        mode: tool.schema.enum(["normal", "sprite"]).optional()
          .describe("生成模式：normal（普通图片）或 sprite（精灵图序列帧），默认 normal"),
        cols: tool.schema.number().optional()
          .describe("精灵图网格列数（仅 sprite 模式，如未指定则从 prompt 自动推断）"),
        rows: tool.schema.number().optional()
          .describe("精灵图网格行数（仅 sprite 模式，如未指定则从 prompt 自动推断）"),
        max_retries: tool.schema.number().optional()
          .describe("sprite 模式最大重试次数，默认 3"),
      },
      async execute(args, context) {
        const env = await loadEnv(context.worktree)
        const script = path.join(context.worktree, ".opencode/scripts/generate_image.py")
        const cmd = ["python3", script, "--prompt", args.prompt, "--output", args.output]
        if (args.reference) {
          for (const ref of args.reference) {
            cmd.push("--reference", ref)
          }
        }
        if (args.system_prompt) cmd.push("--system-prompt", args.system_prompt)
        if (args.mode) cmd.push("--mode", args.mode)
        if (args.cols) cmd.push("--cols", String(args.cols))
        if (args.rows) cmd.push("--rows", String(args.rows))
        if (args.max_retries) cmd.push("--max-retries", String(args.max_retries))
        const result = await run(cmd, { env })
        return result.trim()
      },
    })
  }

  // ── Audio: search_sfx (requires FREESOUND key) ─────────────────────
  if (merged.FREESOUND_API_KEY) {
    tools.audio_search_sfx = tool({
      description: `在 Freesound 搜索免费音效和背景音乐。
支持按关键词搜索、时长筛选、许可证过滤。
可仅返回搜索结果（JSON），或直接下载预览文件（高质量 MP3）到指定目录。
许可证选项：cc0（公共领域，最安全）、cc-by（需署名）、all（所有）。`,
      args: {
        query: tool.schema.string().describe("搜索关键词（英文），如 'typing keyboard'"),
        count: tool.schema.number().optional()
          .describe("结果数量，默认 5，最大 150"),
        license: tool.schema.enum(["cc0", "cc-by", "all"]).optional()
          .describe("许可证过滤，默认 cc0"),
        min_duration: tool.schema.number().optional()
          .describe("最短时长（秒）"),
        max_duration: tool.schema.number().optional()
          .describe("最长时长（秒）"),
        output: tool.schema.string().optional()
          .describe("下载目录绝对路径（指定后自动下载）"),
        json_output: tool.schema.string().optional()
          .describe("搜索结果保存为 JSON 文件的路径"),
      },
      async execute(args, context) {
        const env = await loadEnv(context.worktree)
        const script = path.join(context.worktree, ".opencode/scripts/search_sounds.py")
        const cmd = ["python3", script, "--query", args.query]
        if (args.count) cmd.push("--count", String(args.count))
        if (args.license) cmd.push("--license", args.license)
        if (args.min_duration) cmd.push("--min-duration", String(args.min_duration))
        if (args.max_duration) cmd.push("--max-duration", String(args.max_duration))
        if (args.output) cmd.push("--output", args.output)
        if (args.json_output) cmd.push("--json-output", args.json_output)
        const result = await run(cmd, { env })
        return result.trim()
      },
    })
  }

  return { tool: tools }
}
