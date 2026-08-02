import { useState, useEffect, useCallback } from 'react';
import { useHumanCadence } from '@rolobits/is-human-cadence/react';
import type { MetricScores } from '@rolobits/is-human-cadence';
import { SignupForm } from './SignupForm';
import { ScoreGauge } from './ScoreGauge';
import { MetricBreakdown } from './MetricBreakdown';
import { MetricCards } from './MetricCards';
import { SignalPanel } from './SignalPanel';

export function DemoView() {
  const { ref, score, confident, classification, metrics, signals, sampleCount, reset, snapshot } =
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
    <>
      <p className="subtitle">
        React signup form demo — keystroke dynamics bot detection
      </p>

      <div className="demo-grid">
        <SignupForm
          cadenceRef={ref}
          onReset={handleReset}
          sampleCount={sampleCount}
          score={score}
          confident={confident}
          classification={classification}
          metrics={metrics}
          signals={signals}
          onSnapshot={snapshot}
        />

        <ScoreGauge score={score} confident={confident} classification={classification} />

        <div className="data-grid">
          <SignalPanel signals={signals} />
          <MetricBreakdown metrics={metrics} />
        </div>

        <MetricCards metrics={metrics} history={metricHistory} />
      </div>
    </>
  );
}
