"use client"

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"

import { detectCodeLanguage, normalizeCodeLanguage } from "./code-language"

type CodeSnippetProps = {
  code: string
  languageHint?: string | null
  label?: string | null
  filePath?: string | null
  maxHeight?: number
  tone?: "default" | "error"
}

export function CodeSnippet({
  code,
  languageHint,
  label,
  filePath,
  maxHeight = 256,
  tone = "default",
}: CodeSnippetProps) {
  const language =
    normalizeCodeLanguage(languageHint) ??
    detectCodeLanguage(code, { label, filePath })

  const palette =
    tone === "error"
      ? {
          background: "#FEF2F2",
          border: "#FEE2E2",
          text: "#DC2626",
        }
      : {
          background: "#F8FAFC",
          border: "#E2E8F0",
          text: "#1E293B",
        }

  if (!language) {
    return (
      <pre
        className="whitespace-pre-wrap font-mono text-xs leading-relaxed rounded-lg px-2.5 py-2 border overflow-y-auto"
        style={{
          backgroundColor: palette.background,
          borderColor: palette.border,
          color: palette.text,
          maxHeight,
        }}
      >
        {code}
      </pre>
    )
  }

  return (
    <SyntaxHighlighter
      style={oneLight}
      language={language}
      PreTag="div"
      wrapLongLines
      customStyle={{
        margin: 0,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: "8px",
        fontSize: "12px",
        lineHeight: 1.5,
        maxHeight,
        overflowY: "auto",
      }}
      codeTagProps={{
        style: {
          color: tone === "error" ? palette.text : undefined,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
      }}
    >
      {code}
    </SyntaxHighlighter>
  )
}
