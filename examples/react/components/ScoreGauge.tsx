function scoreColor(score: number): string {
  if (score < 0.4) return 'var(--red)';
  if (score < 0.65) return 'var(--yellow)';
  return 'var(--green)';
}

interface ScoreGaugeProps {
  score: number;
  confident: boolean;
}

export function ScoreGauge({ score, confident }: ScoreGaugeProps) {
  return (
    <section className="score-section">
      <div className="gauge-label">Humanity Score</div>
      <div className="gauge">
        <div
          className="gauge-fill"
          style={{
            width: `${(score * 100).toFixed(1)}%`,
            backgroundColor: scoreColor(score),
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
      <div
        className={`confidence-badge ${confident ? 'confident' : 'not-confident'}`}
        data-testid="confidence-badge"
      >
        {confident ? 'Confident' : 'Need more input'}
      </div>
    </section>
  );
}
