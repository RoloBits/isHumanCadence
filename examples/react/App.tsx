import { DemoView } from './components/DemoView';
import { CompareView } from './components/CompareView';

// The build mode picks the view. The PR-preview build runs with --mode preview
// (.env.preview sets VITE_APP_MODE=compare) and shows the comparison; the default
// build has no VITE_APP_MODE and shows the product demo (README / GitHub Pages).
const isCompare = import.meta.env.VITE_APP_MODE === 'compare';

export function App() {
  return (
    <main>
      <header>
        <h1>is-human-cadence</h1>
      </header>

      {isCompare ? <CompareView /> : <DemoView />}

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
