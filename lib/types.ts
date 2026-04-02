// Re-export SDK types used across the app
export type {
  // Session type
  Session,
  // Message types
  Message,
  UserMessage,
  AssistantMessage,
  // Part types
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  FilePart,
  StepStartPart,
  StepFinishPart,
  SnapshotPart,
  PatchPart,
  AgentPart,
  SubtaskPart,
  RetryPart,
  CompactionPart,
  // Tool state types
  ToolState,
  ToolStatePending,
  ToolStateRunning,
  ToolStateCompleted,
  ToolStateError,
  // Event types
  Event,
  EventMessageUpdated,
  EventMessageRemoved,
  EventMessagePartUpdated,
  EventMessagePartRemoved,
  EventPermissionAsked,
  EventPermissionReplied,
  EventSessionStatus,
  EventSessionError,
  EventQuestionAsked,
  EventQuestionReplied,
  EventQuestionRejected,
  EventFileWatcherUpdated,
  // Sub-types
  PermissionRequest,
  QuestionRequest,
  QuestionInfo,
  QuestionOption,
  SessionStatus,
} from "@opencode-ai/sdk/v2"

// Pending interaction for permission/question dialogs
export type PendingPermission = {
  kind: "permission"
  request: import("@opencode-ai/sdk/v2").PermissionRequest
}

export type PendingQuestion = {
  kind: "question"
  request: import("@opencode-ai/sdk/v2").QuestionRequest
}

export type PendingInteraction = PendingPermission | PendingQuestion

// Artifact types for the middle panel
export type ArtifactType = "manifest" | "image" | "audio" | "video" | "document" | "studio"

export interface Artifact {
  id: string
  name: string
  path: string
  type: ArtifactType
  group: string
  mime?: string
  createdAt: number
}

// Studio instance tracking
export interface StudioInstance {
  sessionId: string
  port: number
  pid: number
  status: "starting" | "running" | "stopped" | "error" | "unavailable"
  error?: string
  lastAccessTime: number
}
