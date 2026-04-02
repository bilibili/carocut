"use client"

import { useCallback, useMemo } from "react"
import type { useOpenCodeSync } from "@/hooks/use-opencode-sync"
import { useCommands } from "@/hooks/use-commands"
import { useAgents } from "@/hooks/use-agents"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { PermissionDialog } from "./permission-dialog"
import { QuestionDialog } from "./question-dialog"
import { QuestionProvider } from "./question-context"

interface ChatPanelProps {
  sync: ReturnType<typeof useOpenCodeSync>
  sessionId: string
  locked?: boolean
}

export function ChatPanel({ sync, sessionId, locked }: ChatPanelProps) {
  const {
    messages,
    parts,
    sessionStatus,
    pendingInteraction,
    sendMessage,
    sendCommand,
    abortSession,
    replyPermission,
    replyQuestion,
  } = sync

  const { commands } = useCommands()
  const { agents } = useAgents()

  const handlePermissionReply = useCallback(
    (reply: "once" | "always" | "reject") => {
      if (pendingInteraction?.kind === "permission") {
        replyPermission(pendingInteraction.request.id, reply)
      }
    },
    [pendingInteraction, replyPermission],
  )

  const handleQuestionReply = useCallback(
    (answer: string[][]) => {
      if (pendingInteraction?.kind === "question") {
        replyQuestion(pendingInteraction.request.id, answer)
      }
    },
    [pendingInteraction, replyQuestion],
  )

  const questionCtx = useMemo(
    () => ({ pendingInteraction, onQuestionReply: handleQuestionReply }),
    [pendingInteraction, handleQuestionReply],
  )

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="h-12 px-5 flex items-center border-b border-[#E2E8F0]">
        <span className="text-sm font-semibold text-[#475569]">Chat</span>
      </div>

      <QuestionProvider value={questionCtx}>
        <MessageList messages={messages} parts={parts} sessionStatus={sessionStatus} sessionId={sessionId} />
      </QuestionProvider>

      {pendingInteraction?.kind === "permission" && (
        <PermissionDialog request={pendingInteraction.request} onReply={handlePermissionReply} />
      )}

      {pendingInteraction?.kind === "question" && (
        <QuestionDialog request={pendingInteraction.request} onReply={handleQuestionReply} />
      )}

      {locked ? (
        <div className="border-t border-[#E2E8F0] bg-[#FFFBEB] px-4 py-3 flex items-center gap-2 text-sm text-[#92400E]">
          <span>🔒</span>
          <span>项目已锁定，无法发送消息</span>
        </div>
      ) : (
        <ChatInput
          onSend={sendMessage}
          onCommand={sendCommand}
          onAbort={abortSession}
          disabled={sessionStatus.type === "busy"}
          commands={commands}
          agents={agents}
        />
      )}
    </div>
  )
}
