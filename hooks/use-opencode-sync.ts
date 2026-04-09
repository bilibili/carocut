"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAgentEvents } from "./use-agent-events"
import { deriveEffectiveSessionStatus } from "./session-status"
import { buildPromptParts, type UploadedPromptFile } from "@/lib/prompt-parts"
import type {
  Message,
  Part,
  TextPart,
  ReasoningPart,
  Event,
  SessionStatus,
  PendingInteraction,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SyncState {
  /** Ordered message list (user + assistant, sorted by creation time) */
  messages: Message[]
  /** Parts indexed by messageID */
  parts: Map<string, Part[]>
  /** Session status */
  sessionStatus: SessionStatus
  /** Pending permission or question interaction */
  pendingInteraction: PendingInteraction | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOpenCodeSync(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [parts, setParts] = useState<Map<string, Part[]>>(new Map())
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ type: "idle" })
  const [pendingQueue, setPendingQueue] = useState<PendingInteraction[]>([])

  // Delta accumulator for streaming text/reasoning parts
  const deltaAccRef = useRef<Map<string, string>>(new Map())

  // Track whether initial load is done
  const initializedRef = useRef(false)

  // -------------------------------------------------------------------
  // Initial load: fetch existing messages
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return
    initializedRef.current = false
    deltaAccRef.current.clear()

    let stale = false
    const controller = new AbortController()

    async function load() {
      setPendingQueue([])
      try {
        const res = await fetch(
          `/api/agent/messages?sessionId=${encodeURIComponent(sessionId!)}`,
          { signal: controller.signal },
        )
        if (stale) return
        if (!res.ok) return
        const data = await res.json()
        if (stale) return
        if (!Array.isArray(data)) return

        const msgs: Message[] = []
        const partsMap = new Map<string, Part[]>()

        for (const item of data) {
          if (item.info) {
            msgs.push(item.info as Message)
          }
          if (item.parts && Array.isArray(item.parts)) {
            const msgId = (item.info as Message)?.id
            if (msgId) {
              partsMap.set(msgId, item.parts as Part[])
            }
          }
        }

        // Sort by creation time
        msgs.sort((a, b) => a.time.created - b.time.created)

        setMessages(msgs)
        setParts(partsMap)
      } catch {
        if (stale) return
        // Failed to load history, start fresh
      }

      // Restore pending permission/question that may have been lost on refresh
      try {
        const pendingRes = await fetch(
          `/api/agent/pending?sessionId=${encodeURIComponent(sessionId!)}`,
          { signal: controller.signal },
        )
        if (stale) return
        if (pendingRes.ok) {
          const { permissions, questions } = await pendingRes.json()
          if (stale) return
          const restored: PendingInteraction[] = []
          for (const q of questions ?? []) {
            restored.push({ kind: "question", request: q })
          }
          for (const p of permissions ?? []) {
            restored.push({ kind: "permission", request: p })
          }
          if (restored.length) setPendingQueue(restored)
        }
      } catch {
        // Non-critical — SSE will pick up new events
      }

      if (!stale) initializedRef.current = true
    }

    load()

    return () => {
      stale = true
      controller.abort()
    }
  }, [sessionId])

  // -------------------------------------------------------------------
  // SSE event handler
  // -------------------------------------------------------------------
  const handleEvent = useCallback(
    (event: Event) => {
      // Filter by sessionID if present in event properties
      const props = "properties" in event ? (event.properties as Record<string, unknown>) : null
      const eventSessionId = props?.sessionID as string | undefined
      // Don't filter question/permission events by sessionID — subagents have their own sessions
      const isInteractionEvent = event.type.startsWith("question.") || event.type.startsWith("permission.")
      if (!isInteractionEvent && eventSessionId && sessionId && eventSessionId !== sessionId) return


      switch (event.type) {
        // ---------------------------------------------------------------
        // message.updated — upsert message info
        // ---------------------------------------------------------------
        case "message.updated": {
          const info = (event as { properties: { info: Message } }).properties.info
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === info.id)
            if (idx === -1) {
              // Insert in sorted order
              const next = [...prev, info]
              next.sort((a, b) => a.time.created - b.time.created)
              return next
            }
            // Update in place
            const next = [...prev]
            next[idx] = info
            return next
          })
          break
        }

        // ---------------------------------------------------------------
        // message.part.updated — upsert part with delta support
        // ---------------------------------------------------------------
        case "message.part.updated": {
          const { part: rawPart, delta } = (event as {
            properties: { part: Part; delta?: string }
          }).properties
          const partId = rawPart.id
          const messageId = rawPart.messageID

          // Build the part with accumulated delta text
          let resolvedPart = rawPart
          if (delta !== undefined && (rawPart.type === "text" || rawPart.type === "reasoning")) {
            const prev = deltaAccRef.current.get(partId) ?? ""
            const next = prev + delta
            deltaAccRef.current.set(partId, next)
            resolvedPart = { ...rawPart, text: next } as TextPart | ReasoningPart
          } else if (rawPart.type === "text" || rawPart.type === "reasoning") {
            // Full replacement — reset accumulator
            deltaAccRef.current.set(partId, (rawPart as TextPart | ReasoningPart).text)
          }

          setParts((prev) => {
            const next = new Map(prev)
            const existing = next.get(messageId) ?? []
            const partIdx = existing.findIndex((p) => p.id === partId)
            if (partIdx === -1) {
              next.set(messageId, [...existing, resolvedPart])
            } else {
              const updated = [...existing]
              updated[partIdx] = resolvedPart
              next.set(messageId, updated)
            }
            return next
          })
          break
        }

        // ---------------------------------------------------------------
        // message.part.removed
        // ---------------------------------------------------------------
        case "message.part.removed": {
          const { messageID, partID } = (event as {
            properties: { sessionID: string; messageID: string; partID: string }
          }).properties
          setParts((prev) => {
            const existing = prev.get(messageID)
            if (!existing) return prev
            const next = new Map(prev)
            next.set(
              messageID,
              existing.filter((p) => p.id !== partID),
            )
            return next
          })
          deltaAccRef.current.delete(partID)
          break
        }

        // ---------------------------------------------------------------
        // message.removed
        // ---------------------------------------------------------------
        case "message.removed": {
          const { messageID } = (event as {
            properties: { sessionID: string; messageID: string }
          }).properties
          setMessages((prev) => prev.filter((m) => m.id !== messageID))
          setParts((prev) => {
            const next = new Map(prev)
            next.delete(messageID)
            return next
          })
          break
        }

        // ---------------------------------------------------------------
        // session.status
        // ---------------------------------------------------------------
        case "session.status": {
          const { status } = (event as {
            properties: { sessionID: string; status: SessionStatus }
          }).properties
          setSessionStatus(status)
          break
        }

        // ---------------------------------------------------------------
        // session.idle
        // ---------------------------------------------------------------
        case "session.idle": {
          setSessionStatus({ type: "idle" })
          break
        }

        // ---------------------------------------------------------------
        // session.error
        // ---------------------------------------------------------------
        case "session.error": {
          setSessionStatus({ type: "idle" })
          break
        }

        // ---------------------------------------------------------------
        // permission.asked
        // ---------------------------------------------------------------
        case "permission.asked": {
          const request = (event as { properties: import("@opencode-ai/sdk/v2").PermissionRequest }).properties
          setPendingQueue(prev => [...prev, { kind: "permission", request }])
          break
        }

        // ---------------------------------------------------------------
        // permission.replied
        // ---------------------------------------------------------------
        case "permission.replied": {
          const { requestID } = (event as {
            properties: { sessionID: string; requestID: string; reply: string }
          }).properties
          setPendingQueue(prev => prev.filter(p => !(p.kind === "permission" && p.request.id === requestID)))
          break
        }

        // ---------------------------------------------------------------
        // question.asked
        // ---------------------------------------------------------------
        case "question.asked": {
          const request = (event as { properties: import("@opencode-ai/sdk/v2").QuestionRequest }).properties
          setPendingQueue(prev => [...prev, { kind: "question", request }])
          break
        }

        // ---------------------------------------------------------------
        // question.replied / question.rejected
        // ---------------------------------------------------------------
        case "question.replied":
        case "question.rejected": {
          const { requestID } = (event as {
            properties: { sessionID: string; requestID: string }
          }).properties
          setPendingQueue(prev => prev.filter(p => !(p.kind === "question" && p.request.id === requestID)))
          break
        }

        default:
          break
      }
    },
    [sessionId],
  )

  // Subscribe to SSE
  useAgentEvents(sessionId, handleEvent)

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------

  /** Send a user message. No optimistic update — SSE events drive state. */
  const sendMessage = useCallback(
    async (text: string, files?: File[], subagent?: string) => {
      if (!sessionId) return

      // Upload files first if any
      const uploadedFiles: UploadedPromptFile[] = []
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const form = new FormData()
            form.append("files", file)
            form.append("sessionId", sessionId)
            const uploadRes = await fetch("/api/files/upload", {
              method: "POST",
              body: form,
            })
            if (uploadRes.ok) {
              const data = (await uploadRes.json()) as {
                saved?: Array<string | { path: string; filename?: string; mime?: string }>
              }
              if (Array.isArray(data.saved)) {
                for (const saved of data.saved) {
                  if (typeof saved === "string") {
                    uploadedFiles.push({
                      path: saved,
                      filename: saved.split("/").pop() || file.name,
                      mime: file.type,
                    })
                    continue
                  }

                  uploadedFiles.push({
                    path: saved.path,
                    filename: saved.filename || file.name,
                    mime: saved.mime || file.type,
                  })
                }
              }
            }
          } catch {
            // Continue without this file
          }
        }
      }

      // Build prompt parts
      const parts = buildPromptParts({
        sessionId,
        text,
        subagent,
        files: uploadedFiles,
      })

      // Clear stale streaming deltas from previous message
      deltaAccRef.current.clear()

      // Set busy immediately for UX
      setSessionStatus({ type: "busy" })

      try {
        const res = await fetch("/api/agent/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, parts }),
        })
        if (!res.ok) {
          let message = `Request failed (${res.status})`
          try {
            const data = (await res.json()) as { error?: string } | null
            if (data?.error) message = data.error
          } catch {
            // Ignore
          }
          setSessionStatus({ type: "idle" })
          // Could show error in UI — for now just log
          console.error("sendMessage error:", message)
        }
      } catch (err) {
        console.error("sendMessage network error:", err)
        setSessionStatus({ type: "idle" })
      }
    },
    [sessionId],
  )

  /** Send a slash command to the session */
  const sendCommand = useCallback(
    async (command: string, args?: string) => {
      if (!sessionId) return
      setSessionStatus({ type: "busy" })
      try {
        const res = await fetch("/api/agent/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, command, args }),
        })
        if (!res.ok) {
          let message = `Command failed (${res.status})`
          try {
            const data = (await res.json()) as { error?: string } | null
            if (data?.error) message = data.error
          } catch { /* ignore */ }
          setSessionStatus({ type: "idle" })
          console.error("sendCommand error:", message)
        }
        // Don't set idle here — let SSE session.status/session.idle drive it
      } catch (err) {
        console.error("sendCommand network error:", err)
        setSessionStatus({ type: "idle" })
      }
    },
    [sessionId],
  )

  /** Abort the current session (interrupt AI processing) */
  const abortSession = useCallback(
    async () => {
      if (!sessionId) return
      try {
        await fetch("/api/agent/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
      } catch (err) {
        console.error("abortSession error:", err)
      }
    },
    [sessionId],
  )

  /** Reply to a permission request */
  const replyPermission = useCallback(
    async (requestId: string, reply: "once" | "always" | "reject") => {
      try {
        await fetch("/api/agent/permission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, requestId, reply }),
        })
      } catch (err) {
        console.error("replyPermission error:", err)
      }
    },
    [sessionId],
  )

  /** Reply to a question */
  const replyQuestion = useCallback(
    async (questionId: string, answer: string[][] | string) => {
      try {
        await fetch("/api/agent/question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, questionId, answer }),
        })
      } catch (err) {
        console.error("replyQuestion error:", err)
      }
    },
    [sessionId],
  )

  const pendingInteraction = pendingQueue[0] ?? null
  const effectiveSessionStatus = deriveEffectiveSessionStatus(sessionStatus, parts)

  return {
    messages,
    parts,
    sessionStatus: effectiveSessionStatus,
    pendingInteraction,
    sendMessage,
    sendCommand,
    abortSession,
    replyPermission,
    replyQuestion,
  }
}
