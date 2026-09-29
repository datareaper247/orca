import { isKnownReadyPromptBody } from '../../src/main/runtime/terminal-wait-detection'

const readyScreen = [
  '╭────────────────────────╮',
  '│ >_ OpenAI Codex (v0.158) │',
  '│ model: GPT-6             │',
  '│ directory: ~/repo       │',
  '╰────────────────────────╯',
  '› Ask Codex to do anything'
]
const loadingScreen = [
  '╭────────────────────────╮',
  '│ >_ OpenAI Codex (v0.158) │',
  '│ model: loading          │',
  '│ directory: loading      │',
  '╰────────────────────────╯',
  '› Ask Codex to do anything'
]
const activeScreen = [
  ...readyScreen.slice(0, 5),
  '› Summarize the repository layout',
  '• Working (12s • esc to interrupt)',
  '› Ask Codex to do anything'
]
const quotedScreen = [
  ...readyScreen.slice(0, 5),
  '› Why does OpenAI Codex print model: loading at startup?'
]
const staleHistoryScreen = [
  'Previous conversation:',
  '› OpenAI Codex was ready in the earlier turn',
  '• Working (completed earlier)'
]

function assertReadiness(label: string, actual: boolean, expected: boolean): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`)
  }
  process.stdout.write(`${label}: ${actual ? 'ready' : 'blocked'}\n`)
}

assertReadiness(
  'current-composer',
  isKnownReadyPromptBody('', 'codex', () => readyScreen),
  true
)
assertReadiness(
  'loading-header',
  isKnownReadyPromptBody('', 'codex', () => loadingScreen),
  false
)
assertReadiness(
  'loading-header-vetoes-stale-text',
  isKnownReadyPromptBody(
    'OpenAI Codex\nmodel: GPT-6\ndirectory: ~/repo',
    'codex',
    () => loadingScreen
  ),
  false
)
assertReadiness(
  'active-turn',
  isKnownReadyPromptBody('', 'codex', () => activeScreen),
  false
)
assertReadiness(
  'quoted-chat',
  isKnownReadyPromptBody('', 'codex', () => quotedScreen),
  true
)
assertReadiness(
  'stale-history',
  isKnownReadyPromptBody(
    'OpenAI Codex\nmodel: GPT-6\ndirectory: ~/repo',
    'codex',
    () => staleHistoryScreen
  ),
  false
)
assertReadiness(
  'stale-buffer-composer',
  isKnownReadyPromptBody('› Ask Codex to do anything', 'codex', () => null),
  false
)
assertReadiness(
  'mid-turn-composer',
  isKnownReadyPromptBody(activeScreen.join('\n'), 'codex', () => activeScreen),
  false
)
