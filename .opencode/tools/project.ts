import { tool } from "@opencode-ai/plugin"
import path from "path"

async function run(cmd: string[], opts?: { cwd?: string }): Promise<string> {
  const proc = Bun.spawn(cmd, { ...opts, stdout: "pipe", stderr: "pipe" })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    const error: any = new Error(stderr.trim() || `Process exited with code ${exitCode}`)
    error.exitCode = exitCode
    error.stderr = stderr
    throw error
  }
  return new Response(proc.stdout).text()
}

export const setup = tool({
  description: `初始化 Remotion 视频项目。从仓库内置模板（templates/template-project/）复制项目骨架，
安装依赖，可选安装 Chromium 浏览器，并根据 storyboard 需求安装额外包。
重要：仅支持 npm 作为包管理器（不支持 pnpm/bun）。
可选额外包：lottie（Lottie 动画）、3d（Three.js 3D）、maps（Mapbox 地图）、
charts（Recharts 图表）、gif（GIF 支持）、captions（字幕）。`,

  args: {
    project_path: tool.schema.string()
      .describe("项目创建的父目录绝对路径"),
    output: tool.schema.string().optional()
      .describe("项目目录名，默认 'template-project'"),
    extras: tool.schema.string().optional()
      .describe("逗号分隔的额外包列表，如 'lottie,charts,captions'"),
    skip_browser: tool.schema.boolean().optional()
      .describe("跳过 Chromium 浏览器安装，默认 false"),
    skip_verify: tool.schema.boolean().optional()
      .describe("跳过安装后验证步骤，默认 false"),
  },

  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/setup_project.py")
    const cmd = ["python3", script]
    if (args.output) cmd.push("--output", args.output)
    if (args.extras) cmd.push("--extras", args.extras)
    if (args.skip_browser) cmd.push("--skip-browser")
    if (args.skip_verify) cmd.push("--skip-verify")
    const result = await run(cmd, { cwd: args.project_path })
    return result.trim()
  },
})

export const migrate = tool({
  description: `将 raws/ 目录的素材迁移到 Remotion 项目的 public/ 目录，
并自动生成三个 TypeScript 文件：
- resourceMap.ts：所有素材路径常量（IMAGES, VOICEOVER, BGM, SFX, VIDEO, VO_DURATIONS）
- constants.ts：视频配置、配色、字体、PACING、TENSION_CONFIG（Agent 需 edit COLORS 和 FONTS）
- timing.ts：帧计算工具函数（secToFrames, msToFrames, pacingMultiplier, tensionToSpringConfig, audioOffsetFrames 等）
可用 --skip-copy 仅重新生成 TypeScript 文件而不复制素材。`,

  args: {
    project_path: tool.schema.string()
      .describe("视频项目根目录绝对路径（包含 raws/ 和 template-project/ 的目录）"),
    raws: tool.schema.string().optional()
      .describe("原始素材目录路径，默认 'raws'（相对于 project_path）"),
    public_dir: tool.schema.string().optional()
      .describe("Remotion public 目录路径，默认 'template-project/public'"),
    resources: tool.schema.string().optional()
      .describe("resources.yaml 路径，默认 'manifests/resources.yaml'"),
    durations_file: tool.schema.string().optional()
      .describe("durations.json 路径，默认 'raws/audio/vo/durations.json'"),
    output_dir: tool.schema.string().optional()
      .describe("TypeScript 输出目录，默认 'template-project/src/lib'"),
    skip_copy: tool.schema.boolean().optional()
      .describe("跳过素材复制，仅生成 TypeScript 文件，默认 false"),
  },

  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/migrate_assets.py")
    const cmd = ["python3", script, "--project-path", args.project_path]
    if (args.raws) cmd.push("--raws", args.raws)
    if (args.public_dir) cmd.push("--public", args.public_dir)
    if (args.resources) cmd.push("--resources", args.resources)
    if (args.durations_file) cmd.push("--durations", args.durations_file)
    if (args.output_dir) cmd.push("--output-dir", args.output_dir)
    if (args.skip_copy) cmd.push("--skip-copy")
    const result = await run(cmd, { cwd: args.project_path })
    return result.trim()
  },
})
