import path from "node:path"
import fs from "node:fs/promises"
import { checkBootstrap, runBootstrap } from "./bootstrap"

const WORKSPACES_ROOT = path.join(process.cwd(), "workspaces")
const LOCK_FILE = ".locked"

export async function createWorkspace(sessionId: string): Promise<string> {
  const dir = path.join(WORKSPACES_ROOT, sessionId)
  await fs.mkdir(path.join(dir, "raws", "images", "existing"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "images", "retrieved"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "images", "generated"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "audio", "bgm"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "audio", "sfx"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "audio", "vo"), { recursive: true })
  await fs.mkdir(path.join(dir, "manifests"), { recursive: true })
  await fs.mkdir(path.join(dir, "outputs"), { recursive: true })

  // Bootstrap check (global, runs once)
  const isBootstrapped = await checkBootstrap()
  if (!isBootstrapped) {
    const result = await runBootstrap()
    if (!result.success) {
      throw new Error(result.message)
    }
  }

  // Project setup (per-project, copies from cache)
  await setupProject(dir)

  return dir
}

async function setupProject(projectDir: string): Promise<void> {
  // Skip if template-project already exists (resume mode)
  const templateDir = path.join(projectDir, "template-project")
  try {
    await fs.access(templateDir)
    return // Already exists, skip setup
  } catch {
    // Directory doesn't exist, proceed with setup
  }

  const { exec } = await import("node:child_process")
  const { promisify } = await import("node:util")
  const execAsync = promisify(exec)

  const script = path.join(process.cwd(), ".opencode/scripts/setup_project.py")
  const cmd = `python3 "${script}" --output template-project --skip-verify`

  await execAsync(cmd, { cwd: projectDir })
}

export function getWorkspacePath(sessionId: string): string {
  return path.join(WORKSPACES_ROOT, sessionId)
}

export async function workspaceExists(sessionId: string): Promise<boolean> {
  try {
    await fs.access(path.join(WORKSPACES_ROOT, sessionId))
    return true
  } catch {
    return false
  }
}

export async function deleteWorkspace(sessionId: string): Promise<void> {
  const dir = path.join(WORKSPACES_ROOT, sessionId)
  await fs.rm(dir, { recursive: true, force: true })
}

export async function isWorkspaceLocked(sessionId: string): Promise<boolean> {
  try {
    await fs.access(path.join(WORKSPACES_ROOT, sessionId, LOCK_FILE))
    return true
  } catch {
    return false
  }
}

export async function lockWorkspace(sessionId: string): Promise<void> {
  await fs.writeFile(
    path.join(WORKSPACES_ROOT, sessionId, LOCK_FILE),
    new Date().toISOString(),
    "utf-8",
  )
}

export async function unlockWorkspace(sessionId: string): Promise<void> {
  await fs.rm(path.join(WORKSPACES_ROOT, sessionId, LOCK_FILE), { force: true })
}

export async function listWorkspaceFiles(
  sessionId: string,
  subdir: string,
): Promise<{ name: string; path: string; isDirectory: boolean }[]> {
  const dir = path.join(WORKSPACES_ROOT, sessionId, subdir)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      path: path.join(subdir, e.name),
      isDirectory: e.isDirectory(),
    }))
  } catch {
    return []
  }
}
