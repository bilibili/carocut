import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"
import { formatError } from "@/lib/api-utils"

type ModelTokens = { input: number; output: number; cacheRead: number; cacheWrite: number; cost: number }

function accumulate(map: Record<string, ModelTokens>, modelID: string, t: { input?: number; output?: number; cache?: { read?: number; write?: number } }, cost: number) {
  if (!map[modelID]) map[modelID] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }
  map[modelID].input += t.input ?? 0
  map[modelID].output += t.output ?? 0
  map[modelID].cacheRead += t.cache?.read ?? 0
  map[modelID].cacheWrite += t.cache?.write ?? 0
  map[modelID].cost += cost
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
    const client = getClientForWorkspace(workspacePath)

    const { data: children, error } = await client.session.children({ sessionID: sessionId })
    if (error) {
      return NextResponse.json({ error: formatError(error) }, { status: 502 })
    }

    const byModel: Record<string, ModelTokens> = {}
    let cost = 0

    await Promise.all(
      (children ?? []).map(async (child) => {
        const { data: msgs } = await client.session.messages({ sessionID: child.id })
        for (const item of msgs ?? []) {
          const info = item.info as { role?: string; modelID?: string; tokens?: { input?: number; output?: number; cache?: { read?: number; write?: number } }; cost?: number } | undefined
          if (info?.role === "assistant") {
            const msgCost = info.cost ?? 0
            if (info.tokens) accumulate(byModel, info.modelID ?? "unknown", info.tokens, msgCost)
            cost += msgCost
          }
        }
      }),
    )

    return NextResponse.json({ byModel, cost })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
