const ABSOLUTE_SCHEMES = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

export function normalizeMarkdownImageSource(src: string | Blob | null | undefined): string | null {
  return typeof src === "string" ? src : null
}

export function isRelativeMarkdownImageSource(src?: string | null): boolean {
  if (!src) return false
  if (ABSOLUTE_SCHEMES.test(src)) return false
  if (src.startsWith("/")) return false
  if (src.startsWith("#")) return false
  return true
}

export function formatMarkdownImageFallback(alt: string | undefined, src: string): string {
  return `![${alt ?? ""}](${src})`
}
