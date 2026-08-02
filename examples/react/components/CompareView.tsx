import { useState, useEffect, useCallback } from 'react';
// Two DIFFERENT engine versions, scored against the same keystrokes:
//   current  = the shipped code (main's src, via the baseline alias)
//   proposed = this branch's src, with the change under review engaged
import { useHumanCadence as useCurrentEngine } from '@rolobits/is-human-cadence-baseline/react';
import { useHumanCadence as useProposedEngine } from '@rolobits/is-human-cadence/react';
import type { MetricScores } from '@rolobits/is-human-cadence';
import { MetricBreakdown } from './MetricBreakdown';
import { MetricCards } from './MetricCards';
import { SignalPanel } from './SignalPanel';

const WINDOW = 50;
const MIN = 20;

type Model = ReturnType<typeof useProposedEngine>;

export function CompareView() {
  // Same keystrokes, two engines. `current` runs main's shipped code with
  // default config. `proposed` runs this branch's code with the change engaged
  // (here, zeroRolloverScore: 0.5 — main's engine has no such option). For a PR
  // that changes a default instead of adding an option, both sides would use
  // default config and the difference would come purely from the code.
  const current = useCurrentEngine({ windowSize: WINDOW, minSamples: MIN });
  const proposed = useProposedEngine({
    windowSize: WINDOW,
    minSamples: MIN,
    zeroRolloverScore: 0.5,
  });

  // One history array per model, accumulated exactly like DemoView does.
  const [currentHistory, setCurrentHistory] = useState<MetricScores[]>([]);
  const [proposedHistory, setProposedHistory] = useState<MetricScores[]>([]);

  useEffect(() => {
    if (current.sampleCount === 0) return;
    setCurrentHistory((prev) => [...prev, current.metrics]);
  }, [current.metrics, current.sampleCount]);

  useEffect(() => {
    if (proposed.sampleCount === 0) return;
    setProposedHistory((prev) => [...prev, proposed.metrics]);
  }, [proposed.metrics, proposed.sampleCount]);

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
    setCurrentHistory([]);
    setProposedHistory([]);
  }, [current.reset, proposed.reset]);

  const delta = proposed.score - current.score;

  // The public metrics.rolloverRate reports the NO_DATA sentinel as 0, so with
  // zero rollovers current reads 0.00 while proposed reads 0.50. That 0.00 is an
  // abstention (no vote), not a bot score — flag it so the breakdown is not misread.
  const currentAbstained =
    current.metrics.rolloverRate === 0 && proposed.metrics.rolloverRate !== 0;

  return (
    <>
      <p className="explain">
        The same keystrokes are scored by two engine versions.{' '}
        <strong>Current</strong> is the shipped code on <code>main</code>;{' '}
        <strong>Proposed</strong> is this branch, with{' '}
        <code>zeroRolloverScore: 0.5</code> engaged — it treats a run with zero
        key-overlaps as a weak bot signal instead of abstaining. Type naturally
        and overlap a few keys and the two agree; automation that never overlaps
        keys makes them diverge.
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
        <ModelColumn
          title="Current"
          subtitle="main engine · default"
          model={current}
          history={currentHistory}
          abstained={currentAbstained}
        />
        <ModelColumn
          title="Proposed"
          subtitle="this branch · zeroRolloverScore: 0.5"
          model={proposed}
          history={proposedHistory}
          delta={delta}
        />
      </div>
    </>
  );
}

interface ModelColumnProps {
  title: string;
  subtitle: string;
  model: Model;
  history: MetricScores[];
  /** current only: true when it abstained on zero rollovers */
  abstained?: boolean;
  /** proposed only: signed difference from current */
  delta?: number;
}

function ModelColumn({ title, subtitle, model, history, abstained, delta }: ModelColumnProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <code className="panel-sub">{subtitle}</code>
      </div>

      <div className="big-score" aria-label={`score ${model.score.toFixed(2)}`}>
        {model.score.toFixed(2)}
        {delta !== undefined && Math.abs(delta) >= 0.005 && (
          <span className={`delta ${delta < 0 ? 'down' : 'up'}`}>
            {delta < 0 ? '−' : '+'}
            {Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>

      <div className="panel-badges">
        <span className={`classification-badge classification-${model.classification}`}>
          {model.classification}
        </span>
        <span className={`confidence-badge ${model.confident ? 'confident' : 'not-confident'}`}>
          {model.confident ? 'confident' : 'not confident'}
        </span>
      </div>

      <MetricBreakdown metrics={model.metrics} />

      {abstained && (
        <p className="abstain-note">
          The current scorer <strong>abstained</strong> on rollover: with zero
          rollovers it casts no vote and redistributes that weight. The{' '}
          <code>0.00</code> above is the reported sentinel, not a bot score.
        </p>
      )}

      <MetricCards metrics={model.metrics} history={history} />

      <SignalPanel signals={model.signals} />
    </section>
  );
}
