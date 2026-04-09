import type { Part, SessionStatus, ToolPart } from "@/lib/types"

function isActiveToolPart(part: Part): part is ToolPart {
  return (
    part.type === "tool" &&
    (part.state.status === "pending" || part.state.status === "running")
  )
}

export function deriveEffectiveSessionStatus(
  baseStatus: SessionStatus,
  parts: Map<string, Part[]>,
): SessionStatus {
  if (baseStatus.type === "busy") return baseStatus

  for (const messageParts of parts.values()) {
    if (messageParts.some(isActiveToolPart)) {
      return { type: "busy" }
    }
  }

  return baseStatus
}
