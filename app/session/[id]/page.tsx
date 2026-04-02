"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useOpenCodeSync } from "@/hooks/use-opencode-sync"
import { useArtifacts } from "@/hooks/use-artifacts"
import { useAgentEvents } from "@/hooks/use-agent-events"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { useLock } from "@/hooks/use-lock"
import { ChatPanel } from "@/components/chat/chat-panel"
import { ArtifactList } from "@/components/artifacts/artifact-list"
import { DetailPanel } from "@/components/artifacts/detail-panel"
import { Logo } from "@/components/ui/logo"
import { TokenUsageMetrics } from "@/components/ui/token-usage-metrics"
import type { Session } from "@/lib/types"

export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const sync = useOpenCodeSync(sessionId)
  const { refreshArtifacts, checkStudio, ...artifactRest } = useArtifacts(sessionId)
  const artifacts = { refreshArtifacts, checkStudio, ...artifactRest }
  const tokenUsage = useTokenUsage(sync.messages)
  const [subagentByModel, setSubagentByModel] = useState<Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number; cost: number }>>({})
  const [subagentCost, setSubagentCost] = useState(0)
  const [showStudio, setShowStudio] = useState(false)
  const [sessionTitle, setSessionTitle] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [editValue, setEditValue] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)
  const { fetchSingleLockStatus, isLocked } = useLock()
  const locked = isLocked(sessionId)

  useEffect(() => {
    artifacts.refreshArtifacts()
    artifacts.checkStudio()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`/api/agent/subagent-tokens?sessionId=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSubagentByModel(data.byModel ?? data)
          setSubagentCost(data.cost ?? 0)
        }
      })
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    fetch(`/api/agent/session/${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((s: Session) => { if (s?.title) setSessionTitle(s.title) })
      .catch(() => {})
    fetchSingleLockStatus(sessionId)
  }, [sessionId, fetchSingleLockStatus])

  const startEditingTitle = () => {
    if (locked) return
    setEditValue(sessionTitle)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const commitTitle = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== sessionTitle) {
      try {
        const res = await fetch(`/api/agent/session/${encodeURIComponent(sessionId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        })
        if (res.ok) {
          setSessionTitle(trimmed)
        }
      } catch {}
    }
    setEditingTitle(false)
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      refreshArtifacts()
      checkStudio()
    }, 500)
  }, [refreshArtifacts, checkStudio])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleFileEvent = useCallback(
    (event: { type: string; properties?: Record<string, unknown> }) => {
      if (event.type === "file.watcher.updated" || event.type === "file.edited") {
        refreshArtifacts()
        checkStudio()
      }
      // Refresh when a tool call completes — catches files written by external
      // scripts (Python TTS, image search, etc.) whose output directories live
      // inside workspaces/ which is gitignored and therefore invisible to the
      // OpenCode file watcher.
      if (event.type === "message.part.updated") {
        const part = (event.properties as { part?: { type?: string; state?: { status?: string } } })?.part
        if (part?.type === "tool" && part.state?.status === "completed") {
          debouncedRefresh()
        }
      }
      // Also refresh when session becomes idle.
      // Note: status is a SessionStatus object ({ type: "idle" }), not a string.
      if (
        event.type === "session.status" &&
        event.properties &&
        (event.properties.status as { type?: string })?.type === "idle"
      ) {
        refreshArtifacts()
        checkStudio()
      }
    },
    [refreshArtifacts, checkStudio, debouncedRefresh],
  )

  useAgentEvents(sessionId, handleFileEvent)

  const statusType = sync.sessionStatus.type

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-14 px-6 flex items-center justify-between shrink-0 bg-white border-b border-[#E2E8F0]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#2563EB] hover:bg-[#EFF6FF] transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle()
                  if (e.key === "Escape") setEditingTitle(false)
                }}
                className="text-sm text-[#1E293B] font-medium bg-white border border-[#2563EB] rounded-md px-2 py-0.5 outline-none min-w-[120px]"
              />
            ) : locked ? (
              <div className="flex items-center gap-1.5 text-sm text-[#475569]">
                <span className="font-medium max-w-[200px] truncate">
                  {sessionTitle || sessionId.slice(0, 8)}
                </span>
                <span className="text-[#F59E0B]" title="项目已锁定">🔒</span>
              </div>
            ) : (
              <button
                onClick={startEditingTitle}
                className="group flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#2563EB] transition-colors duration-150 cursor-pointer"
                title="点击重命名"
              >
                <span className="font-medium max-w-[200px] truncate">
                  {sessionTitle || sessionId.slice(0, 8)}
                </span>
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <TokenUsageMetrics usage={tokenUsage} subagentByModel={subagentByModel} subagentCost={subagentCost} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F5F9]">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                statusType === "busy"
                  ? "bg-[#F97316] animate-pulse"
                  : statusType === "retry"
                    ? "bg-[#DC2626] animate-pulse"
                    : "bg-[#10B981]"
              }`}
            />
            <span className="text-xs text-[#475569] capitalize font-medium">{statusType}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-[480px] shrink-0 border-r border-[#E2E8F0] bg-white">
          <ChatPanel sync={sync} sessionId={sessionId} locked={locked} />
        </div>
        <div className="w-[280px] shrink-0 border-r border-[#E2E8F0] bg-white">
          <ArtifactList
            artifacts={artifacts.artifacts}
            selectedId={artifacts.selectedArtifact?.id ?? null}
            onSelect={(a) => {
              artifacts.setSelectedArtifact(a)
              setShowStudio(false)
            }}
            studioAvailable={artifacts.studioAvailable}
            onStudioSelect={() => {
              artifacts.setSelectedArtifact(null)
              setShowStudio(true)
            }}
            studioSelected={showStudio}
          />
        </div>
        <div className="flex-1 min-w-0 bg-[#F8FAFC]">
          <DetailPanel
            artifact={artifacts.selectedArtifact}
            sessionId={sessionId}
            showStudio={showStudio}
          />
        </div>
      </div>
    </div>
  )
}
