import { NextRequest, NextResponse } from "next/server"
import { getClient } from "@/lib/opencode"
import { deleteWorkspace, isWorkspaceLocked } from "@/lib/workspace"
import { formatError } from "@/lib/api-utils"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const client = getClient()
    const { data, error } = await client.session.get({ sessionID: id })
    if (error) return NextResponse.json({ error: formatError(error) }, { status: 502 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    if (await isWorkspaceLocked(id)) {
      return NextResponse.json({ error: "项目已锁定，无法修改" }, { status: 403 })
    }
    const { title } = await req.json().catch(() => ({}))
    if (typeof title !== "string") {
      return NextResponse.json({ error: "Missing title" }, { status: 400 })
    }
    const client = getClient()
    const { data, error } = await client.session.update({ sessionID: id, title })
    if (error || !data) {
      return NextResponse.json({ error: formatError(error ?? "Failed to update session") }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    if (await isWorkspaceLocked(id)) {
      return NextResponse.json({ error: "项目已锁定，无法删除" }, { status: 403 })
    }
    const client = getClient()
    const { error } = await client.session.delete({ sessionID: id })
    if (error) return NextResponse.json({ error: formatError(error) }, { status: 502 })
    await deleteWorkspace(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}
