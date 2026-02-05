import { useState, useEffect, useCallback } from 'react';
import { useHumanCadence } from '@rolobits/is-human-cadence/react';
import type { MetricScores } from '@rolobits/is-human-cadence';
import { SignupForm } from './components/SignupForm';
import { ScoreGauge } from './components/ScoreGauge';
import { MetricBreakdown } from './components/MetricBreakdown';
import { MetricCards } from './components/MetricCards';
import { SignalPanel } from './components/SignalPanel';

export function App() {
  const { ref, score, confident, metrics, signals, sampleCount, reset, snapshot } =
    useHumanCadence({ windowSize: 50, minSamples: 20, recordEvents: true });

  const [metricHistory, setMetricHistory] = useState<MetricScores[]>([]);

  useEffect(() => {
    if (sampleCount === 0) return;
    setMetricHistory((prev) => [...prev, metrics]);
  }, [metrics, sampleCount]);

  const handleReset = useCallback(() => {
    reset();
    setMetricHistory([]);
  }, [reset]);

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
          onReset={handleReset}
          sampleCount={sampleCount}
          score={score}
          confident={confident}
          metrics={metrics}
          signals={signals}
          onSnapshot={snapshot}
        />

        <ScoreGauge score={score} confident={confident} />

        <div className="data-grid">
          <SignalPanel signals={signals} />
          <MetricBreakdown metrics={metrics} />
        </div>

        <MetricCards metrics={metrics} history={metricHistory} />
      </div>

      <footer>
        <a
          href="https://github.com/RoloBits/isHumanCadence"
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
