import { describe, it, expect } from 'vitest';
import { createBuffer } from '../src/buffer';

describe('createBuffer', () => {
  it('starts empty', () => {
    const buf = createBuffer(5);
    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('pushes values under capacity', () => {
    const buf = createBuffer(5);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.length).toBe(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
  });

  it('fills to exact capacity', () => {
    const buf = createBuffer(3);
    buf.push(10);
    buf.push(20);
    buf.push(30);
    expect(buf.length).toBe(3);
    expect(buf.toArray()).toEqual([10, 20, 30]);
  });

  it('overwrites oldest when over capacity', () => {
    const buf = createBuffer(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4); // overwrites 1
    expect(buf.length).toBe(3);
    expect(buf.toArray()).toEqual([2, 3, 4]);
  });

  it('wraps around multiple times', () => {
    const buf = createBuffer(3);
    for (let i = 1; i <= 10; i++) buf.push(i);
    expect(buf.length).toBe(3);
    expect(buf.toArray()).toEqual([8, 9, 10]);
  });

  it('forEach iterates in insertion order', () => {
    const buf = createBuffer(3);
    buf.push(10);
    buf.push(20);
    buf.push(30);
    buf.push(40); // wraps

    const collected: number[] = [];
    buf.forEach((v) => collected.push(v));
    expect(collected).toEqual([20, 30, 40]);
  });

  it('forEach works under capacity', () => {
    const buf = createBuffer(5);
    buf.push(7);
    buf.push(8);

    const collected: number[] = [];
    buf.forEach((v) => collected.push(v));
    expect(collected).toEqual([7, 8]);
  });

  it('clear resets to empty', () => {
    const buf = createBuffer(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.clear();

    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('works correctly after clear and re-fill', () => {
    const buf = createBuffer(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.clear();
    buf.push(10);
    buf.push(20);

    expect(buf.length).toBe(2);
    expect(buf.toArray()).toEqual([10, 20]);
  });

  it('handles capacity of 1', () => {
    const buf = createBuffer(1);
    buf.push(5);
    expect(buf.toArray()).toEqual([5]);
    buf.push(10);
    expect(buf.toArray()).toEqual([10]);
    expect(buf.length).toBe(1);
  });
});
