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
    tooltip: 'How much key-hold durations vary. Humans: 15–60ms spread. Bots: nearly identical every time.',
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
    tooltip: 'Rate of Backspace/Delete usage. Humans: 2–15%. Bots: 0% or suspiciously exact.',
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

const SPARKLINE_W = 100;
const SPARKLINE_H = 48;
const HUMAN_THRESHOLD = 0.61;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const step = SPARKLINE_W / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(SPARKLINE_H - v * SPARKLINE_H).toFixed(1)}`)
    .join(' ');

  const thresholdY = (SPARKLINE_H - HUMAN_THRESHOLD * SPARKLINE_H).toFixed(1);

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        y1={thresholdY}
        x2={SPARKLINE_W}
        y2={thresholdY}
        stroke="var(--text-muted)"
        strokeWidth="0.5"
        strokeDasharray="2 2"
        opacity="0.5"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface MetricCardsProps {
  metrics: MetricScores;
  history: MetricScores[];
}

export function MetricCards({ metrics, history }: MetricCardsProps) {
  return (
    <section className="metric-cards-section">
      <h2>Metric Sparklines</h2>
      <div className="metric-cards-grid">
        {METRIC_INFO.map(({ key, label, tooltip }) => {
          const value = metrics[key];
          const color = scoreColor(value);
          const values = history.map((h) => h[key]);

          return (
            <div className="metric-card" key={key}>
              <div className="metric-card-header">
                <span className="metric-name has-tooltip" data-tooltip={tooltip}>
                  {label}
                </span>
                <span className="metric-card-value" style={{ color }}>
                  {value.toFixed(2)}
                </span>
              </div>
              <Sparkline values={values} color={color} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
