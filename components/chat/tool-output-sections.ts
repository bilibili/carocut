import { languageFromFilePath } from "./code-language"
import type { ToolInputSection } from "./tool-input-sections"

function extractXmlTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml)
  return match ? match[1].trim() : null
}

function buildReadOutputSections(output: string): ToolInputSection[] | null {
  const filePath = extractXmlTag(output, "path")
  const type = extractXmlTag(output, "type")
  const content = extractXmlTag(output, "content")
  const language = languageFromFilePath(filePath)

  const sections: ToolInputSection[] = []

  if (type) {
    sections.push({ label: "Type", value: type, kind: "field" })
  }
  if (content) {
    sections.push({
      label: "Content",
      value: content,
      kind: "block",
      ...(language ? { language } : {}),
    })
  }

  return sections.length > 0 ? sections : null
}

function buildEditOutputSections(output: string): ToolInputSection[] | null {
  const match = /([\s\S]*?)<diagnostics\s+file="([^"]+)">([\s\S]*?)<\/diagnostics>/.exec(output)
  if (!match) {
    return null
  }

  const [, result, filePath, diagnostics] = match
  const language = languageFromFilePath(filePath)
  const sections: ToolInputSection[] = []
  const trimmedResult = result
    .replace(/\n*\s*LSP errors detected in this file, please fix:\s*$/i, "")
    .trim()
  const trimmedDiagnostics = diagnostics.trim()

  if (trimmedResult) {
    sections.push({ label: "Result", value: trimmedResult, kind: "block" })
  }
  sections.push({ label: "File", value: filePath, kind: "field" })
  if (trimmedDiagnostics) {
    sections.push({
      label: "Diagnostics",
      value: trimmedDiagnostics,
      kind: "block",
      ...(language ? { language } : {}),
    })
  }

  return sections
}

export function buildToolOutputSections(
  tool: string,
  output: string,
): ToolInputSection[] | null {
  if (tool === "read") {
    return buildReadOutputSections(output)
  }

  if (tool === "edit") {
    return buildEditOutputSections(output)
  }

  return null
}
