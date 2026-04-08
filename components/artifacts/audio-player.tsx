"use client"

interface AudioPlayerProps {
  src: string
  name: string
  path?: string
}

export function AudioPlayer({ src, name, path }: AudioPlayerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      <div className="w-16 h-16 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-[#FF9500]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <p className="text-[15px] font-medium text-[#1C1C1E] mb-4">{name}</p>
      {path && <p className="text-[12px] text-[#8E8E93] mb-6 break-all text-center">{path}</p>}
      <audio controls className="w-full max-w-md" preload="metadata"><source src={src} />Your browser does not support the audio element.</audio>
    </div>
  )
}
