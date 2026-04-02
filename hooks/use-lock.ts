"use client"

import { useState, useCallback } from "react"

export function useLock() {
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())

  const fetchLockStatus = useCallback(async (sessionIds: string[]) => {
    const results = await Promise.all(
      sessionIds.map(async (id) => {
        try {
          const res = await fetch(`/api/agent/session/${encodeURIComponent(id)}/lock`)
          if (!res.ok) return { id, locked: false }
          const data = await res.json()
          return { id, locked: data.locked as boolean }
        } catch {
          return { id, locked: false }
        }
      }),
    )
    const newSet = new Set<string>()
    for (const r of results) {
      if (r.locked) newSet.add(r.id)
    }
    setLockedIds(newSet)
  }, [])

  const fetchSingleLockStatus = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/agent/session/${encodeURIComponent(sessionId)}/lock`)
      if (!res.ok) return false
      const data = await res.json()
      const locked = data.locked as boolean
      setLockedIds((prev) => {
        const next = new Set(prev)
        if (locked) next.add(sessionId)
        else next.delete(sessionId)
        return next
      })
      return locked
    } catch {
      return false
    }
  }, [])

  const toggleLock = useCallback(async (sessionId: string): Promise<boolean> => {
    const currentlyLocked = lockedIds.has(sessionId)
    const newLocked = !currentlyLocked
    try {
      const res = await fetch(`/api/agent/session/${encodeURIComponent(sessionId)}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: newLocked }),
      })
      if (!res.ok) return currentlyLocked
      setLockedIds((prev) => {
        const next = new Set(prev)
        if (newLocked) next.add(sessionId)
        else next.delete(sessionId)
        return next
      })
      return newLocked
    } catch {
      return currentlyLocked
    }
  }, [lockedIds])

  const isLocked = useCallback((sessionId: string) => lockedIds.has(sessionId), [lockedIds])

  return { lockedIds, fetchLockStatus, fetchSingleLockStatus, toggleLock, isLocked }
}
