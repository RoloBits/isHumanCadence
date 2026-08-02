import type { CadenceSignals } from '@rolobits/is-human-cadence';

const SIGNAL_INFO: {
  key: keyof CadenceSignals;
  label: string;
  tooltip: string;
  format: (v: boolean | number) => string;
  isActive: (v: boolean | number) => boolean;
}[] = [
  {
    key: 'pasteDetected',
    label: 'Paste Detected',
    tooltip: 'Set when a paste event is detected on the input.',
    format: (v) => (v ? 'Yes' : 'No'),
    isActive: (v) => v === true,
  },
  {
    key: 'syntheticEvents',
    label: 'Synthetic Events',
    tooltip: 'Count of keyboard events where isTrusted is false.',
    format: (v) => String(v),
    isActive: (v) => (v as number) > 0,
  },
  {
    key: 'insufficientData',
    label: 'Insufficient Data',
    tooltip: 'True when sampleCount is below minSamples.',
    format: (v) => (v ? 'Yes' : 'No'),
    isActive: (v) => v === true,
  },
  {
    key: 'inputWithoutKeystrokes',
    label: 'Input Without Keystrokes',
    tooltip: 'True when text entered the field without a preceding keydown event.',
    format: (v) => (v ? 'Yes' : 'No'),
    isActive: (v) => v === true,
  },
];

interface SignalPanelProps {
  signals: CadenceSignals;
}

export function SignalPanel({ signals }: SignalPanelProps) {
  return (
    <section className="signals-section">
      <h2>Signals</h2>
      <div className="signal-list">
        {SIGNAL_INFO.map(({ key, label, tooltip, format, isActive }) => {
          const value = signals[key];
          const active = isActive(value);
          return (
            <div className="signal-row" key={key}>
              <span className="signal-name has-tooltip" data-tooltip={tooltip}>
                {label}
              </span>
              <span className={`signal-badge ${active ? 'active' : 'inactive'}`}>
                {format(value)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
