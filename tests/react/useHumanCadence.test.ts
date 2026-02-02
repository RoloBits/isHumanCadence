import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHumanCadence } from '../../src/react/index';

function fireKey(el: EventTarget, type: 'keydown' | 'keyup', key: string = 'a') {
  el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

describe('useHumanCadence', () => {
  let mockNow: { value: number };

  beforeEach(() => {
    mockNow = { value: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => mockNow.value);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial neutral state', () => {
    const { result } = renderHook(() => useHumanCadence());

    expect(result.current.score).toBe(0.5);
    expect(result.current.confident).toBe(false);
    expect(result.current.ref).toBeInstanceOf(Function);
    expect(result.current.reset).toBeInstanceOf(Function);
  });

  it('ref is a stable callback', () => {
    const { result, rerender } = renderHook(() => useHumanCadence());
    const ref1 = result.current.ref;
    rerender();
    const ref2 = result.current.ref;
    expect(ref1).toBe(ref2);
  });

  it('attaches to an element via ref and captures events', async () => {
    const { result } = renderHook(() =>
      useHumanCadence({ scheduling: 'manual' as any, minSamples: 5 }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);

    // Attach ref
    act(() => {
      result.current.ref(input);
    });

    // Simulate typing
    for (let i = 0; i < 10; i++) {
      mockNow.value = 1000 + i * 150;
      fireKey(input, 'keydown');
      mockNow.value += 40 + Math.floor(i * 3);
      fireKey(input, 'keyup');
    }

    // The hook uses 'idle' scheduling which falls back to setTimeout in jsdom.
    // Flush pending timers to trigger onScore callback.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    document.body.removeChild(input);
  });

  it('cleans up on ref(null)', () => {
    const { result } = renderHook(() => useHumanCadence());

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      result.current.ref(input);
    });

    // Detach — should not throw
    act(() => {
      result.current.ref(null);
    });

    // Events after detach should not cause errors
    fireKey(input, 'keydown');
    fireKey(input, 'keyup');

    document.body.removeChild(input);
  });

  it('reset returns to neutral state', () => {
    const { result } = renderHook(() => useHumanCadence());

    act(() => {
      result.current.reset();
    });

    expect(result.current.score).toBe(0.5);
    expect(result.current.confident).toBe(false);
  });

  it('cleans up on unmount', () => {
    const { result, unmount } = renderHook(() => useHumanCadence());

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      result.current.ref(input);
    });

    // Should not throw on unmount
    unmount();

    document.body.removeChild(input);
  });
});
