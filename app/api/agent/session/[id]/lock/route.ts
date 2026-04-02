import { NextRequest, NextResponse } from "next/server"
import { isWorkspaceLocked, lockWorkspace, unlockWorkspace } from "@/lib/workspace"
import { formatError } from "@/lib/api-utils"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const locked = await isWorkspaceLocked(id)
    return NextResponse.json({ locked })
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { locked } = await req.json().catch(() => ({}))
    if (typeof locked !== "boolean") {
      return NextResponse.json({ error: "Missing locked (boolean)" }, { status: 400 })
    }
    if (locked) {
      await lockWorkspace(id)
    } else {
      await unlockWorkspace(id)
    }
    return NextResponse.json({ locked })
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}
