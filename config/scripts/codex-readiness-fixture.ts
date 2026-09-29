import { isKnownReadyPromptBody } from '../../src/main/runtime/terminal-wait-detection'
import { createDraftPasteReadyScanner } from '../../src/shared/draft-paste-ready-scanner'
import { isVisibleReadProbeIdentityCurrent } from '../../src/main/runtime/visible-read-probe-identity'

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
const quotedComposerScreen = [...readyScreen.slice(0, 5), '“› Ask Codex to do anything”']
const bannerlessComposerScreen = ['› Ask Codex to do anything']
const completedTurnScreen = [
  ...readyScreen.slice(0, 5),
  '› Summarize the repository layout',
  '• Working (completed earlier)',
  '› Ask Codex to do anything'
]
const historicalActiveTurnScreen = [
  ...readyScreen.slice(0, 5),
  '› Earlier request',
  '• Working (12s • esc to interrupt)',
  '› Current request',
  '› Ask Codex to do anything'
]
const otherAgentScreen = [...readyScreen.slice(0, 5), '• Running tests']

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
  'loading-header-does-not-veto-text',
  isKnownReadyPromptBody(
    'OpenAI Codex\nmodel: GPT-6\ndirectory: ~/repo',
    'codex',
    () => loadingScreen
  ),
  true
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
  isKnownReadyPromptBody('', 'codex', () => staleHistoryScreen),
  false
)
assertReadiness(
  'stale-buffer-composer',
  isKnownReadyPromptBody('› Ask Codex to do anything', 'codex', () => null),
  false
)
assertReadiness(
  'quoted-composer-after-header',
  isKnownReadyPromptBody('', 'codex', () => quotedComposerScreen),
  false
)
assertReadiness(
  'bannerless-current-composer-without-signal',
  isKnownReadyPromptBody('', 'codex', () => bannerlessComposerScreen),
  false
)
assertReadiness(
  'bannerless-current-composer-after-signal',
  isKnownReadyPromptBody(
    '',
    'codex',
    () => bannerlessComposerScreen,
    () => true
  ),
  true
)
assertReadiness(
  'completed-turn-history',
  isKnownReadyPromptBody('', 'codex', () => completedTurnScreen),
  true
)
assertReadiness(
  'historical-active-turn',
  isKnownReadyPromptBody('', 'codex', () => historicalActiveTurnScreen),
  true
)
assertReadiness(
  'other-agent-running-text',
  isKnownReadyPromptBody(
    'OpenAI Codex\nmodel: GPT-6\ndirectory: ~/repo',
    'cursor',
    () => otherAgentScreen
  ),
  true
)

const scanner = createDraftPasteReadyScanner('codex-composer-prompt')
assertReadiness('current-scanner-anchor', scanner.observe('\x1b[?2004h').ready, false)
assertReadiness('current-scanner-composer', scanner.observe('›').ready, true)

const capturedIdentity = {
  ptyId: 'pty-current',
  rendererGraphEpoch: 7,
  ptyGeneration: 3,
  lifecycleGeneration: 11,
  outputSequence: 17
}
assertReadiness(
  'provider-screen-output-race',
  // The provider snapshot watermark accepts bytes that arrive during the read.
  isVisibleReadProbeIdentityCurrent(
    capturedIdentity,
    { ...capturedIdentity, outputSequence: 18 },
    true
  ),
  true
)
assertReadiness(
  'provider-screen-replacement-race',
  isVisibleReadProbeIdentityCurrent(
    capturedIdentity,
    { ...capturedIdentity, ptyId: 'pty-replacement' },
    true
  ),
  false
)
assertReadiness(
  'mid-turn-composer',
  isKnownReadyPromptBody(activeScreen.join('\n'), 'codex', () => activeScreen),
  false
)
