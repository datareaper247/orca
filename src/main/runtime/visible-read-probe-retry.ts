export type VisibleReadProbeRetryState = {
  screenEpoch: number
  readInFlight: boolean
  retryRequested: boolean
}

export function createVisibleReadProbeRetryState(): VisibleReadProbeRetryState {
  return { screenEpoch: 0, readInFlight: false, retryRequested: false }
}

/** Starts a read and returns its screen epoch, or records a coalesced retry when one is active. */
export function beginVisibleReadProbeRead(state: VisibleReadProbeRetryState): number | null {
  if (state.readInFlight) {
    state.retryRequested = true
    return null
  }
  state.readInFlight = true
  state.retryRequested = false
  return state.screenEpoch
}

/** Advances the rendered-screen epoch and remembers that an active read must be retried. */
export function noteVisibleReadProbeEvent(state: VisibleReadProbeRetryState): void {
  state.screenEpoch += 1
  if (state.readInFlight) {
    state.retryRequested = true
  }
}

export function shouldRetryVisibleReadProbeRead(
  state: VisibleReadProbeRetryState,
  capturedScreenEpoch: number
): boolean {
  return state.retryRequested || state.screenEpoch !== capturedScreenEpoch
}

/** Finishes a read and returns whether its coalesced retry should start immediately. */
export function finishVisibleReadProbeRead(state: VisibleReadProbeRetryState): boolean {
  state.readInFlight = false
  const retryRequested = state.retryRequested
  state.retryRequested = false
  return retryRequested
}
