import { createBuffer, type RingBuffer } from './buffer';

export interface ObserverConfig {
  /** Sliding window size. Default: 50 */
  windowSize: number;
}

export interface ObserverState {
  dwells: RingBuffer;
  flights: RingBuffer;
  corrections: number;
  total: number;
  pasteDetected: boolean;
}

export interface Observer {
  start(): void;
  stop(): void;
  destroy(): void;
  getState(): ObserverState;
}

/**
 * Factory that attaches passive keydown/keyup listeners to a target.
 * Captures only timestamps — never reads key identity beyond the
 * Backspace/Delete boolean check for correction counting.
 */
export function createObserver(
  target: EventTarget,
  config: ObserverConfig,
): Observer {
  const dwells = createBuffer(config.windowSize);
  const flights = createBuffer(config.windowSize);
  let corrections = 0;
  let total = 0;
  let pasteDetected = false;

  // Track press timestamps by key code-agnostic slot.
  // We use a single "last press" timestamp since we only care about
  // timing, not which key. Overlapping keys (held simultaneously)
  // are handled by tracking active press count.
  let lastPressTime = 0;
  let lastReleaseTime = 0;
  let activeKeys = 0;
  let pendingFilteredUps = 0;

  const onKeyDown = (e: Event) => {
    const now = performance.now();
    const ke = e as KeyboardEvent;

    // Correction check — runs before modifier filter so Ctrl+Backspace still counts
    if (ke.key === 'Backspace' || ke.key === 'Delete') {
      corrections++;
    }

    // Skip auto-repeat — held keys don't generate extra keyups
    if (ke.repeat) return;

    // Skip modifier-key shortcuts — not typing
    if (ke.metaKey || ke.ctrlKey || ke.altKey) {
      pendingFilteredUps++;
      return;
    }

    activeKeys++;
    total++;

    // Flight time: gap between previous key release and this key press
    if (lastReleaseTime > 0 && activeKeys === 1) {
      flights.push(now - lastReleaseTime);
    }

    lastPressTime = now;
  };

  const onKeyUp = () => {
    if (pendingFilteredUps > 0) {
      pendingFilteredUps--;
      return;
    }

    const now = performance.now();

    if (lastPressTime > 0) {
      dwells.push(now - lastPressTime);
    }

    activeKeys = Math.max(0, activeKeys - 1);
    lastReleaseTime = now;
  };

  const onPaste = () => {
    pasteDetected = true;
  };

  const listenerOpts: AddEventListenerOptions = { passive: true, capture: false };
  let listening = false;

  function start() {
    if (listening) return;
    target.addEventListener('keydown', onKeyDown, listenerOpts);
    target.addEventListener('keyup', onKeyUp, listenerOpts);
    target.addEventListener('paste', onPaste, listenerOpts);
    listening = true;
  }

  function stop() {
    if (!listening) return;
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('paste', onPaste);
    listening = false;
  }

  function destroy() {
    stop();
    dwells.clear();
    flights.clear();
    corrections = 0;
    total = 0;
    pasteDetected = false;
    lastPressTime = 0;
    lastReleaseTime = 0;
    activeKeys = 0;
    pendingFilteredUps = 0;
  }

  function getState(): ObserverState {
    return { dwells, flights, corrections, total, pasteDetected };
  }

  return { start, stop, destroy, getState };
}
