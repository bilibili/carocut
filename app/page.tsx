"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/hooks/use-session"
import { useLock } from "@/hooks/use-lock"
import { Logo, LogoIcon } from "@/components/ui/logo"

export default function HomePage() {
  const router = useRouter()
  const { sessions, loading, fetchSessions, createSession, updateSession, deleteSession } = useSession()
  const { fetchLockStatus, toggleLock, isLocked } = useLock()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSessions().then((data) => {
      if (data && data.length > 0) {
        fetchLockStatus(data.map((s) => s.id))
      }
    })
  }, [fetchSessions, fetchLockStatus])

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    const { session, error } = await createSession("New Video Project")
    if (error) { setCreating(false); setErrorMsg(error); return }
    if (!session) { setCreating(false); return }
    router.push(`/session/${session.id}`)
  }

  const startEditing = (id: string, currentTitle: string) => {
    if (isLocked(id)) return
    setEditingId(id)
    setEditValue(currentTitle || "")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = async () => {
    if (!editingId) return
    const trimmed = editValue.trim()
    if (trimmed) {
      const { error } = await updateSession(editingId, trimmed)
      if (error) setErrorMsg(error)
    }
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    const { error } = await deleteSession(deletingId)
    setDeleting(false)
    if (error) setErrorMsg(error)
    setDeletingId(null)
  }

  const deletingSession = sessions.find((s) => s.id === deletingId)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-[#E2E8F0]">
        <Logo size="md" />
        <button
          onClick={handleCreate}
          className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          新建项目
        </button>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {errorMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span className="flex-1">{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-[#DC2626] hover:text-[#B91C1C] cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-[#475569] uppercase tracking-wide">项目列表</h2>
          <span className="text-sm text-[#94A3B8] font-medium">{sessions.length}</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <p className="text-base text-[#475569] font-medium mb-2">暂无项目</p>
            <p className="text-sm text-[#94A3B8] mb-4">创建您的第一个视频项目</p>
            <button onClick={handleCreate} className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium cursor-pointer transition-colors duration-150">
              创建项目 →
            </button>
          </div>
        )}

        <div className="rounded-xl overflow-hidden bg-white border border-[#E2E8F0]">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className={`group flex items-center justify-between px-5 py-4 cursor-pointer transition-colors duration-150 hover:bg-[#F8FAFC] ${i > 0 ? "border-t border-[#E2E8F0]" : ""}`}
              onClick={() => { if (editingId !== s.id) router.push(`/session/${s.id}`) }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <LogoIcon size="lg" />
                <div className="min-w-0">
                  {editingId === s.id ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit()
                        if (e.key === "Escape") cancelEdit()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-base text-[#1E293B] font-medium bg-white border border-[#2563EB] rounded-md px-2 py-0.5 outline-none w-full"
                    />
                  ) : (
                    <div
                      className={`text-base text-[#1E293B] font-medium truncate transition-colors duration-150 ${isLocked(s.id) ? "" : "hover:text-[#2563EB] cursor-text"}`}
                      onClick={(e) => { e.stopPropagation(); startEditing(s.id, s.title) }}
                      title={isLocked(s.id) ? "项目已锁定" : "点击重命名"}
                    >
                      {isLocked(s.id) && <span className="mr-1.5">🔒</span>}
                      {s.title || "Untitled"}
                    </div>
                  )}
                  <div className="text-sm text-[#94A3B8] mt-0.5">
                    {s.time?.created ? new Date(s.time.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLock(s.id) }}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer ${
                    isLocked(s.id)
                      ? "text-[#F59E0B] hover:text-[#D97706] hover:bg-[#FFFBEB]"
                      : "opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9]"
                  }`}
                  title={isLocked(s.id) ? "解锁项目" : "锁定项目"}
                >
                  {isLocked(s.id) ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                  )}
                </button>
                {!isLocked(s.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(s.id, s.title) }}
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all duration-150 cursor-pointer"
                    title="重命名"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                )}
                {!isLocked(s.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingId(s.id) }}
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all duration-150 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                )}
                <svg className="w-5 h-5 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>
          ))}
        </div>
      </main>

      {creating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
            <p className="text-sm text-[#475569] font-medium">正在创建项目…</p>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !deleting && setDeletingId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1E293B] mb-2">确认删除</h3>
            <p className="text-sm text-[#64748B] mb-4">
              确定要删除项目 <span className="font-medium text-[#1E293B]">"{deletingSession?.title || "Untitled"}"</span> 吗？项目文件也会被删除，此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#1E293B] disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="h-12 flex items-center justify-center gap-2 border-t border-[#E2E8F0]">
        <span className="text-xs text-[#94A3B8]">CaroCut v0.1</span>
        <span className="text-xs text-[#CBD5E1]">·</span>
        <a href="https://github.com/bilibili/carocut" target="_blank" rel="noopener noreferrer" className="text-xs text-[#94A3B8] hover:text-[#2563EB] transition-colors duration-150">
          GitHub
        </a>
      </footer>
    </div>
  )
}
