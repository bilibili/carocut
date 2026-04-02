import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import { getWorkspacePath, workspaceExists } from "@/lib/workspace"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const sessionId = formData.get("sessionId") as string | null
    const subdir = (formData.get("subdir") as string | null) || "raws/uploads"

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    if (!(await workspaceExists(sessionId))) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Prevent path traversal in subdir
    const normalizedSubdir = path.normalize(subdir)
    if (normalizedSubdir.startsWith("..") || path.isAbsolute(normalizedSubdir)) {
      return NextResponse.json({ error: "Invalid subdir" }, { status: 400 })
    }

    const workspace = getWorkspacePath(sessionId)
    const targetDir = path.join(workspace, normalizedSubdir)

    // Ensure target is within workspace
    if (!targetDir.startsWith(workspace)) {
      return NextResponse.json({ error: "Invalid subdir" }, { status: 400 })
    }

    await fs.mkdir(targetDir, { recursive: true })

    const files = formData.getAll("files")
    const saved: Array<{ path: string; filename: string; mime: string }> = []

    for (const entry of files) {
      if (!(entry instanceof File)) continue

      if (entry.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${entry.name}" exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 413 },
        )
      }

      // Prevent path traversal in filenames
      const safeName = path.basename(entry.name)
      if (!safeName) continue

      const filePath = path.join(targetDir, safeName)
      const buffer = Buffer.from(await entry.arrayBuffer())
      await fs.writeFile(filePath, buffer)
      saved.push({
        path: path.join(normalizedSubdir, safeName),
        filename: safeName,
        mime: entry.type || "application/octet-stream",
      })
    }

    return NextResponse.json({ saved }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
