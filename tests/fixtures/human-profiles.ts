import type { TimingData } from '../../src/types';

/** Simple seeded PRNG (xorshift32) */
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

/** Box-Muller transform */
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Simulated human typing: log-normal flight times, variable dwells,
 * random corrections at 3–15% rate, occasional pauses (bursts).
 */
export function generateHumanLike(count: number, seed: number = 123): TimingData {
  const rng = createRng(seed);

  const flights: number[] = [];
  for (let i = 0; i < count; i++) {
    // Log-normal: exp(mu + sigma * Z), median ~90ms, right-skewed
    const z = normalRandom(rng);
    let flight = Math.exp(4.5 + 0.6 * z);

    // Occasional longer pauses (thinking/bursts) ~10% of the time
    if (rng() < 0.1) {
      flight += 200 + rng() * 500;
    }

    flights.push(Math.max(15, flight));
  }

  const dwells: number[] = [];
  for (let i = 0; i < count; i++) {
    // Log-normal dwell, median ~35ms
    const z = normalRandom(rng);
    dwells.push(Math.max(10, Math.exp(3.5 + 0.4 * z)));
  }

  // Corrections at 3–15% rate
  const correctionRate = 0.03 + rng() * 0.12;
  const corrections = Math.floor(count * correctionRate);

  return { dwells, flights, corrections, total: count };
}
