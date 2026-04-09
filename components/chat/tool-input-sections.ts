import { languageFromFilePath } from "./code-language"

export type ToolInputSection = {
  label: string
  value: string
  kind: "field" | "block"
  language?: string
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function pushField(
  sections: ToolInputSection[],
  label: string,
  value: unknown,
) {
  const text = asOptionalString(value)
  if (text) {
    sections.push({ label, value: text, kind: "field" })
  }
}

function pushBlock(
  sections: ToolInputSection[],
  label: string,
  value: unknown,
  language?: string | null,
) {
  const text = asOptionalString(value)
  if (text) {
    sections.push({ label, value: text, kind: "block", ...(language ? { language } : {}) })
  }
}

export function buildToolInputSections(
  tool: string,
  input: Record<string, unknown>,
): ToolInputSection[] | null {
  const sections: ToolInputSection[] = []

  if (tool === "edit") {
    const language = languageFromFilePath(asOptionalString(input.filePath))
    pushField(sections, "File", input.filePath)
    pushBlock(sections, "Old", input.oldString, language)
    pushBlock(sections, "New", input.newString, language)
    return sections.length > 0 ? sections : null
  }

  if (tool === "glob") {
    pushField(sections, "Path", input.path)
    pushField(sections, "Pattern", input.pattern)
    return sections.length > 0 ? sections : null
  }

  if (tool === "write") {
    const language = languageFromFilePath(asOptionalString(input.filePath))
    pushField(sections, "File", input.filePath)
    pushBlock(sections, "Content", input.content, language)
    return sections.length > 0 ? sections : null
  }

  if (tool === "read") {
    pushField(sections, "File", input.filePath)
    return sections.length > 0 ? sections : null
  }
  if (tool === "bash") {
    pushField(sections, "Description", input.description)
    pushBlock(sections, "Command", input.command, "bash")
    pushField(sections, "Timeout", input.timeout)
    return sections.length > 0 ? sections : null
  }

  return null
}
