export interface RingBuffer {
  /** Push a value, overwriting the oldest if at capacity. */
  push(value: number): void;
  /** Iterate values in insertion order (oldest first). */
  forEach(fn: (value: number) => void): void;
  /** Snapshot current values as a plain array (oldest first). */
  toArray(): number[];
  /** Reset to empty without reallocating. */
  clear(): void;
  /** Current number of values stored. */
  readonly length: number;
}

/**
 * Fixed-capacity circular buffer backed by Float64Array.
 * O(1) push, zero GC pressure in steady state.
 */
export function createBuffer(capacity: number): RingBuffer {
  const data = new Float64Array(capacity);
  let head = 0;
  let count = 0;

  return {
    push(value: number) {
      data[head] = value;
      head = (head + 1) % capacity;
      if (count < capacity) count++;
    },

    forEach(fn: (value: number) => void) {
      const start = count < capacity ? 0 : head;
      for (let i = 0; i < count; i++) {
        fn(data[(start + i) % capacity]);
      }
    },

    toArray(): number[] {
      const result: number[] = new Array(count);
      const start = count < capacity ? 0 : head;
      for (let i = 0; i < count; i++) {
        result[i] = data[(start + i) % capacity];
      }
      return result;
    },

    clear() {
      head = 0;
      count = 0;
    },

    get length() {
      return count;
    },
  };
}
