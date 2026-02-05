import { createBuffer, type RingBuffer } from './buffer';
import type { KeystrokeEvent } from './types';

/** Max ms between last keydown and an input event to consider it keystroke-driven. */
const INPUT_WITHOUT_KEYSTROKE_MS = 50;

export interface ObserverConfig {
  /** Sliding window size. Default: 50 */
  windowSize: number;
  /** Record per-keystroke event log. Default: false */
  recordEvents?: boolean;
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
  /** Per-keystroke event log (undefined when recordEvents is false) */
  events?: KeystrokeEvent[];
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

  // Per-keystroke event recording (opt-in)
  const recordEvents = config.recordEvents === true;
  let events: KeystrokeEvent[] | undefined = recordEvents ? [] : undefined;
  // Stack of pending presses to pair keydown→keyup for event recording.
  // Needed because overlapping keys (rollovers) can have multiple pending presses.
  let pendingPresses: { pressTime: number; isCorrection: boolean; isRollover: boolean }[] = [];

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
    const isRollover = activeKeys > 1;
    if (isRollover) rollovers++;
    total++;

    // Flight time: gap between previous key release and this key press
    if (lastReleaseTime > 0 && activeKeys === 1) {
      flights.push(now - lastReleaseTime);
    }

    // Record pending press for event log
    if (recordEvents) {
      const isCorrection = ke.key === 'Backspace' || ke.key === 'Delete';
      pendingPresses.push({ pressTime: now, isCorrection, isRollover });
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

    // Complete the event record (pop oldest pending press — FIFO for correct pairing)
    if (recordEvents && pendingPresses.length > 0) {
      if (!hadRepeat) {
        const pending = pendingPresses.shift();
        if (pending && events) {
          events.push({
            pressTime: pending.pressTime,
            releaseTime: now,
            isCorrection: pending.isCorrection,
            isRollover: pending.isRollover,
          });
        }
      } else {
        // Held key with repeat — discard the pending press without recording
        pendingPresses.shift();
      }
    }

    hadRepeat = false;

    activeKeys = Math.max(0, activeKeys - 1);
    lastReleaseTime = now;
  };

  const onPaste = () => {
    pasteDetected = true;
  };

  const onInput = () => {
    if (performance.now() - lastKeydownTime > INPUT_WITHOUT_KEYSTROKE_MS) {
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
    if (recordEvents) { events = []; pendingPresses = []; }
  }

  function destroy() {
    stop();
    clear();
  }

  function getState(): ObserverState {
    return { dwells, flights, corrections, rollovers, total, pasteDetected, syntheticEvents, inputWithoutKeystrokes, inputWithoutKeystrokeCount, ...(events && { events }) };
  }

  return { start, stop, clear, destroy, getState };
}
