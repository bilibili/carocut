"use client"

import type { Artifact, ArtifactType } from "@/lib/types"
import { ArtifactItem } from "./artifact-item"

interface ArtifactListProps {
  artifacts: Artifact[]
  selectedId: string | null
  onSelect: (artifact: Artifact) => void
  studioAvailable: boolean
  onStudioSelect: () => void
  studioSelected: boolean
}

const sectionOrder: { type: ArtifactType; label: string }[] = [
  { type: "video", label: "导出视频" },
  { type: "manifest", label: "配置文件" },
  { type: "image", label: "图片" },
  { type: "audio", label: "音频" },
  { type: "document", label: "文档" },
]

export function ArtifactList({ artifacts, selectedId, onSelect, studioAvailable, onStudioSelect, studioSelected }: ArtifactListProps) {
  const grouped = sectionOrder
    .map(({ type, label }) => ({ type, label, items: artifacts.filter((a) => a.type === type) }))
    .filter(({ items }) => items.length > 0)

  const isEmpty = artifacts.length === 0 && !studioAvailable

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="h-12 px-5 flex items-center border-b border-[#E2E8F0]">
        <span className="text-sm font-semibold text-[#475569]">素材</span>
        <span className="ml-auto text-sm text-[#94A3B8] font-medium">{artifacts.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {studioAvailable && (
          <button type="button" onClick={onStudioSelect}
            className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 cursor-pointer ${studioSelected ? "bg-[#EFF6FF] border-l-2 border-[#2563EB]" : "hover:bg-[#F8FAFC]"}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${studioSelected ? "bg-[#2563EB]" : "bg-[#F1F5F9]"}`}>
              <svg className={`w-4 h-4 ${studioSelected ? "text-white" : "text-[#64748B]"}`} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </div>
            <div>
              <span className={`text-sm font-semibold ${studioSelected ? "text-[#2563EB]" : "text-[#1E293B]"}`}>Remotion 工作室</span>
              <span className="block text-xs text-[#94A3B8]">实时预览</span>
            </div>
          </button>
        )}

        {grouped.map(({ type, label, items }) => (
          <div key={type}>
            <div className="px-5 pt-5 pb-2">
              <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">{label}</span>
            </div>
            {items.map((artifact) => (
              <ArtifactItem key={artifact.id} artifact={artifact} selected={artifact.id === selectedId && !studioSelected} onClick={() => onSelect(artifact)} />
            ))}
          </div>
        ))}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center px-5 py-20">
            <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <p className="text-sm text-[#475569] font-medium text-center">素材将显示在此处</p>
          </div>
        )}
      </div>
    </div>
  )
}
