"use client"

import { useState, useEffect, type ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Image from "next/image"
import type {
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  StepFinishPart,
  FilePart,
  SubtaskPart,
  RetryPart,
  ToolStateCompleted,
  ToolStateError,
  ToolStateRunning,
} from "@/lib/types"
import { useQuestionContext } from "./question-context"
import { CodeSnippet } from "./code-snippet"
import { buildToolInputSections, type ToolInputSection } from "./tool-input-sections"
import { buildToolOutputSections } from "./tool-output-sections"
import { formatMarkdownImageFallback, isRelativeMarkdownImageSource } from "./markdown-image"

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

const markdownComponents = {
  code({ className, children, ...rest }: ComponentProps<"code"> & { className?: string }) {
    const match = /language-(\w+)/.exec(className || "")
    const codeString = String(children).replace(/\n$/, "")

    if (match) {
      return <CodeSnippet code={codeString} languageHint={match[1]} maxHeight={320} />
    }
    if (codeString.includes("\n")) {
      return <CodeSnippet code={codeString} maxHeight={320} />
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    )
  },
  img({ src, alt }: ComponentProps<"img">) {
    if (isRelativeMarkdownImageSource(src)) {
      return (
        <code>{formatMarkdownImageFallback(alt, src)}</code>
      )
    }

    if (!src) return null

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ""} className="w-full h-auto rounded-lg border border-[#E2E8F0]" />
  },
  table({ children }: ComponentProps<"table">) {
    return (
      <div className="overflow-x-auto -mx-3 px-3">
        <table className="min-w-full">{children}</table>
      </div>
    )
  },
}

// ---------------------------------------------------------------------------
// TextPartView
// ---------------------------------------------------------------------------

function TextPartView({ part, isUser }: { part: TextPart; isUser?: boolean }) {
  if (isUser) {
    return (
      <div className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">
        {part.text}
      </div>
    )
  }
  return (
    <div className="prose prose-sm max-w-none prose-p:text-[#1E293B] prose-p:leading-relaxed prose-headings:text-[#1E293B] prose-a:text-[#2563EB] prose-strong:text-[#1E293B] prose-strong:font-semibold prose-code:text-[#1E293B] prose-code:bg-[#F1F5F9] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-[#F8FAFC] prose-pre:border prose-pre:border-[#E2E8F0] prose-pre:rounded-lg">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {part.text}
      </ReactMarkdown>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReasoningPartView — purple tint, distinct from tool calls
// ---------------------------------------------------------------------------

function ReasoningPartView({ part }: { part: ReasoningPart }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg bg-[#F5F3FF] border border-[#E9E5FF] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#7C6EAB] hover:text-[#5B4F8A] transition-colors cursor-pointer"
      >
        <ChevronIcon open={open} />
        <span className="font-semibold">Thinking</span>
        <span className="ml-auto text-[10px] text-[#A89ED4]">
          {part.text.length.toLocaleString()} chars
        </span>
      </button>
      {open && (
        <div className="border-t border-[#E9E5FF] px-3 py-3 bg-[#FAFAFF]">
          <pre className="whitespace-pre-wrap font-mono text-xs text-[#64748B] leading-relaxed">
            {part.text}
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToolPartView — Claude Code style with input/output sections
// ---------------------------------------------------------------------------

function formatInput(input: Record<string, unknown>): string {
  const entries = Object.entries(input)
  if (entries.length === 0) return "(no input)"
  if (entries.length === 1) {
    const [key, value] = entries[0]
    if (typeof value === "string") return `${key}: ${value}`
  }
  return JSON.stringify(input, null, 2)
}

function StructuredToolInputView({ sections }: { sections: ToolInputSection[] }) {
  return (
    <div className="flex flex-col gap-2">
      {sections.map((section) => (
        <div key={`${section.kind}-${section.label}`}>
          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            {section.label}
          </div>
          {section.kind === "field" ? (
            <div className="font-mono text-xs text-[#1E293B] leading-relaxed bg-[#F8FAFC] rounded-lg px-2.5 py-2 border border-[#E2E8F0] break-all">
              {section.value}
            </div>
          ) : (
            <CodeSnippet
              code={section.value}
              label={section.label}
              languageHint={section.language}
              maxHeight={192}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QuestionToolView — renders question tool input as proper UI with options
// ---------------------------------------------------------------------------

interface QuestionInput {
  questions?: Array<{
    question?: string
    header?: string
    options?: Array<{ label?: string; description?: string }>
    multiple?: boolean
    custom?: boolean
  }>
}

function QuestionToolView({ part }: { part: ToolPart }) {
  const { state } = part
  const input = state.input as QuestionInput
  const questions = input?.questions ?? []
  const { pendingInteraction, onQuestionReply } = useQuestionContext()

  // Check if this question tool is the currently pending interactive question
  const isInteractive =
    (state.status === "running" || state.status === "pending") &&
    pendingInteraction?.kind === "question" &&
    pendingInteraction.request.tool?.callID === part.callID

  const isSingle = questions.length === 1 && !questions[0]?.multiple

  // Local state for interactive mode
  const [answers, setAnswers] = useState<string[][]>(() => questions.map(() => []))
  const [activeTab, setActiveTab] = useState(0)
  const [editing, setEditing] = useState(false)
  const [customInputs, setCustomInputs] = useState<string[]>(() => questions.map(() => ""))

  const isConfirmTab = !isSingle && activeTab === questions.length
  const currentQuestion = questions[activeTab]
  const isMulti = currentQuestion?.multiple === true

  function pickSingle(questionIndex: number, label: string) {
    if (isSingle) {
      onQuestionReply([[label]])
      return
    }
    const next = [...answers]
    next[questionIndex] = [label]
    setAnswers(next)
    setEditing(false)
    setActiveTab(Math.min(activeTab + 1, questions.length))
  }

  function toggleMulti(questionIndex: number, label: string) {
    const next = [...answers]
    const existing = [...(next[questionIndex] ?? [])]
    const idx = existing.indexOf(label)
    if (idx === -1) existing.push(label)
    else existing.splice(idx, 1)
    next[questionIndex] = existing
    setAnswers(next)
  }

  function handleOptionClick(questionIndex: number, label: string) {
    if (isMulti) {
      toggleMulti(questionIndex, label)
    } else {
      pickSingle(questionIndex, label)
    }
  }

  function handleCustomSubmit(questionIndex: number) {
    const value = customInputs[questionIndex]?.trim()
    if (!value) { setEditing(false); return }
    if (isMulti) {
      const next = [...answers]
      const existing = [...(next[questionIndex] ?? [])]
      if (!existing.includes(value)) existing.push(value)
      next[questionIndex] = existing
      setAnswers(next)
      setEditing(false)
    } else {
      pickSingle(questionIndex, value)
    }
  }

  const statusConfig: Record<
    string,
    { icon: string; dotClass: string; textClass: string }
  > = {
    pending: { icon: "○", dotClass: "bg-[#F97316] animate-pulse", textClass: "text-[#F97316]" },
    running: { icon: "◎", dotClass: "bg-[#F97316] animate-pulse", textClass: "text-[#F97316]" },
    completed: { icon: "✓", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]" },
    error: { icon: "✗", dotClass: "bg-[#DC2626]", textClass: "text-[#DC2626]" },
  }
  const cfg = statusConfig[state.status] ?? statusConfig.pending

  return (
    <div className="rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-5 h-5 rounded-md bg-[#2563EB]/10 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#2563EB]">question</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
          <span className={`text-[10px] font-semibold ${cfg.textClass}`}>{state.status}</span>
        </div>
      </div>

      {/* Question content */}
      <div className="border-t border-[#E2E8F0] bg-white px-3 py-2">
        {/* Tabs for multi-question (interactive mode) */}
        {isInteractive && !isSingle && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {questions.map((q, qi) => {
              const isActive = qi === activeTab
              const isAnswered = (answers[qi]?.length ?? 0) > 0
              return (
                <button
                  key={qi}
                  type="button"
                  onClick={() => { setActiveTab(qi); setEditing(false) }}
                  className={`h-[26px] px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                    isActive
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : isAnswered
                        ? "bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/20"
                        : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
                  }`}
                >
                  {q.header || `Q${qi + 1}`}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => { setActiveTab(questions.length); setEditing(false) }}
              className={`h-[26px] px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                isConfirmTab
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
              }`}
            >
              Confirm
            </button>
          </div>
        )}

        {/* Interactive mode: show one question at a time with clickable options */}
        {isInteractive && !isConfirmTab && currentQuestion && (
          <div className="mb-2">
            {currentQuestion.header && (
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
                {currentQuestion.header}
              </div>
            )}
            {currentQuestion.question && (
              <div className="prose prose-sm max-w-none text-[#1E293B] mb-1.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {currentQuestion.question}
                </ReactMarkdown>
                {isMulti && <span className="text-[#94A3B8] ml-1">(multiple)</span>}
              </div>
            )}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="flex flex-col gap-1">
                {currentQuestion.options.map((opt, oi) => {
                  const picked = answers[activeTab]?.includes(opt.label ?? "") ?? false
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => handleOptionClick(activeTab, opt.label ?? "")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs text-left transition-colors cursor-pointer ${
                        picked
                          ? "bg-[#EFF6FF] border-[#2563EB]/30"
                          : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF]/50"
                      }`}
                    >
                      {isMulti && (
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          picked ? "bg-[#2563EB] border-[#2563EB]" : "border-[#CBD5E1]"
                        }`}>
                          {picked && (
                            <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      )}
                      <span className="font-medium text-[#1E293B]">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[#94A3B8]">{opt.description}</span>
                      )}
                      {!isMulti && picked && (
                        <svg className="w-3 h-3 text-[#2563EB] ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
                {/* Custom answer */}
                {currentQuestion.custom !== false && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-dashed border-[#E2E8F0] text-xs text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors cursor-pointer text-left"
                  >
                    Other...
                    {customInputs[activeTab]?.trim() && !editing && (
                      <span className="text-[#1E293B] ml-1">{customInputs[activeTab]}</span>
                    )}
                  </button>
                )}
                {editing && (
                  <form
                    className="flex gap-1.5"
                    onSubmit={(e) => { e.preventDefault(); handleCustomSubmit(activeTab) }}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={customInputs[activeTab] ?? ""}
                      onChange={(e) => {
                        const next = [...customInputs]
                        next[activeTab] = e.target.value
                        setCustomInputs(next)
                      }}
                      placeholder="Type a custom answer..."
                      className="flex-1 h-[30px] rounded-md border border-[#E2E8F0] bg-white px-2 text-xs text-[#1E293B] placeholder-[#94A3B8] focus:border-[#2563EB]/40 focus:outline-none"
                    />
                    <button type="submit" className="h-[30px] px-2 rounded-md bg-[#2563EB] text-[11px] font-medium text-white cursor-pointer">
                      {isMulti ? "Add" : "OK"}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className="h-[30px] px-2 rounded-md border border-[#E2E8F0] text-[11px] text-[#64748B] cursor-pointer">
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )}
            {/* Next button for multi-select */}
            {!isSingle && isMulti && (
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  disabled={(answers[activeTab]?.length ?? 0) === 0}
                  onClick={() => { setActiveTab(activeTab + 1); setEditing(false) }}
                  className="h-[28px] px-2.5 rounded-md bg-[#2563EB] text-[11px] font-medium text-white transition-colors disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interactive confirm tab */}
        {isInteractive && isConfirmTab && (
          <div className="mb-2">
            <div className="text-xs font-semibold text-[#1E293B] mb-1.5">Review your answers</div>
            {questions.map((q, qi) => {
              const value = answers[qi]?.join(", ") || ""
              return (
                <div key={qi} className="flex items-start gap-2 mb-1">
                  <span className="text-[11px] text-[#64748B] shrink-0">{q.header || q.question}:</span>
                  <span className={`text-[11px] ${value ? "text-[#1E293B] font-medium" : "text-[#CBD5E1]"}`}>
                    {value || "Not answered"}
                  </span>
                </div>
              )
            })}
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={() => onQuestionReply(answers)}
                className="h-[30px] px-3 rounded-md bg-[#2563EB] text-xs font-medium text-white cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Non-interactive: show all questions as read-only */}
        {!isInteractive && questions.map((q, qi) => (
          <div key={qi} className="mb-2 last:mb-0">
            {q.header && (
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
                {q.header}
              </div>
            )}
            {q.question && (
              <div className="prose prose-sm max-w-none text-[#1E293B] mb-1.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {q.question}
                </ReactMarkdown>
                {q.multiple && <span className="text-[#94A3B8] ml-1">(multiple)</span>}
              </div>
            )}
            {q.options && q.options.length > 0 && (
              <div className="flex flex-col gap-1">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                  >
                    <span className="font-medium text-[#1E293B]">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[#94A3B8]">{opt.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Show output if completed */}
        {state.status === "completed" && (state as ToolStateCompleted).output && (
          <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Answer
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs text-[#1E293B] leading-relaxed">
              {(state as ToolStateCompleted).output}
            </pre>
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
            <div className="text-[10px] font-semibold text-[#DC2626] uppercase tracking-wider mb-1">
              Error
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs text-[#DC2626] leading-relaxed">
              {(state as ToolStateError).error}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskToolView — renders "task" tool (subagent) with summary and output
// ---------------------------------------------------------------------------

interface TaskSummaryItem {
  id: string
  tool: string
  state: { status: string; title?: string }
}

function TaskToolView({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(true)
  const { state } = part
  const input = state.input as Record<string, unknown>
  const metadata = (state.status === "running" || state.status === "completed")
    ? (state as ToolStateRunning | ToolStateCompleted).metadata ?? {}
    : {} as Record<string, unknown>

  const agentType = (input.subagent_type ?? input.name ?? "agent") as string
  const description = (input.description ?? "") as string
  const summary = (metadata.summary ?? []) as TaskSummaryItem[]
  const taskId = (metadata.sessionId as string) ?? null

  // Fetch token usage for this subagent session
  const [tokens, setTokens] = useState<{ input: number; output: number; cacheRead: number; cacheWrite: number; cost: number } | null>(null)
  useEffect(() => {
    if (!taskId) return
    let stale = false
    fetch(`/api/agent/session/${encodeURIComponent(taskId)}/tokens`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!stale && data) setTokens(data) })
      .catch(() => {})
    return () => { stale = true }
  }, [taskId, state.status])

  const statusConfig: Record<
    string,
    { icon: string; dotClass: string; textClass: string }
  > = {
    pending: { icon: "○", dotClass: "bg-[#F97316] animate-pulse", textClass: "text-[#F97316]" },
    running: { icon: "◎", dotClass: "bg-[#F97316] animate-pulse", textClass: "text-[#F97316]" },
    completed: { icon: "✓", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]" },
    error: { icon: "✗", dotClass: "bg-[#DC2626]", textClass: "text-[#DC2626]" },
  }
  const cfg = statusConfig[state.status] ?? statusConfig.pending

  const toolStatusIcon = (status: string) => {
    if (status === "completed") return "✓"
    if (status === "error") return "✗"
    if (status === "running") return "◎"
    return "○"
  }

  const toolStatusColor = (status: string) => {
    if (status === "completed") return "text-[#10B981]"
    if (status === "error") return "text-[#DC2626]"
    return "text-[#F97316]"
  }

  return (
    <div className="rounded-lg bg-[#FDF4FF] border border-[#F0ABFC]/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#FAE8FF]/60 transition-colors cursor-pointer"
      >
        <ChevronIcon open={open} />
        <svg className="w-3.5 h-3.5 text-[#A855F7] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
        <span className="text-xs font-semibold text-[#7C3AED] capitalize">{agentType}</span>
        {description && (
          <>
            <span className="text-[10px] text-[#C4B5FD]">&mdash;</span>
            <span className="text-[11px] text-[#6D28D9] truncate max-w-[200px]">{description}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
          <span className={`text-[10px] font-semibold ${cfg.textClass}`}>{state.status}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#F0ABFC]/20 bg-white">
          {/* Task ID for resume */}
          {taskId && (
            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-[#F0ABFC]/10">
              <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Task ID</span>
              <span className="font-mono text-[11px] text-[#7C3AED] select-all">{taskId}</span>
            </div>
          )}
          {/* Token usage */}
          {tokens && (tokens.input > 0 || tokens.output > 0) && (() => {
            const formatTokenStr = (n: number) => {
              if (n === 0) return "0"
              if (n > 1000_000) return `${(n / 1000_000).toFixed(2)}M`
              if (n > 1000) return `${(n / 1000).toFixed(2)}K`
              return `${n}`
            }
            const cacheStr = tokens.cacheRead > 0 ? ` (${formatTokenStr(tokens.cacheRead)} cache)` : ""
            const tokenStr = `↑ ${formatTokenStr(tokens.input)}${cacheStr} ↓ ${formatTokenStr(tokens.output)} tokens`
            const costStr = tokens.cost > 0 ? `$${tokens.cost.toFixed(4)}` : ""
            return (
              <div className="px-3 py-1 text-[10px] text-[#94A3B8] flex items-center gap-2 border-b border-[#F0ABFC]/10">
                <span className="text-[#CBD5E1]">{tokenStr}</span>
                {costStr && <span className="text-[#CBD5E1]">{costStr}</span>}
              </div>
            )
          })()}
          {/* Summary — list of tool calls the subagent made */}
          {summary.length > 0 && (
            <div className="px-3 py-2">
              <div className="flex flex-col gap-0.5">
                {summary.map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5 text-xs py-0.5">
                    <span className={`text-[10px] font-bold ${toolStatusColor(item.state.status)}`}>
                      {toolStatusIcon(item.state.status)}
                    </span>
                    <span className="font-mono text-[11px] text-[#64748B]">{item.tool}</span>
                    {item.state.title && (
                      <span className="text-[11px] text-[#94A3B8] truncate">{item.state.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output — completed */}
          {state.status === "completed" && (state as ToolStateCompleted).output && (
            <div className="px-3 py-2 border-t border-[#F0ABFC]/20">
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                Result
              </div>
              <div className="prose prose-sm max-w-none prose-p:text-[#1E293B] prose-p:text-xs prose-p:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {(state as ToolStateCompleted).output
                    .replace(/^Result\s*\ntask_id:\s*\S+[^\n]*\n*/m, "")
                    .replace(/<\/?task_result>/g, "")
                    .trim()}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Error */}
          {state.status === "error" && (
            <div className="px-3 py-2 border-t border-[#F0ABFC]/20">
              <div className="text-[10px] font-semibold text-[#DC2626] uppercase tracking-wider mb-1">
                Error
              </div>
              <CodeSnippet code={(state as ToolStateError).error} maxHeight={192} tone="error" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubtaskPartView — shows subagent invocation metadata
// ---------------------------------------------------------------------------

function SubtaskPartView({ part }: { part: SubtaskPart }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg bg-[#FDF4FF] border border-[#F0ABFC]/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#FAE8FF]/60 transition-colors cursor-pointer"
      >
        <ChevronIcon open={open} />
        <svg className="w-3 h-3 text-[#A855F7] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
        <span className="text-[11px] font-semibold text-[#7C3AED]">{part.agent}</span>
        <span className="text-[11px] text-[#6D28D9] truncate max-w-[250px]">{part.description}</span>
      </button>
      {open && (
        <div className="border-t border-[#F0ABFC]/20 bg-white px-3 py-2">
          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            Prompt
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs text-[#64748B] leading-relaxed max-h-32 overflow-y-auto">
            {part.prompt}
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RetryPartView — shows retry attempt info
// ---------------------------------------------------------------------------

function RetryPartView({ part }: { part: RetryPart }) {
  return (
    <div className="rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] px-3 py-1.5">
      <div className="flex items-center gap-2 text-xs text-[#DC2626]">
        <span className="font-bold">!</span>
        <span>Retry attempt {part.attempt}</span>
        <span className="text-[#F87171] truncate">{part.error?.data?.message ?? ""}</span>
      </div>
    </div>
  )
}

function ToolPartView({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false)

  // Render question tool with proper UI instead of raw JSON
  if (part.tool === "question") {
    return <QuestionToolView part={part} />
  }

  // Render task tool (subagent) with special UI
  if (part.tool === "task") {
    return <TaskToolView part={part} />
  }

  const { state } = part

  const statusConfig: Record<
    string,
    { icon: string; dotClass: string; textClass: string }
  > = {
    pending: { icon: "○", dotClass: "bg-[#F97316] animate-pulse", textClass: "text-[#F97316]" },
    running: { icon: "◎", dotClass: "bg-[#F97316] animate-pulse", textClass: "text-[#F97316]" },
    completed: { icon: "✓", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]" },
    error: { icon: "✗", dotClass: "bg-[#DC2626]", textClass: "text-[#DC2626]" },
  }
  const cfg = statusConfig[state.status] ?? statusConfig.pending

  const title =
    state.status === "completed"
      ? (state as ToolStateCompleted).title
      : state.status === "running"
        ? (state as ToolStateRunning).title
        : undefined
  const inputFilePath = typeof state.input.filePath === "string" ? state.input.filePath : null

  return (
    <div className="rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#E2E8F0]/60 transition-colors cursor-pointer"
      >
        <ChevronIcon open={open} />
        <span className={`text-xs font-bold ${cfg.textClass}`}>{cfg.icon}</span>
        <span className="font-mono text-xs text-[#1E293B] font-semibold">{part.tool}</span>
        {title && (
          <>
            <span className="text-[10px] text-[#94A3B8]">&mdash;</span>
            <span className="text-[11px] text-[#475569] truncate max-w-[200px]">{title}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
          <span className={`text-[10px] font-semibold ${cfg.textClass}`}>{state.status}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#E2E8F0] bg-white">
          {/* Input */}
          <div className="px-3 py-2">
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Input
            </div>
            {(() => {
              const sections = buildToolInputSections(part.tool, state.input)
              if (sections) {
                return <StructuredToolInputView sections={sections} />
              }
              return (
                <CodeSnippet
                  code={formatInput(state.input)}
                  languageHint={Object.keys(state.input).length > 1 ? "json" : null}
                  filePath={inputFilePath}
                  maxHeight={192}
                />
              )
            })()}
          </div>

          {/* Output — completed */}
          {state.status === "completed" && (
            <div className="px-3 py-2 border-t border-[#E2E8F0]">
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                Output
              </div>
              {(() => {
                const output = (state as ToolStateCompleted).output || "(empty)"
                const sections = buildToolOutputSections(part.tool, output)

                if (sections) {
                  return <StructuredToolInputView sections={sections} />
                }

                return (
                  <CodeSnippet
                    code={output}
                    filePath={inputFilePath}
                    maxHeight={256}
                  />
                )
              })()}
            </div>
          )}

          {/* Error */}
          {state.status === "error" && (
            <div className="px-3 py-2 border-t border-[#E2E8F0]">
              <div className="text-[10px] font-semibold text-[#DC2626] uppercase tracking-wider mb-1">
                Error
              </div>
              <CodeSnippet
                code={(state as ToolStateError).error}
                filePath={inputFilePath}
                maxHeight={192}
                tone="error"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StepFinishView
// ---------------------------------------------------------------------------

function StepFinishView({ part }: { part: StepFinishPart }) {
  const formatTokenStr = (tokens: number) => {
    if (tokens === 0) {
      return "0"
    }
    if (tokens > 1000_000) {
      return `${(tokens / 1000_000).toFixed(2)}M`
    }
    if (tokens > 1000) {
      return `${(tokens / 1000).toFixed(2)}K`
    }
    return `${tokens}`
  }
  const costStr = part.cost !== undefined && part.cost > 0 ? `$${part.cost.toFixed(4)}` : ""
  const cacheStr = part.tokens !== undefined && part.tokens.cache && part.tokens.cache.read > 0 ? ` (${formatTokenStr(part.tokens.cache.read)} cache)` : ""
  const tokenStr = part.tokens !== undefined
    ? `↑ ${formatTokenStr(part.tokens.input)}${cacheStr} ↓ ${formatTokenStr(part.tokens.output)} tokens`
    : ""

  return (
    <div className="text-[10px] text-[#94A3B8] py-0.5 flex items-center gap-2">
      <span>{part.reason}</span>
      {tokenStr && <span className="text-[#CBD5E1]">{tokenStr}</span>}
      {costStr && <span className="text-[#CBD5E1]">{costStr}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilePartView
// ---------------------------------------------------------------------------

function FilePartView({ part }: { part: FilePart }) {
  const isImage = part.mime?.startsWith("image/")

  if (isImage) {
    return (
      <div className="rounded-lg overflow-hidden border border-[#E2E8F0] max-w-xs">
        <Image src={part.url} alt={part.filename ?? "image"} className="w-full h-auto" width={320} height={240} unoptimized />
        {part.filename && (
          <div className="px-2 py-1 text-[10px] text-[#64748B] bg-[#F8FAFC]">
            {part.filename}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2 border border-[#E2E8F0]">
      <svg
        className="w-4 h-4 text-[#64748B] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
      <span className="text-xs text-[#1E293B] truncate">{part.filename ?? part.url}</span>
      <span className="text-[10px] text-[#94A3B8] ml-auto">{part.mime}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

interface PartRendererProps {
  part: Part
  isUser?: boolean
}

export function PartRenderer({ part, isUser }: PartRendererProps) {
  switch (part.type) {
    case "text":
      return <TextPartView part={part} isUser={isUser} />
    case "reasoning":
      return <ReasoningPartView part={part} />
    case "tool":
      return <ToolPartView part={part} />
    case "step-finish":
      return <StepFinishView part={part} />
    case "file":
      return <FilePartView part={part} />
    case "subtask":
      return <SubtaskPartView part={part} />
    case "retry":
      return <RetryPartView part={part} />
    case "step-start":
    case "snapshot":
    case "patch":
    case "agent":
    case "compaction":
      return null
    default:
      return null
  }
}
