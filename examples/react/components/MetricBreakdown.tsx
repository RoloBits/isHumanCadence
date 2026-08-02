import type { MetricScores } from '@rolobits/is-human-cadence';

function scoreColor(score: number): string {
  if (score < 0.4) return 'var(--red)';
  if (score < 0.65) return 'var(--yellow)';
  return 'var(--green)';
}

const METRIC_INFO: { key: keyof MetricScores; label: string; tooltip: string }[] = [
  {
    key: 'dwellVariance',
    label: 'Dwell Variance',
    tooltip: 'How much key-hold durations vary. Humans: 15\u201360ms spread. Bots: nearly identical every time.',
  },
  {
    key: 'flightFit',
    label: 'Flight Fit',
    tooltip: 'How well time between keystrokes fits a log-normal curve. Humans score high; bots produce flat, uniform timing.',
  },
  {
    key: 'timingEntropy',
    label: 'Timing Entropy',
    tooltip: 'Randomness in keystroke timing. Humans show moderate entropy. Bots are either too uniform or too constant.',
  },
  {
    key: 'correctionRatio',
    label: 'Correction Ratio',
    tooltip: 'Rate of Backspace/Delete usage. Humans: 2\u201315%. Bots: 0% or suspiciously exact.',
  },
  {
    key: 'burstRegularity',
    label: 'Burst Regularity',
    tooltip: 'Variation in pauses between typing bursts. Humans pause unevenly. Bots are metronomic.',
  },
  {
    key: 'rolloverRate',
    label: 'Rollover Rate',
    tooltip: 'Key overlap — pressing the next key before releasing the current one. Skilled typists: 25–50%. Bots: 0%.',
  },
];

interface MetricBreakdownProps {
  metrics: MetricScores;
}

export function MetricBreakdown({ metrics }: MetricBreakdownProps) {
  return (
    <section className="metrics-section">
      <h2>Metric Breakdown</h2>
      <div className="metric-list">
        {METRIC_INFO.map(({ key, label, tooltip }) => {
          const value = metrics[key];
          return (
            <div className="metric-row" key={key}>
              <span className="metric-name has-tooltip" data-tooltip={tooltip}>
                {label}
              </span>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{
                    width: `${(value * 100).toFixed(1)}%`,
                    backgroundColor: scoreColor(value),
                  }}
                />
              </div>
              <span className="metric-value">{value.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
