import type { Classification } from '@rolobits/is-human-cadence';

function classificationColor(classification: Classification): string {
  switch (classification) {
    case 'bot': return 'var(--red)';
    case 'unknown': return 'var(--yellow)';
    case 'human': return 'var(--green)';
  }
}

interface ScoreGaugeProps {
  score: number;
  confident: boolean;
  classification: Classification;
}

export function ScoreGauge({ score, confident, classification }: ScoreGaugeProps) {
  return (
    <section className="score-section">
      <div className="gauge-label">Humanity Score</div>
      <div className="gauge">
        <div
          className="gauge-fill"
          style={{
            width: `${(score * 100).toFixed(1)}%`,
            backgroundColor: classificationColor(classification),
          }}
        />
        <span className="gauge-value" data-testid="score-value">
          {score.toFixed(2)}
        </span>
      </div>
      <div className="gauge-scale">
        <span>0.0 Bot</span>
        <span>1.0 Human</span>
      </div>
      <div className="gauge-badges">
        <div
          className={`classification-badge classification-${classification}`}
          data-testid="classification-badge"
        >
          {classification.toUpperCase()}
        </div>
        <div
          className={`confidence-badge ${confident ? 'confident' : 'not-confident'}`}
          data-testid="confidence-badge"
        >
          {confident ? 'Confident' : 'Need more input'}
        </div>
      </div>
    </section>
  );
}
