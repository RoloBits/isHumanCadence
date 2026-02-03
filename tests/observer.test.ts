import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createObserver } from '../src/observer';

// Minimal EventTarget mock that tracks listener options
class MockTarget extends EventTarget {
  public addedListeners: { type: string; options: any }[] = [];
  public removedListeners: string[] = [];

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    this.addedListeners.push({ type, options });
    super.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    this.removedListeners.push(type);
    super.removeEventListener(type, listener, options);
  }
}

function fireKey(target: EventTarget, type: 'keydown' | 'keyup', key: string = 'a', opts?: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent(type, { key, ...opts }));
}

function firePaste(target: EventTarget) {
  target.dispatchEvent(new Event('paste'));
}

describe('createObserver', () => {
  let target: MockTarget;
  let now: number;

  beforeEach(() => {
    target = new MockTarget();
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not listen before start()', () => {
    createObserver(target, { windowSize: 50 });
    fireKey(target, 'keydown');
    // No state change since not started — but no error either
    expect(target.addedListeners).toEqual([]);
  });

  it('attaches passive listeners on start()', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    const types = target.addedListeners.map((l) => l.type);
    expect(types).toContain('keydown');
    expect(types).toContain('keyup');
    expect(types).toContain('paste');

    // All should be passive
    for (const l of target.addedListeners) {
      expect(l.options).toEqual({ passive: true, capture: false });
    }
  });

  it('captures dwell time (keyup - keydown)', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    now = 1000;
    fireKey(target, 'keydown');
    now = 1050;
    fireKey(target, 'keyup');

    const state = obs.getState();
    expect(state.dwells.toArray()).toEqual([50]);
  });

  it('captures flight time (keydown_n - keyup_n-1)', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    // First keystroke
    now = 1000;
    fireKey(target, 'keydown');
    now = 1050;
    fireKey(target, 'keyup');

    // Second keystroke — flight = 1120 - 1050 = 70
    now = 1120;
    fireKey(target, 'keydown');
    now = 1160;
    fireKey(target, 'keyup');

    const state = obs.getState();
    expect(state.flights.toArray()).toEqual([70]);
    expect(state.dwells.toArray()).toEqual([50, 40]);
  });

  it('counts corrections for Backspace', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    now = 1000;
    fireKey(target, 'keydown', 'Backspace');
    now = 1030;
    fireKey(target, 'keyup', 'Backspace');

    expect(obs.getState().corrections).toBe(1);
  });

  it('counts corrections for Delete', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    now = 1000;
    fireKey(target, 'keydown', 'Delete');
    now = 1030;
    fireKey(target, 'keyup', 'Delete');

    expect(obs.getState().corrections).toBe(1);
  });

  it('does not count regular keys as corrections', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    now = 1000;
    fireKey(target, 'keydown', 'a');
    now = 1050;
    fireKey(target, 'keyup', 'a');

    expect(obs.getState().corrections).toBe(0);
  });

  it('tracks total keystroke count', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    for (let i = 0; i < 5; i++) {
      now = 1000 + i * 100;
      fireKey(target, 'keydown');
      now += 50;
      fireKey(target, 'keyup');
    }

    expect(obs.getState().total).toBe(5);
  });

  it('detects paste events', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    expect(obs.getState().pasteDetected).toBe(false);
    firePaste(target);
    expect(obs.getState().pasteDetected).toBe(true);
  });

  it('stop() removes listeners and preserves state', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    now = 1000;
    fireKey(target, 'keydown');
    now = 1050;
    fireKey(target, 'keyup');

    obs.stop();

    // Further events should not be captured
    now = 1200;
    fireKey(target, 'keydown');
    now = 1250;
    fireKey(target, 'keyup');

    const state = obs.getState();
    expect(state.dwells.toArray()).toEqual([50]); // only the first keystroke
    expect(state.total).toBe(1);
  });

  it('destroy() removes listeners and clears all state', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    now = 1000;
    fireKey(target, 'keydown');
    now = 1050;
    fireKey(target, 'keyup');

    obs.destroy();

    const state = obs.getState();
    expect(state.dwells.length).toBe(0);
    expect(state.flights.length).toBe(0);
    expect(state.corrections).toBe(0);
    expect(state.total).toBe(0);
    expect(state.pasteDetected).toBe(false);
  });

  it('start() is idempotent', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();
    obs.start(); // should not double-attach

    // Only 3 listeners (keydown, keyup, paste), not 6
    expect(target.addedListeners.length).toBe(3);
  });

  it('multiple keystroke sequence builds correct buffers', () => {
    const obs = createObserver(target, { windowSize: 50 });
    obs.start();

    // Type "abc" with controlled timing
    // 'a' press at 1000, release at 1040 → dwell 40
    now = 1000; fireKey(target, 'keydown');
    now = 1040; fireKey(target, 'keyup');

    // 'b' press at 1100, release at 1135 → dwell 35, flight 60
    now = 1100; fireKey(target, 'keydown');
    now = 1135; fireKey(target, 'keyup');

    // 'c' press at 1200, release at 1255 → dwell 55, flight 65
    now = 1200; fireKey(target, 'keydown');
    now = 1255; fireKey(target, 'keyup');

    const state = obs.getState();
    expect(state.dwells.toArray()).toEqual([40, 35, 55]);
    expect(state.flights.toArray()).toEqual([60, 65]);
    expect(state.total).toBe(3);
    expect(state.corrections).toBe(0);
  });

  describe('modifier-key filtering', () => {
    it('filters Cmd+C (metaKey) — no dwell, no flight, no total', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      // Cmd+C: Meta keydown then C keydown, both with metaKey: true
      now = 1000;
      fireKey(target, 'keydown', 'Meta', { metaKey: true });
      now = 1030;
      fireKey(target, 'keydown', 'c', { metaKey: true });
      now = 1060;
      fireKey(target, 'keyup', 'c', { metaKey: true });
      now = 1080;
      fireKey(target, 'keyup', 'Meta');

      const state = obs.getState();
      expect(state.dwells.toArray()).toEqual([]);
      expect(state.flights.toArray()).toEqual([]);
      expect(state.total).toBe(0);
    });

    it('filters Ctrl+C (ctrlKey)', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      now = 1000;
      fireKey(target, 'keydown', 'Control', { ctrlKey: true });
      now = 1030;
      fireKey(target, 'keydown', 'c', { ctrlKey: true });
      now = 1060;
      fireKey(target, 'keyup', 'c', { ctrlKey: true });
      now = 1080;
      fireKey(target, 'keyup', 'Control');

      const state = obs.getState();
      expect(state.dwells.toArray()).toEqual([]);
      expect(state.total).toBe(0);
    });

    it('filters Alt combos (altKey)', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      now = 1000;
      fireKey(target, 'keydown', 'Alt', { altKey: true });
      now = 1030;
      fireKey(target, 'keydown', 'f', { altKey: true });
      now = 1060;
      fireKey(target, 'keyup', 'f', { altKey: true });
      now = 1080;
      fireKey(target, 'keyup', 'Alt');

      const state = obs.getState();
      expect(state.dwells.toArray()).toEqual([]);
      expect(state.total).toBe(0);
    });

    it('filters key repeat events', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      // Initial press
      now = 1000;
      fireKey(target, 'keydown', 'a');

      // Auto-repeat events (repeat: true)
      now = 1050;
      fireKey(target, 'keydown', 'a', { repeat: true });
      now = 1100;
      fireKey(target, 'keydown', 'a', { repeat: true });

      // Release
      now = 1120;
      fireKey(target, 'keyup', 'a');

      const state = obs.getState();
      expect(state.total).toBe(1); // only the initial press
      expect(state.dwells.toArray()).toEqual([120]); // 1120 - 1000
    });

    it('does NOT filter Shift+char (normal uppercase typing)', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      // Type 'a' first to establish lastReleaseTime
      now = 1000;
      fireKey(target, 'keydown', 'a');
      now = 1050;
      fireKey(target, 'keyup', 'a');

      // Shift+A (shiftKey is NOT filtered)
      now = 1150;
      fireKey(target, 'keydown', 'A', { shiftKey: true });
      now = 1200;
      fireKey(target, 'keyup', 'A', { shiftKey: true });

      const state = obs.getState();
      expect(state.total).toBe(2);
      expect(state.dwells.toArray()).toEqual([50, 50]);
      expect(state.flights.toArray()).toEqual([100]); // 1150 - 1050
    });

    it('Ctrl+Backspace counts correction but skips timing', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      now = 1000;
      fireKey(target, 'keydown', 'Backspace', { ctrlKey: true });
      now = 1030;
      fireKey(target, 'keyup', 'Backspace');

      const state = obs.getState();
      expect(state.corrections).toBe(1); // correction counted
      expect(state.dwells.toArray()).toEqual([]); // no timing recorded
      expect(state.total).toBe(0); // not counted as a keystroke
    });

    it('typing → Cmd+C → typing: buffer has only typing data', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      // Type 'a': press 1000, release 1040 → dwell 40
      now = 1000; fireKey(target, 'keydown', 'a');
      now = 1040; fireKey(target, 'keyup', 'a');

      // Type 'b': press 1100, release 1140 → dwell 40, flight 60
      now = 1100; fireKey(target, 'keydown', 'b');
      now = 1140; fireKey(target, 'keyup', 'b');

      // Cmd+C (all filtered)
      now = 1200;
      fireKey(target, 'keydown', 'Meta', { metaKey: true });
      now = 1220;
      fireKey(target, 'keydown', 'c', { metaKey: true });
      now = 1250;
      fireKey(target, 'keyup', 'c', { metaKey: true });
      now = 1270;
      fireKey(target, 'keyup', 'Meta');

      // Type 'c': press 1400, release 1450 → dwell 50, flight 260 (from 'b' release)
      now = 1400; fireKey(target, 'keydown', 'c');
      now = 1450; fireKey(target, 'keyup', 'c');

      const state = obs.getState();
      expect(state.dwells.toArray()).toEqual([40, 40, 50]);
      expect(state.flights.toArray()).toEqual([60, 260]);
      expect(state.total).toBe(3);
    });

    it('pendingFilteredUps drains correctly with multiple filtered keys', () => {
      const obs = createObserver(target, { windowSize: 50 });
      obs.start();

      // Cmd+Shift+S (3 modifiers, all filtered due to metaKey)
      now = 1000;
      fireKey(target, 'keydown', 'Meta', { metaKey: true });
      now = 1010;
      fireKey(target, 'keydown', 'Shift', { metaKey: true, shiftKey: true });
      now = 1020;
      fireKey(target, 'keydown', 's', { metaKey: true, shiftKey: true });

      // Release all three
      now = 1050;
      fireKey(target, 'keyup', 's');
      now = 1060;
      fireKey(target, 'keyup', 'Shift');
      now = 1070;
      fireKey(target, 'keyup', 'Meta');

      // Now type a normal key — should work fine
      now = 1200;
      fireKey(target, 'keydown', 'x');
      now = 1250;
      fireKey(target, 'keyup', 'x');

      const state = obs.getState();
      expect(state.dwells.toArray()).toEqual([50]);
      expect(state.total).toBe(1);
    });
  });
});
