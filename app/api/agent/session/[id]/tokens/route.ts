import { NextRequest, NextResponse } from "next/server"
import { getClient } from "@/lib/opencode"
import { formatError } from "@/lib/api-utils"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const client = getClient()
    const { data: msgs, error } = await client.session.messages({ sessionID: id })
    if (error) return NextResponse.json({ error: formatError(error) }, { status: 502 })

    let input = 0
    let output = 0
    let cacheRead = 0
    let cacheWrite = 0
    let cost = 0

    for (const item of msgs ?? []) {
      const info = item.info as {
        role?: string
        tokens?: { input?: number; output?: number; cache?: { read?: number; write?: number } }
        cost?: number
      } | undefined
      if (info?.role === "assistant") {
        input += info.tokens?.input ?? 0
        output += info.tokens?.output ?? 0
        cacheRead += info.tokens?.cache?.read ?? 0
        cacheWrite += info.tokens?.cache?.write ?? 0
        cost += info.cost ?? 0
      }
    }

    return NextResponse.json({ input, output, cacheRead, cacheWrite, cost })
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}
