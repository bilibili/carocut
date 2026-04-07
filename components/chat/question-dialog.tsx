"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { QuestionRequest } from "@/lib/types"

interface QuestionDialogProps {
  request: QuestionRequest
  onReply: (answer: string[][]) => void
}

export function QuestionDialog({ request, onReply }: QuestionDialogProps) {
  const questions = request.questions
  const isSingle = questions.length === 1 && !questions[0]?.multiple

  // answers[i] = selected labels for question i
  const [answers, setAnswers] = useState<string[][]>(() => questions.map(() => []))
  // custom text input per question
  const [customInputs, setCustomInputs] = useState<string[]>(() => questions.map(() => ""))
  // which question tab is active (questions.length = confirm tab)
  const [activeTab, setActiveTab] = useState(0)
  // whether custom input is being edited for current question
  const [editing, setEditing] = useState(false)

  const isConfirmTab = !isSingle && activeTab === questions.length
  const currentQuestion = questions[activeTab]
  const isMulti = currentQuestion?.multiple === true

  function pickSingle(questionIndex: number, label: string) {
    // For single-question, single-select: submit immediately
    if (isSingle) {
      onReply([[label]])
      return
    }
    // For multi-question, single-select: store answer and advance
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
    if (!value) {
      setEditing(false)
      return
    }
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

  function submitAll() {
    onReply(answers)
  }

  return (
    <div className="border-t border-[#E2E8F0] bg-[#EFF6FF]/80 backdrop-blur-xl px-4 py-3">
      <div className="rounded-xl bg-white px-4 py-3 border border-[#2563EB]/15 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-[#2563EB]/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[#2563EB]">Question</span>
          {typeof (request as Record<string, unknown>).sessionTitle === "string" && (
            <span className="text-[10px] text-[#64748B]">from <span className="font-medium text-[#475569]">{(request as Record<string, unknown>).sessionTitle as string}</span></span>
          )}
        </div>

        {/* Tabs (only for multi-question) */}
        {!isSingle && (
          <div className="flex gap-1 mb-3 flex-wrap">
            {questions.map((q, qi) => {
              const isActive = qi === activeTab
              const isAnswered = (answers[qi]?.length ?? 0) > 0
              return (
                <button
                  key={qi}
                  type="button"
                  onClick={() => { setActiveTab(qi); setEditing(false) }}
                  className={`h-[28px] px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
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
              className={`h-[28px] px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                isConfirmTab
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
              }`}
            >
              Confirm
            </button>
          </div>
        )}

        {/* Question content */}
        {!isConfirmTab && currentQuestion && (
          <div className="mb-3">
            {currentQuestion.header && (
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                {currentQuestion.header}
              </div>
            )}
            <div className="prose prose-sm max-w-none text-[#1E293B] mb-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentQuestion.question}
              </ReactMarkdown>
              {isMulti && <span className="text-[#94A3B8] ml-1">(multiple)</span>}
            </div>

            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {currentQuestion.options.map((opt) => {
                  const picked = answers[activeTab]?.includes(opt.label) ?? false
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleOptionClick(activeTab, opt.label)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        picked
                          ? "bg-[#EFF6FF] border-[#2563EB]/30 text-[#1E293B]"
                          : "bg-white border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {isMulti && (
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          picked ? "bg-[#2563EB] border-[#2563EB]" : "border-[#CBD5E1]"
                        }`}>
                          {picked && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      )}
                      <span className="font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[#94A3B8] ml-1">{opt.description}</span>
                      )}
                      {!isMulti && picked && (
                        <svg className="w-3 h-3 text-[#2563EB] ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}

                {/* Custom answer option */}
                {(currentQuestion.custom !== false) && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#E2E8F0] text-left text-xs text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    Other...
                    {customInputs[activeTab]?.trim() && !editing && (
                      <span className="text-[#1E293B] ml-1">{customInputs[activeTab]}</span>
                    )}
                  </button>
                )}

                {editing && (
                  <form
                    className="flex gap-2"
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
                      className="flex-1 h-[34px] rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:border-[#2563EB]/40 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      className="h-[34px] px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      {isMulti ? "Add" : "OK"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="h-[34px] px-3 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Next button for multi-select questions */}
            {!isSingle && isMulti && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={(answers[activeTab]?.length ?? 0) === 0}
                  onClick={() => { setActiveTab(activeTab + 1); setEditing(false) }}
                  className="h-[30px] px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirm / review tab */}
        {isConfirmTab && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-[#1E293B] mb-2">Review your answers</div>
            {questions.map((q, qi) => {
              const value = answers[qi]?.join(", ") || ""
              return (
                <div key={qi} className="flex items-start gap-2 mb-1.5">
                  <span className="text-xs text-[#64748B] min-w-0 shrink-0">{q.header || q.question}:</span>
                  <span className={`text-xs ${value ? "text-[#1E293B] font-medium" : "text-[#CBD5E1]"}`}>
                    {value || "Not answered"}
                  </span>
                </div>
              )
            })}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={submitAll}
                className="h-[34px] px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
