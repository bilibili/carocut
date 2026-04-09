export type CodeLanguage =
  | "bash"
  | "json"
  | "yaml"
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "markdown"

export function normalizeCodeLanguage(language?: string | null): CodeLanguage | null {
  if (!language) return null
  const normalized = language.trim().toLowerCase()

  if (normalized === "sh" || normalized === "shell" || normalized === "zsh" || normalized === "bash") {
    return "bash"
  }
  if (normalized === "json") return "json"
  if (normalized === "yaml" || normalized === "yml") return "yaml"
  if (normalized === "ts" || normalized === "typescript") return "typescript"
  if (normalized === "tsx") return "tsx"
  if (normalized === "js" || normalized === "javascript") return "javascript"
  if (normalized === "jsx") return "jsx"
  if (normalized === "md" || normalized === "markdown") return "markdown"

  return null
}

export function languageFromFilePath(filePath?: string | null): CodeLanguage | null {
  if (!filePath) return null

  const match = /\.([a-zA-Z0-9]+)$/.exec(filePath)
  if (!match) return null

  return normalizeCodeLanguage(match[1])
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim()
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

function looksLikeYaml(text: string): boolean {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return false
  let yamlLikeLines = 0

  for (const line of lines) {
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue
    if (/^\s*-\s+[\w"'[{]/.test(line) || /^\s*[\w"-]+\s*:\s*.+$/.test(line) || /^\s*[\w"-]+\s*:\s*$/.test(line)) {
      yamlLikeLines += 1
    }
  }

  return yamlLikeLines >= 2
}

function looksLikeTsx(text: string): boolean {
  return /<[A-Za-z][\w.-]*(\s+[^>]*)?>/.test(text) && /\b(export|import|const|function|return)\b/.test(text)
}

function looksLikeTypeScript(text: string): boolean {
  return /\b(interface|type|enum)\b/.test(text) || /:\s*[A-Z_a-z][\w<>\[\] |]*/.test(text)
}

function looksLikeJavaScript(text: string): boolean {
  return /\b(function|const|let|var|export|import)\b/.test(text) || /=>/.test(text)
}

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s/m.test(text) || /^```/m.test(text) || /^\s*[-*]\s+/m.test(text)
}

function looksLikeShell(text: string): boolean {
  const shellLine = /^\s*(\$ )?(bun|npm|pnpm|yarn|git|cd|ls|cat|sed|rg|find|cp|mv|rm|chmod|curl|wget|python|node|tsx|npx)\b/m
  return shellLine.test(text) || /&&|\|\|/.test(text)
}

export function detectCodeLanguage(
  text: string,
  options?: {
    label?: string | null
    filePath?: string | null
    languageHint?: string | null
  },
): CodeLanguage | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const hinted = normalizeCodeLanguage(options?.languageHint)
  if (hinted) return hinted

  if (options?.label?.toLowerCase() === "command") {
    return "bash"
  }

  const fileLanguage = languageFromFilePath(options?.filePath)
  if (fileLanguage) return fileLanguage

  if (looksLikeJson(trimmed)) return "json"
  if (looksLikeYaml(trimmed)) return "yaml"
  if (looksLikeTsx(trimmed)) return looksLikeTypeScript(trimmed) ? "tsx" : "jsx"
  if (looksLikeTypeScript(trimmed)) return "typescript"
  if (looksLikeJavaScript(trimmed)) return "javascript"
  if (looksLikeMarkdown(trimmed)) return "markdown"
  if (looksLikeShell(trimmed)) return "bash"

  return null
}
