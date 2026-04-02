"use client"

import type { Artifact, ArtifactType } from "@/lib/types"

const iconConfig: Record<ArtifactType, { color: string; bgColor: string }> = {
  manifest: { color: "text-[#8B5CF6]", bgColor: "bg-[#F5F3FF]" },
  image: { color: "text-[#10B981]", bgColor: "bg-[#ECFDF5]" },
  audio: { color: "text-[#F97316]", bgColor: "bg-[#FFF7ED]" },
  video: { color: "text-[#EC4899]", bgColor: "bg-[#FDF2F8]" },
  document: { color: "text-[#DC2626]", bgColor: "bg-[#FEF2F2]" },
  studio: { color: "text-[#2563EB]", bgColor: "bg-[#EFF6FF]" },
}

const typeIcons: Record<ArtifactType, React.ReactNode> = {
  manifest: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  image: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  audio: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  video: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 9 16 12 10 15 10 9"/></svg>,
  document: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  studio: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
}

interface ArtifactItemProps {
  artifact: Artifact
  selected: boolean
  onClick: () => void
}

export function ArtifactItem({ artifact, selected, onClick }: ArtifactItemProps) {
  const cfg = iconConfig[artifact.type]
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors duration-150 cursor-pointer ${selected ? "bg-[#EFF6FF] border-l-2 border-[#2563EB]" : "hover:bg-[#F8FAFC]"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bgColor}`}>
        <span className={cfg.color}>{typeIcons[artifact.type]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${selected ? "text-[#2563EB]" : "text-[#1E293B]"}`}>{artifact.name}</span>
        <span className="block truncate text-xs text-[#94A3B8]">{artifact.path.split('/').pop()}</span>
      </div>
    </button>
  )
}
