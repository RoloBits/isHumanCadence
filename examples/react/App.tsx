import { useHumanCadence } from '@rolobits/is-human-cadence/react';
import { SignupForm } from './components/SignupForm';
import { ScoreGauge } from './components/ScoreGauge';
import { MetricBreakdown } from './components/MetricBreakdown';
import { SignalPanel } from './components/SignalPanel';

export function App() {
  const { ref, score, confident, metrics, signals, sampleCount, reset } =
    useHumanCadence({ windowSize: 50, minSamples: 20 });

  return (
    <main>
      <header>
        <h1>is-human-cadence</h1>
        <p className="subtitle">
          React signup form demo — keystroke dynamics bot detection
        </p>
      </header>

      <div className="demo-grid">
        <SignupForm
          cadenceRef={ref}
          onReset={reset}
          sampleCount={sampleCount}
        />

        <ScoreGauge score={score} confident={confident} />

        <div className="data-grid">
          <SignalPanel signals={signals} />
          <MetricBreakdown metrics={metrics} />
        </div>
      </div>

      <footer>
        <a
          href="https://github.com/ApoloDev/isHumanCadence"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
        <span className="sep">&middot;</span>
        <a
          href="https://www.npmjs.com/package/@rolobits/is-human-cadence"
          target="_blank"
          rel="noopener"
        >
          npm
        </a>
      </footer>
    </main>
  );
}
