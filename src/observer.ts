import { createBuffer, type RingBuffer } from './buffer';

export interface ObserverConfig {
  /** Sliding window size. Default: 50 */
  windowSize: number;
}

export interface ObserverState {
  dwells: RingBuffer;
  flights: RingBuffer;
  corrections: number;
  rollovers: number;
  total: number;
  pasteDetected: boolean;
  syntheticEvents: number;
  inputWithoutKeystrokes: boolean;
  inputWithoutKeystrokeCount: number;
}

export interface Observer {
  start(): void;
  stop(): void;
  clear(): void;
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
  let rollovers = 0;
  let total = 0;
  let pasteDetected = false;
  let syntheticEvents = 0;
  let inputWithoutKeystrokes = false;
  let inputWithoutKeystrokeCount = 0;
  let lastKeydownTime = 0;

  // Track press timestamps by key code-agnostic slot.
  // We use a single "last press" timestamp since we only care about
  // timing, not which key. Overlapping keys (held simultaneously)
  // are handled by tracking active press count.
  let lastPressTime = 0;
  let lastReleaseTime = 0;
  let activeKeys = 0;
  let pendingFilteredUps = 0;
  let hadRepeat = false;

  const onKeyDown = (e: Event) => {
    const now = performance.now();
    lastKeydownTime = now;
    const ke = e as KeyboardEvent;

    // Count programmatically dispatched events (isTrusted is false)
    if (!e.isTrusted) syntheticEvents++;

    // Correction check — runs before modifier filter so Ctrl+Backspace still counts
    if (ke.key === 'Backspace' || ke.key === 'Delete') {
      corrections++;
    }

    // Skip auto-repeat — held keys don't generate extra keyups
    if (ke.repeat) { hadRepeat = true; return; }

    // Skip modifier-key shortcuts — not typing
    if (ke.metaKey || ke.ctrlKey || ke.altKey) {
      pendingFilteredUps++;
      return;
    }

    activeKeys++;
    if (activeKeys > 1) rollovers++;
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

    if (lastPressTime > 0 && !hadRepeat) {
      dwells.push(now - lastPressTime);
    }
    hadRepeat = false;

    activeKeys = Math.max(0, activeKeys - 1);
    lastReleaseTime = now;
  };

  const onPaste = () => {
    pasteDetected = true;
  };

  const onInput = () => {
    if (performance.now() - lastKeydownTime > 50) {
      inputWithoutKeystrokes = true;
      inputWithoutKeystrokeCount++;
      lastReleaseTime = 0;
    }
  };

  const listenerOpts: AddEventListenerOptions = { passive: true, capture: false };
  let listening = false;

  function start() {
    if (listening) return;
    target.addEventListener('keydown', onKeyDown, listenerOpts);
    target.addEventListener('keyup', onKeyUp, listenerOpts);
    target.addEventListener('paste', onPaste, listenerOpts);
    target.addEventListener('input', onInput, listenerOpts);
    listening = true;
  }

  function stop() {
    if (!listening) return;
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('paste', onPaste);
    target.removeEventListener('input', onInput);
    listening = false;
  }

  function clear() {
    dwells.clear();
    flights.clear();
    corrections = 0;
    rollovers = 0;
    total = 0;
    pasteDetected = false;
    syntheticEvents = 0;
    inputWithoutKeystrokes = false;
    inputWithoutKeystrokeCount = 0;
    lastKeydownTime = 0;
    lastPressTime = 0;
    lastReleaseTime = 0;
    activeKeys = 0;
    pendingFilteredUps = 0;
    hadRepeat = false;
  }

  function destroy() {
    stop();
    clear();
  }

  function getState(): ObserverState {
    return { dwells, flights, corrections, rollovers, total, pasteDetected, syntheticEvents, inputWithoutKeystrokes, inputWithoutKeystrokeCount };
  }

  return { start, stop, clear, destroy, getState };
}
