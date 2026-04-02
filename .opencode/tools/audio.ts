import { tool } from "@opencode-ai/plugin"
import path from "path"
import { run } from "./_utils"

export const batch_tts = tool({
  description: `批量生成 TTS 语音文件。解析 script.md 中的 [VO_XXX] 标记段落，
逐个调用 Edge TTS 生成 WAV 文件。支持语速调整（如 1.2x）。
自动在完成后提取各段 duration，生成 durations.json。
script.md 格式要求：每段旁白用 **[VO_001]** "文本内容" 或 [VO_001] "文本内容" 标记。
可用 --start-from 从指定 VO_ID 开始（跳过已生成的），支持断点续做。
可用 --dry-run 仅解析脚本显示 VO 行数，不实际生成。
推荐直接传 Edge voice ID，例如 zh-CN-XiaoxiaoNeural。
tone 参数仅为兼容保留，当前 Edge TTS 后端会忽略它。`,
  args: {
    script: tool.schema.string().describe("script.md 文件的绝对路径"),
    output: tool.schema.string().describe("输出目录的绝对路径，通常为 <project>/raws/audio/vo"),
    character: tool.schema.string().optional()
      .describe("Edge voice ID 或 legacy alias，默认 default"),
    tone: tool.schema.string().optional()
      .describe("兼容旧配置的情感字段，当前 Edge TTS 后端会忽略它"),
    speed: tool.schema.number().optional()
      .describe("语速倍率，如 1.2 表示加速 20%，默认 1.2"),
    timeout: tool.schema.number().optional()
      .describe("每段 TTS 生成的超时秒数，默认 60"),
    start_from: tool.schema.string().optional()
      .describe("从指定 VO_ID 开始生成（跳过之前的），如 'VO_005'"),
    dry_run: tool.schema.boolean().optional()
      .describe("仅解析脚本显示 VO 行，不生成音频，默认 false"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/batch_tts.py")
    const cmd = ["python3", script, "--script", args.script, "--output", args.output]
    if (args.character) cmd.push("--character", args.character)
    if (args.tone) cmd.push("--tone", args.tone)
    if (args.speed) cmd.push("--speed", String(args.speed))
    if (args.timeout) cmd.push("--timeout", String(args.timeout))
    if (args.start_from) cmd.push("--start-from", args.start_from)
    if (args.dry_run) cmd.push("--dry-run")
    const result = await run(cmd)
    return result.trim()
  },
})

export const tts_single = tool({
  description: `生成单段 TTS 语音。调用 Edge TTS 生成单条旁白。
支持通过 speed 控制语速。输出 WAV 格式音频文件。
退出码含义：0=成功, 1=参数错误, 2=网络错误, 3=超时, 4=服务错误, 5=文件错误。
推荐直接传 Edge voice ID，例如 zh-CN-XiaoxiaoNeural。`,
  args: {
    text: tool.schema.string().describe("要合成的文本内容"),
    output: tool.schema.string().describe("输出 WAV 文件的绝对路径"),
    character: tool.schema.string().optional()
      .describe("Edge voice ID 或 legacy alias，默认 default"),
    tone: tool.schema.string().optional()
      .describe("兼容旧配置的情感字段，当前 Edge TTS 后端会忽略它"),
    emo_weight: tool.schema.number().optional()
      .describe("兼容旧配置的情感权重字段，当前 Edge TTS 后端会忽略它"),
    speed: tool.schema.number().optional()
      .describe("语速倍率，如 1.2 表示加速 20%，默认 1.0"),
    timeout: tool.schema.number().optional()
      .describe("最大轮询超时秒数，默认 60"),
    max_retries: tool.schema.number().optional()
      .describe("失败最大重试次数，默认 3"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/tts_invoke.py")
    const cmd = ["python3", script, "--text", args.text, "--output", args.output]
    if (args.character) cmd.push("--character", args.character)
    if (args.tone) cmd.push("--tone", args.tone)
    if (args.emo_weight != null) cmd.push("--emo-weight", String(args.emo_weight))
    if (args.speed) cmd.push("--speed", String(args.speed))
    if (args.timeout) cmd.push("--timeout", String(args.timeout))
    if (args.max_retries) cmd.push("--max-retries", String(args.max_retries))
    try {
      const result = await run(cmd)
      return result.trim()
    } catch (e: any) {
      return `TTS failed (exit ${e.exitCode}): ${e.stderr?.toString()?.trim() || e.message}`
    }
  },
})

export const durations = tool({
  description: `从目录中的 WAV 文件提取音频时长，生成 durations.json。
使用 ffprobe 读取每个匹配文件的精确时长（毫秒）。
输出 JSON 格式：{ "VO_001": 3500, "VO_002": 4200, ... }
时长单位为毫秒（ms），这是整个项目的时序基准数据。
修改任何音频文件后必须重新运行此工具更新 durations.json。
需要系统工具：ffprobe（ffmpeg 包）。`,
  args: {
    input_dir: tool.schema.string()
      .describe("包含 VO_*.wav 文件的目录绝对路径"),
    output: tool.schema.string().optional()
      .describe("输出 JSON 文件路径，默认为 {input_dir}/durations.json"),
    pattern: tool.schema.string().optional()
      .describe("文件匹配模式，默认 'VO_*.wav'"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/extract_durations.py")
    const cmd = ["python3", script, args.input_dir]
    if (args.output) cmd.push("--output", args.output)
    if (args.pattern) cmd.push("--pattern", args.pattern)
    const result = await run(cmd)
    return result.trim()
  },
})
