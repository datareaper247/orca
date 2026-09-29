const CODEX_HEADER_LOADING_RE = /(?:model|directory):\s+loading/
const CODEX_COMPOSER_LINE_RE = /^›\s*(?:ask codex to do anything|ask a follow-up question)\s*$/i
const CODEX_ACTIVE_TURN_RE =
  /^\s*[│|]?\s*[•✻*]\s*(?:working|thinking|generating|planning|executing|running)\b/i

export function findCodexReadyPromptIndex(normalized: string): number | null {
  const headerIndex = normalized.lastIndexOf('openai codex')
  if (headerIndex === -1) {
    return null
  }
  const readySegment = normalized.slice(headerIndex)
  // Why: Codex prints permissions only in YOLO mode; the stable ready header is OpenAI Codex + model + directory.
  return readySegment.includes('model:') && readySegment.includes('directory:') ? headerIndex : null
}

// Why the header box only: chat below it can mention OpenAI Codex or model loading.
// Why loading: a header still loading is not ready; the screen must not add readiness early.
export function findCodexScreenReadyPromptIndex(screen: string): number | null {
  const headerIndex = screen.indexOf('openai codex')
  if (headerIndex === -1) {
    return null
  }
  const boxEnd = screen.indexOf('╰', headerIndex)
  const header = screen.slice(headerIndex, boxEnd === -1 ? undefined : boxEnd)
  return header.includes('model:') &&
    header.includes('directory:') &&
    !CODEX_HEADER_LOADING_RE.test(header)
    ? headerIndex
    : null
}

export function hasCodexLoadingHeader(screen: string): boolean {
  const headerIndex = screen.indexOf('openai codex')
  if (headerIndex === -1) {
    return false
  }
  const boxEnd = screen.indexOf('╰', headerIndex)
  const header = screen.slice(headerIndex, boxEnd === -1 ? undefined : boxEnd)
  return CODEX_HEADER_LOADING_RE.test(header)
}

export function findCodexComposerScreenReadyPromptIndex(normalized: string): number | null {
  const lines = normalized.split('\n')
  const headerLineIndex = lines.findIndex((line) => line.includes('openai codex'))
  if (headerLineIndex === -1) {
    return null
  }
  const headerTopIndex = lines
    .slice(0, headerLineIndex + 1)
    .findLastIndex((line) => line.includes('╭'))
  const headerBottomIndex = lines.findIndex(
    (line, index) => index > headerLineIndex && line.includes('╰')
  )
  // Why the frame: a quoted OpenAI Codex line in chat is not the running Codex header.
  if (headerTopIndex === -1 || headerBottomIndex === -1 || headerTopIndex > headerLineIndex) {
    return null
  }
  const header = lines.slice(headerTopIndex, headerBottomIndex + 1).join('\n')
  if (CODEX_HEADER_LOADING_RE.test(header)) {
    return null
  }
  const composerLineIndex = lines.findLastIndex(
    (line, index) => index > headerBottomIndex && isCodexComposerLine(line)
  )
  if (
    composerLineIndex === -1 ||
    hasCodexActiveTurn(lines.slice(headerBottomIndex + 1).join('\n'))
  ) {
    return null
  }
  return lines.slice(0, composerLineIndex).reduce((offset, line) => offset + line.length + 1, 0)
}

export function hasCodexActiveTurn(normalized: string): boolean {
  return normalized.split('\n').some((line) => CODEX_ACTIVE_TURN_RE.test(line))
}

function isCodexComposerLine(line: string): boolean {
  const withoutBorders = line
    .replace(/^\s*[│|]\s?/, '')
    .replace(/\s*[│|]\s*$/, '')
    .trim()
  return CODEX_COMPOSER_LINE_RE.test(withoutBorders)
}
