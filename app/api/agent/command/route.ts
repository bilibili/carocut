import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"
import { createWorkspace } from "@/lib/workspace"
import { formatError } from "@/lib/api-utils"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, command, args } = await req.json()

    if (!sessionId || !command) {
      return NextResponse.json({ error: "Missing sessionId or command" }, { status: 400 })
    }

    await createWorkspace(sessionId)
    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
    const client = getClientForWorkspace(workspacePath)

    if (command === "compact") {
      // Get config to retrieve default model
      const configResult = await client.config.get()
      if (configResult.error) {
        return NextResponse.json(
          { error: `Failed to get config: ${formatError(configResult.error)}` },
          { status: 502 },
        )
      }

      const config = configResult.data
      const defaultModel = config?.small_model || config?.model || process.env.OPENCODE_MODEL

      if (!defaultModel) {
        return NextResponse.json(
          { error: "No default model configured. Set OPENCODE_MODEL env or configure model in opencode.json" },
          { status: 400 },
        )
      }

      const slashIdx = defaultModel.indexOf("/")
      const providerID = slashIdx > 0 ? defaultModel.slice(0, slashIdx) : ""
      const modelID = slashIdx > 0 ? defaultModel.slice(slashIdx + 1) : ""
      if (!providerID || !modelID) {
        return NextResponse.json(
          { error: `Invalid model format: ${defaultModel}. Expected format: provider/model` },
          { status: 400 },
        )
      }

      const result = await client.session.summarize({
        sessionID: sessionId,
        providerID,
        modelID,
      })
      if (result.error) {
        return NextResponse.json({ error: formatError(result.error) }, { status: 502 })
      }
      return NextResponse.json({ success: true, data: result.data })
    }

    const result = await client.session.command({
      sessionID: sessionId,
      command,
      arguments: args || "",
    })

    if (result.error) {
      return NextResponse.json({ error: formatError(result.error) }, { status: 502 })
    }

    return NextResponse.json(result.data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
