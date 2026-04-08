import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import { getWorkspacePath, workspaceExists } from "@/lib/workspace"
import type { Artifact, ArtifactType } from "@/lib/types"

const ARTIFACT_DIRS: { subdir: string; type: ArtifactType; group: string }[] = [
  { subdir: "manifests", type: "manifest", group: "配置文件" },
  { subdir: "raws", type: "manifest", group: "原始数据" },
  { subdir: "outputs", type: "video", group: "导出视频" },
  { subdir: "template-project/out", type: "video", group: "导出视频" },
  { subdir: "raws/images/existing", type: "image", group: "已有图片" },
  { subdir: "raws/images/retrieved", type: "image", group: "检索图片" },
  { subdir: "raws/images/generated", type: "image", group: "生成图片" },
  { subdir: "raws/images/crawled", type: "image", group: "爬取图片" },
  { subdir: "raws/videos/retrieved", type: "video", group: "检索视频" },
  { subdir: "raws/uploads", type: "document", group: "上传文件" },
  { subdir: "raws/audio/bgm", type: "audio", group: "背景音乐" },
  { subdir: "raws/audio/sfx", type: "audio", group: "音效" },
  { subdir: "raws/audio/vo", type: "audio", group: "配音" },
]

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

const AUDIO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
}

const VIDEO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
}

const MANIFEST_MIME: Record<string, string> = {
  ".json": "application/json",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".md": "text/markdown",
  ".txt": "text/plain",
}

const DOCUMENT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
}

const VIDEO_EXTS = new Set(Object.keys(VIDEO_MIME))
const IMAGE_EXTS = new Set(Object.keys(IMAGE_MIME))
const DOCUMENT_EXTS = new Set(Object.keys(DOCUMENT_MIME))

function guessMime(type: ArtifactType, ext: string): string | undefined {
  if (type === "image") return IMAGE_MIME[ext] || "image/png"
  if (type === "audio") return AUDIO_MIME[ext] || "audio/mpeg"
  if (type === "video") return VIDEO_MIME[ext] || "video/mp4"
  if (type === "manifest") return MANIFEST_MIME[ext] || "text/plain"
  if (type === "document") return DOCUMENT_MIME[ext] || "application/octet-stream"
  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    if (!(await workspaceExists(sessionId))) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const workspace = getWorkspacePath(sessionId)
    const artifacts: Artifact[] = []

    // Collect all subdir paths so we can skip overlapping entries
    const allSubdirs = ARTIFACT_DIRS.map((d) => d.subdir)

    for (const dir of ARTIFACT_DIRS) {
      const fullDir = path.join(workspace, dir.subdir)
      let entries: string[]
      try {
        entries = await fs.readdir(fullDir, { recursive: true })
      } catch {
        continue
      }

      // Find subdirs that are children of this dir (to skip them)
      const childSubdirs = allSubdirs
        .filter((s) => s !== dir.subdir && s.startsWith(dir.subdir + "/"))
        .map((s) => s.slice(dir.subdir.length + 1))

      for (const relEntry of entries) {
        // Skip files that belong to a more specific ARTIFACT_DIRS entry
        if (childSubdirs.some((child) => relEntry === child || relEntry.startsWith(child + "/"))) {
          continue
        }

        const fullPath = path.join(fullDir, relEntry)
        const stat = await fs.stat(fullPath).catch(() => null)
        if (!stat || !stat.isFile()) continue

        const fileName = relEntry
        const filePath = path.join(dir.subdir, relEntry)
        const ext = path.extname(fileName).toLowerCase()

        // For video directories, only include actual video files
        if (dir.type === "video" && !VIDEO_EXTS.has(ext)) continue

        const createdAt = stat.birthtimeMs || stat.mtimeMs

        // Determine effective type based on file extension
        let effectiveType: ArtifactType = dir.type
        if ((dir.type === "image" || dir.type === "audio") && ext === ".json") {
          effectiveType = "manifest"
        } else if (dir.type === "image" && !IMAGE_EXTS.has(ext)) {
          effectiveType = DOCUMENT_EXTS.has(ext) ? "document" : "manifest"
        } else if (dir.type === "document" && IMAGE_EXTS.has(ext)) {
          effectiveType = "image"
        }

        artifacts.push({
          id: `${dir.type}:${filePath}`,
          name: fileName,
          path: filePath,
          type: effectiveType,
          group: dir.group,
          mime: guessMime(effectiveType, ext),
          createdAt,
        })
      }
    }

    // Sort by group order (ARTIFACT_DIRS order), then newest first within group
    const groupOrder = new Map<string, number>()
    for (let i = 0; i < ARTIFACT_DIRS.length; i++) {
      const g = ARTIFACT_DIRS[i].group
      if (!groupOrder.has(g)) groupOrder.set(g, groupOrder.size)
    }
    artifacts.sort((a, b) => {
      const ga = groupOrder.get(a.group) ?? 999
      const gb = groupOrder.get(b.group) ?? 999
      if (ga !== gb) return ga - gb
      return b.createdAt - a.createdAt
    })

    return NextResponse.json(artifacts)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
