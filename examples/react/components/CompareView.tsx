import { useCallback } from 'react';
import { useHumanCadence } from '@rolobits/is-human-cadence/react';
import type { Classification } from '@rolobits/is-human-cadence';

const WINDOW = 50;
const MIN = 20;

export function CompareView() {
  // Two independent scorers observing the SAME keystrokes. The only difference
  // is the option under review: current abstains on zero rollovers, proposed
  // scores them 0.5 (a weak bot lean).
  const current = useHumanCadence({ windowSize: WINDOW, minSamples: MIN });
  const proposed = useHumanCadence({
    windowSize: WINDOW,
    minSamples: MIN,
    zeroRolloverScore: 0.5,
  });

  // Merge the two callback refs into one so both observe the same element.
  // Both underlying refs are stable, so this stays stable — the node is not
  // reattached on render and neither scorer loses its buffer.
  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      current.ref(node);
      proposed.ref(node);
    },
    [current.ref, proposed.ref],
  );

  const handleReset = useCallback(() => {
    current.reset();
    proposed.reset();
  }, [current.reset, proposed.reset]);

  // Same keystrokes, same config except zeroRolloverScore — so rolloverRate
  // differs iff there were zero rollovers, which is exactly when current abstains.
  const currentAbstains =
    current.metrics.rolloverRate !== proposed.metrics.rolloverRate;
  const delta = proposed.score - current.score;

  return (
    <>
      <p className="explain">
        The library can now treat a run with zero key-overlaps as a weak bot
        signal instead of ignoring it. <strong>Current (default)</strong>{' '}
        abstains when it sees no rollovers, redistributing that weight to the
        other metrics; <strong>Proposed</strong> sets{' '}
        <code>zeroRolloverScore: 0.5</code>, making zero rollovers a mild bot
        lean. Type naturally and overlap a few keys — the two agree; automation
        that never overlaps keys makes them diverge.
      </p>

      <section className="form-section">
        <div ref={mergedRef}>
          <div className="field-group">
            <label htmlFor="cadence-input">Type here to compare both scorers</label>
            <textarea
              id="cadence-input"
              className="single-input"
              rows={5}
              placeholder="Start typing naturally, or paste a script's output..."
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        <div className="form-footer">
          <span className="sample-count">
            {current.sampleCount} sample{current.sampleCount !== 1 ? 's' : ''}
          </span>
          <button type="button" className="btn-reset" onClick={handleReset}>
            Reset
          </button>
        </div>
      </section>

      <div className="compare-grid">
        <Panel
          title="Current (default)"
          subtitle="zero rollovers abstain"
          score={current.score}
          classification={current.classification}
          confident={current.confident}
          rolloverRate={current.metrics.rolloverRate}
          rolloverAbstained={currentAbstains}
        />
        <Panel
          title="Proposed"
          subtitle="zeroRolloverScore: 0.5"
          score={proposed.score}
          classification={proposed.classification}
          confident={proposed.confident}
          rolloverRate={proposed.metrics.rolloverRate}
          delta={delta}
        />
      </div>
    </>
  );
}

interface PanelProps {
  title: string;
  subtitle: string;
  score: number;
  classification: Classification;
  confident: boolean;
  rolloverRate: number;
  /** current only: true when it abstained on zero rollovers */
  rolloverAbstained?: boolean;
  /** proposed only: signed difference from current */
  delta?: number;
}

function Panel({
  title,
  subtitle,
  score,
  classification,
  confident,
  rolloverRate,
  rolloverAbstained,
  delta,
}: PanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <code className="panel-sub">{subtitle}</code>
      </div>

      <div className="big-score" aria-label={`score ${score.toFixed(2)}`}>
        {score.toFixed(2)}
        {delta !== undefined && Math.abs(delta) >= 0.005 && (
          <span className={`delta ${delta < 0 ? 'down' : 'up'}`}>
            {delta < 0 ? '−' : '+'}
            {Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>

      <div className="panel-badges">
        <span className={`classification-badge classification-${classification}`}>
          {classification}
        </span>
        <span className={`confidence-badge ${confident ? 'confident' : 'not-confident'}`}>
          {confident ? 'confident' : 'not confident'}
        </span>
      </div>

      <div className="panel-metric">
        <span className="panel-metric-name">rolloverRate</span>
        <span className="panel-metric-value">
          {rolloverAbstained ? 'abstained' : rolloverRate.toFixed(2)}
        </span>
      </div>
    </section>
  );
}
