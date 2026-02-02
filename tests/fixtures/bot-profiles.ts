import type { TimingData } from '../../src/types';

/** Simple seeded PRNG for deterministic tests (xorshift32) */
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

/** Box-Muller transform using seeded RNG */
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

/** Constant-interval bot: setInterval(dispatchEvent, fixed) */
export function generateConstantBot(count: number): TimingData {
  return {
    dwells: Array(count).fill(50),
    flights: Array(count).fill(100),
    corrections: 0,
    total: count,
  };
}

/** Random-jitter bot: base + Math.random() * range */
export function generateRandomJitterBot(count: number, seed: number = 42): TimingData {
  const rng = createRng(seed);
  return {
    dwells: Array.from({ length: count }, () => 30 + rng() * 40),
    flights: Array.from({ length: count }, () => 80 + rng() * 60),
    corrections: 0,
    total: count,
  };
}

/** Gaussian-jitter bot: normal distribution jitter */
export function generateGaussianBot(count: number, seed: number = 42): TimingData {
  const rng = createRng(seed);
  return {
    dwells: Array.from({ length: count }, () => Math.max(10, 55 + normalRandom(rng) * 15)),
    flights: Array.from({ length: count }, () => Math.max(10, 120 + normalRandom(rng) * 30)),
    corrections: 0,
    total: count,
  };
}

/** Replay bot: recorded human data played back without corrections */
export function generateReplayBot(humanData: TimingData): TimingData {
  return {
    dwells: [...humanData.dwells],
    flights: [...humanData.flights],
    corrections: 0,
    total: humanData.total,
  };
}
