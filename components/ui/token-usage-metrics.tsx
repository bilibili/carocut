"use client"

import { useState, useEffect, useRef } from "react"
import type { TokenUsage, ModelTokens } from "@/hooks/use-token-usage"

function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toString()
}

interface TokenUsageMetricsProps {
  usage: TokenUsage
  subagentByModel?: Record<string, ModelTokens>
  subagentCost?: number
}

export function TokenUsageMetrics({ usage, subagentByModel = {}, subagentCost = 0 }: TokenUsageMetricsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // merge byModel
  const merged: Record<string, ModelTokens> = {}
  for (const [m, t] of Object.entries(usage.byModel)) merged[m] = { ...t }
  for (const [m, t] of Object.entries(subagentByModel)) {
    if (!merged[m]) merged[m] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }
    merged[m].input += t.input; merged[m].output += t.output
    merged[m].cacheRead += t.cacheRead; merged[m].cacheWrite += t.cacheWrite
    merged[m].cost += t.cost ?? 0
  }

  const subTotals = Object.values(subagentByModel).reduce(
    (a, t) => ({ input: a.input + t.input, output: a.output + t.output }),
    { input: 0, output: 0 }
  )
  const totalIn = usage.input + subTotals.input
  const totalOut = usage.output + subTotals.output
  const totalCost = usage.cost + subagentCost

  if (totalIn === 0 && totalOut === 0) return null

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        <span className="font-medium">
          <span className="text-[#2563EB]">↑{fmt(totalIn)}</span>
          <span className="mx-0.5 text-[#CBD5E1]">/</span>
          <span className="text-[#10B981]">↓{fmt(totalOut)}</span>
        </span>
        {totalCost > 0 && (
          <span className="text-[#94A3B8]">${totalCost.toFixed(4)}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-3 min-w-[300px]">
          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Per-model breakdown</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-[#94A3B8]">
                <th className="text-left font-medium pb-1">Model</th>
                <th className="text-right font-medium pb-1 text-[#2563EB]">In</th>
                <th className="text-right font-medium pb-1 text-[#10B981]">Out</th>
                <th className="text-right font-medium pb-1 text-[#94A3B8]">Cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(merged).map(([model, t]) => (
                <tr key={model} className="border-t border-[#F1F5F9]">
                  <td className="py-1 pr-3 font-mono text-[11px] text-[#475569] max-w-[160px] truncate">{model}</td>
                  <td className="py-1 text-right text-[#2563EB]">{fmt(t.input)}</td>
                  <td className="py-1 text-right text-[#10B981]">{fmt(t.output)}</td>
                  <td className="py-1 text-right text-[#94A3B8]">{t.cost > 0 ? `$${t.cost.toFixed(4)}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
