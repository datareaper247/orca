import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isKnownReadyPromptBody } from '../../src/main/runtime/terminal-wait-detection'
import { createDraftPasteReadyScanner } from '../../src/shared/draft-paste-ready-scanner'
import { isVisibleReadProbeIdentityCurrent } from '../../src/main/runtime/visible-read-probe-identity'
import {
  beginVisibleReadProbeRead,
  createVisibleReadProbeRetryState,
  finishVisibleReadProbeRead,
  hasCurrentVisibleReadProbeComposerSignal,
  noteVisibleReadProbeComposerSignal,
  noteVisibleReadProbeEvent,
  shouldRetryVisibleReadProbeRead
} from '../../src/main/runtime/visible-read-probe-retry'

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
const userQuotedComposerScreen = [
  ...readyScreen.slice(0, 5),
  'User quoted: › Ask Codex to do anything'
]
const historicalComposerMentionScreen = [
  ...readyScreen.slice(0, 5),
  '› Earlier answer mentioned › Ask Codex to do anything',
  '› Ask Codex to do anything'
]
const staleHeaderBannerlessComposerScreen = [
  'OpenAI Codex (v0.158)',
  'model: GPT-6',
  'directory: ~/repo',
  '› Ask Codex to do anything'
]
const bannerlessHeaderOnlyScreen = ['OpenAI Codex (v0.158)', 'model: GPT-6', 'directory: ~/repo']
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
  '• Running the migration.',
  '› Current request',
  '› Ask Codex to do anything'
]
const otherAgentScreen = [...readyScreen.slice(0, 5), '• Running tests']
const blockerScreens = [
  ['update', 'Update available', 'Press enter to continue'],
  ['trust', 'Do you trust the contents of this directory?', 'Press enter to continue'],
  ['permission', 'Permission required', 'Press enter to continue'],
  ['workspace', 'Choose working directory to continue', 'Press enter to continue']
] as const

const capturedTranscriptNames = [
  'codex-0157-config-override-embedded-warning',
  'codex-0157-effort-override-embedded-warning',
  'codex-0157-no-daemon-effort-override',
  'codex-0157-plain-ready'
] as const

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
  isKnownReadyPromptBody('', 'codex', () => staleHistoryScreen),
  false
)
assertReadiness(
  'stale-buffer-composer',
  isKnownReadyPromptBody('› Ask Codex to do anything', 'codex', () => null),
  false
)
assertReadiness(
  'scanner-signal-without-screen',
  isKnownReadyPromptBody(
    '',
    'codex',
    () => null,
    () => true
  ),
  false
)
assertReadiness(
  'quoted-composer-after-header',
  isKnownReadyPromptBody('', 'codex', () => quotedComposerScreen),
  false
)
assertReadiness(
  'user-quoted-composer-after-header',
  isKnownReadyPromptBody('', 'codex', () => userQuotedComposerScreen),
  false
)
assertReadiness(
  'historical-composer-mention-before-current-composer',
  isKnownReadyPromptBody('', 'codex', () => historicalComposerMentionScreen),
  true
)
assertReadiness(
  'stale-header-bannerless-composer-without-signal',
  isKnownReadyPromptBody('', 'codex', () => staleHeaderBannerlessComposerScreen),
  false
)
assertReadiness(
  'bannerless-header-only-without-signal',
  isKnownReadyPromptBody(
    'OpenAI Codex\nmodel: GPT-6\ndirectory: ~/repo',
    'codex',
    () => bannerlessHeaderOnlyScreen
  ),
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
  'stale-preview-with-unrelated-screen',
  isKnownReadyPromptBody('OpenAI Codex\nmodel: GPT-6\ndirectory: ~/repo', 'codex', () => [
    'history',
    '› old prompt'
  ]),
  false
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

const retryState = createVisibleReadProbeRetryState()
const firstReadEpoch = beginVisibleReadProbeRead(retryState)
if (firstReadEpoch === null) {
  throw new Error('scanner-during-provider-read: initial read did not start')
}
noteVisibleReadProbeEvent(retryState)
assertReadiness(
  'scanner-during-provider-read-discarded',
  shouldRetryVisibleReadProbeRead(retryState, firstReadEpoch),
  true
)
assertReadiness('scanner-during-provider-read-retry', finishVisibleReadProbeRead(retryState), true)
const retryEpoch = beginVisibleReadProbeRead(retryState)
assertReadiness('scanner-during-provider-read-epoch-advanced', retryEpoch === 1, true)
assertReadiness(
  'scanner-during-provider-read-single-flight',
  beginVisibleReadProbeRead(retryState) === null,
  true
)
assertReadiness('scanner-during-provider-read-finish', finishVisibleReadProbeRead(retryState), true)

const composerSignalState = createVisibleReadProbeRetryState()
noteVisibleReadProbeComposerSignal(composerSignalState)
assertReadiness(
  'scanner-signal-current-frame',
  hasCurrentVisibleReadProbeComposerSignal(composerSignalState),
  true
)
noteVisibleReadProbeEvent(composerSignalState)
assertReadiness(
  'scanner-signal-stale-after-screen-event',
  hasCurrentVisibleReadProbeComposerSignal(composerSignalState),
  false
)

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

for (const [name, ...lines] of blockerScreens) {
  assertReadiness(
    `visible-${name}-blocker`,
    isKnownReadyPromptBody('', 'codex', () => [...readyScreen, ...lines]),
    false
  )
}

for (const name of capturedTranscriptNames) {
  const bytes = readFileSync(join('src/main/runtime/__fixtures__', `${name}.txt`), 'utf8')
  if (
    !bytes.includes('OpenAI Codex') ||
    !bytes.includes('model:') ||
    !bytes.includes('directory:')
  ) {
    throw new Error(`captured transcript ${name} is missing Codex header evidence`)
  }
  process.stdout.write(`captured-transcript-${name}: present\n`)
}
