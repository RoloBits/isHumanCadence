// The baseline (main) engine is provided by a Vite alias (see vite.config.ts),
// not a real package, so give TypeScript its shape. Main's public API is the
// same as this branch's minus the change under review, so re-export the
// branch's types — close enough for the demo, which is not type-checked in CI.
declare module '@rolobits/is-human-cadence-baseline' {
  export * from '@rolobits/is-human-cadence';
}
declare module '@rolobits/is-human-cadence-baseline/react' {
  export * from '@rolobits/is-human-cadence/react';
}
