import { useState } from 'react';
import { DemoView } from './components/DemoView';
import { CompareView } from './components/CompareView';

type Tab = 'demo' | 'compare';

const TABS: { id: Tab; label: string }[] = [
  { id: 'demo', label: 'Demo' },
  { id: 'compare', label: 'Compare: zeroRolloverScore (this PR)' },
];

export function App() {
  // Demo is the default so a README visitor lands on the product demo.
  const [tab, setTab] = useState<Tab>('demo');

  return (
    <main>
      <header>
        <h1>is-human-cadence</h1>
      </header>

      <div className="tab-strip" role="tablist" aria-label="Demo views">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'demo' ? <DemoView /> : <CompareView />}
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
