import { createCadence } from '@rolobits/is-human-cadence';
import type { CadenceResult, MetricScores } from '@rolobits/is-human-cadence';

// DOM elements
const textarea = document.getElementById('typing-area') as HTMLTextAreaElement;
const gaugeFill = document.getElementById('gauge-fill') as HTMLElement;
const gaugeValue = document.getElementById('gauge-value') as HTMLElement;
const sampleCount = document.getElementById('sample-count') as HTMLElement;
const pasteIndicator = document.getElementById('paste-indicator') as HTMLElement;
const confidenceBadge = document.getElementById('confidence-badge') as HTMLElement;
const btnBot = document.getElementById('btn-bot') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

const metricKeys: (keyof MetricScores)[] = [
  'dwellVariance',
  'flightFit',
  'timingEntropy',
  'correctionRatio',
  'burstRegularity',
];

// Score color: red (0) → yellow (0.5) → green (1)
function scoreColor(score: number): string {
  if (score < 0.4) return 'var(--red)';
  if (score < 0.65) return 'var(--yellow)';
  return 'var(--green)';
}

function updateUI(result: CadenceResult) {
  const { score, metrics, sampleCount: count, confident } = result;

  // Gauge
  const pct = Math.round(score * 100);
  gaugeFill.style.width = `${pct}%`;
  gaugeFill.style.backgroundColor = scoreColor(score);
  gaugeValue.textContent = score.toFixed(2);

  // Sample count
  sampleCount.textContent = `${count} samples`;

  // Confidence
  if (confident) {
    confidenceBadge.textContent = 'Confident';
    confidenceBadge.className = 'confidence-badge confident';
  } else {
    confidenceBadge.textContent = 'Need more input';
    confidenceBadge.className = 'confidence-badge not-confident';
  }

  // Metric bars
  for (const key of metricKeys) {
    const val = metrics[key];
    const bar = document.getElementById(`bar-${key}`) as HTMLElement;
    const label = document.getElementById(`val-${key}`) as HTMLElement;
    bar.style.width = `${Math.round(val * 100)}%`;
    bar.style.backgroundColor = scoreColor(val);
    label.textContent = val.toFixed(2);
  }
}

// Create cadence analyzer
const cadence = createCadence(textarea, {
  windowSize: 50,
  minSamples: 20,
  onScore: updateUI,
});

cadence.start();

// Paste detection
textarea.addEventListener('paste', () => {
  pasteIndicator.classList.remove('hidden');
  setTimeout(() => pasteIndicator.classList.add('hidden'), 2000);
});

// Bot simulation
let botInterval: ReturnType<typeof setInterval> | undefined;

function simulateBot() {
  btnBot.disabled = true;
  btnBot.textContent = 'Bot typing...';
  textarea.value = '';
  cadence.reset();

  const text = 'the quick brown fox jumps over the lazy dog and types like a machine';
  let i = 0;

  botInterval = setInterval(() => {
    if (i >= text.length) {
      stopBot();
      return;
    }

    // Dispatch keydown then keyup with constant 100ms timing (bot behavior)
    textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));

    setTimeout(() => {
      textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      textarea.value += text[i];
      i++;
    }, 30); // constant 30ms dwell — bot giveaway
  }, 100); // constant 100ms interval — bot giveaway
}

function stopBot() {
  if (botInterval !== undefined) {
    clearInterval(botInterval);
    botInterval = undefined;
  }
  btnBot.disabled = false;
  btnBot.textContent = 'Simulate Bot';

  // Force a final analysis to show the bot score
  const result = cadence.analyze();
  updateUI(result);
}

btnBot.addEventListener('click', simulateBot);

// Reset
btnReset.addEventListener('click', () => {
  stopBot();
  cadence.reset();
  textarea.value = '';
  pasteIndicator.classList.add('hidden');
  updateUI({
    score: 0.5,
    metrics: {
      dwellVariance: 0.5,
      flightFit: 0.5,
      timingEntropy: 0.5,
      correctionRatio: 0.5,
      burstRegularity: 0.5,
    },
    sampleCount: 0,
    confident: false,
  });
});
