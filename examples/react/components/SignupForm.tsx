import { useState, useRef, useEffect, useCallback } from 'react';
import type { MetricScores, CadenceSignals, Classification, TimingData } from '@rolobits/is-human-cadence';

/* ------------------------------------------------------------------ */
/*  Web Speech API type declarations (not in all TS lib configs)      */
/* ------------------------------------------------------------------ */

interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/* ------------------------------------------------------------------ */
/*  Native Web Speech API hook                                        */
/* ------------------------------------------------------------------ */

function useNativeSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);

  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;

  const browserSupportsSpeechRecognition = !!SR;

  // Create recognition instance once on mount
  useEffect(() => {
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setFinalTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setListening(false);
      // Auto-restart if user still wants to listen (browser may stop mid-sentence)
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or other error — ignore
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // no-speech and aborted are non-fatal
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      shouldListenRef.current = false;
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [SR]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch {
      // Already started — ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    shouldListenRef.current = false;
    try {
      recognition.stop();
    } catch {
      // ignore
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    listening,
    interimTranscript,
    finalTranscript,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript,
  };
}

/* ------------------------------------------------------------------ */
/*  SignupForm                                                        */
/* ------------------------------------------------------------------ */

interface SignupFormProps {
  cadenceRef: (node: HTMLElement | null) => void;
  onReset: () => void;
  sampleCount: number;
  score: number;
  confident: boolean;
  classification: Classification;
  metrics: MetricScores;
  signals: CadenceSignals;
  onSnapshot: () => TimingData | null;
}

export function SignupForm({
  cadenceRef,
  onReset,
  sampleCount,
  score,
  confident,
  classification,
  metrics,
  signals,
  onSnapshot,
}: SignupFormProps) {
  const [mode, setMode] = useState<'single' | 'form'>('single');
  const [freetext, setFreetext] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    bio: '',
  });

  const {
    interimTranscript,
    finalTranscript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
  } = useNativeSpeechRecognition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const interimLenRef = useRef(0);
  const processedLenRef = useRef(0);

  /* — mode switch -------------------------------------------------- */

  function switchMode(next: 'single' | 'form') {
    if (next === mode) return;
    stopListening();
    resetTranscript();
    processedLenRef.current = 0;
    setMode(next);
    setFreetext('');
    setForm({ name: '', email: '', password: '', bio: '' });
    interimLenRef.current = 0;
    onReset();
  }

  /* — field focus tracking ----------------------------------------- */

  function handleFocusCapture(e: React.FocusEvent) {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
      focusedFieldRef.current = t;
    }
  }

  /* — form handlers ------------------------------------------------ */

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (!e.nativeEvent.isTrusted) return;
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleReset() {
    stopListening();
    resetTranscript();
    processedLenRef.current = 0;
    setFreetext('');
    setForm({ name: '', email: '', password: '', bio: '' });
    interimLenRef.current = 0;
    onReset();
  }

  /* — download handler --------------------------------------------- */

  function handleDownload() {
    const raw = onSnapshot();
    if (!raw) return;

    const payload = {
      version: 3,
      timestamp: new Date().toISOString(),
      mode,
      windowSize: 50,
      text: mode === 'single' ? freetext : form,
      raw,
      result: { score, confident, classification, sampleCount, metrics, signals },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* — speech dictation --------------------------------------------- */

  function applyTranscriptUpdate(text: string, isFinal: boolean) {
    if (mode === 'single') {
      setFreetext((prev) => {
        const base = prev.slice(0, prev.length - interimLenRef.current);
        interimLenRef.current = isFinal ? 0 : text.length;
        return base + text;
      });
    } else {
      const field = focusedFieldRef.current;
      if (!field) return;
      const name = field.name as keyof typeof form;
      setForm((prev) => {
        const cur = prev[name] ?? '';
        const base = cur.slice(0, cur.length - interimLenRef.current);
        interimLenRef.current = isFinal ? 0 : text.length;
        return { ...prev, [name]: base + text };
      });
    }

    // Dispatch synthetic DOM events so the observer detects dictation signals.
    // 1) input without recent keydown -> triggers inputWithoutKeystrokes
    // 2) synthetic keydown (isTrusted=false) -> increments syntheticEvents
    //    ctrlKey:true makes observer skip timing data collection
    // 3) matching keyup to decrement pendingFilteredUps
    const el = mode === 'single' ? textareaRef.current : focusedFieldRef.current;
    if (el) {
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }
  }

  // Handle finalized speech results
  useEffect(() => {
    if (!finalTranscript) return;
    const newText = finalTranscript.slice(processedLenRef.current);
    if (!newText) return;
    applyTranscriptUpdate(newText, true);
    processedLenRef.current = finalTranscript.length;
  }, [finalTranscript]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle interim (partial) speech results
  useEffect(() => {
    if (!interimTranscript) return;
    applyTranscriptUpdate(interimTranscript, false);
  }, [interimTranscript]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDictation() {
    if (listening) {
      stopListening();
      interimLenRef.current = 0;
    } else {
      interimLenRef.current = 0;
      processedLenRef.current = finalTranscript.length;
      startListening();
    }
  }

  /* — render ------------------------------------------------------- */

  return (
    <section className="form-section">
      <form
        className="signup-form"
        autoComplete="off"
      >
        {/* Mode toggle */}
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === 'single' ? 'active' : ''}
            onClick={() => switchMode('single')}
          >
            Free Text
          </button>
          <button
            type="button"
            className={mode === 'form' ? 'active' : ''}
            onClick={() => switchMode('form')}
          >
            Form Fields
          </button>
        </div>

        {/* Wrapping div captures all child keydown/keyup events via bubbling */}
        <div ref={cadenceRef} onFocusCapture={handleFocusCapture}>
          {mode === 'single' ? (
            <div className="field-group">
              <label htmlFor="field-freetext">Type anything here</label>
              <textarea
                ref={textareaRef}
                id="field-freetext"
                className="single-input"
                name="freetext"
                value={freetext}
                onChange={(e) => {
                  if (!e.nativeEvent.isTrusted) return;
                  setFreetext(e.target.value);
                }}
                rows={6}
                placeholder="Start typing to see your humanity score rise..."
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : (
            <>
              <div className="field-group">
                <label htmlFor="field-name">Full Name</label>
                <input
                  id="field-name"
                  data-testid="field-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="field-group">
                <label htmlFor="field-email">Email</label>
                <input
                  id="field-email"
                  data-testid="field-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="field-group">
                <label htmlFor="field-password">Password</label>
                <input
                  id="field-password"
                  data-testid="field-password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="field-group">
                <label htmlFor="field-bio">Bio</label>
                <textarea
                  id="field-bio"
                  data-testid="field-bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </>
          )}
        </div>

        <div className="form-footer">
          <span className="sample-count" data-testid="sample-count">
            {sampleCount} sample{sampleCount !== 1 ? 's' : ''}
          </span>
          <div className="form-actions">
            <button
              type="button"
              className="btn-download"
              onClick={handleDownload}
              disabled={sampleCount === 0}
            >
              Download
            </button>
            <button
              type="button"
              className="btn-reset"
              data-testid="btn-reset"
              onClick={handleReset}
            >
              Reset
            </button>
            {browserSupportsSpeechRecognition && mode === 'single' && (
              <button
                type="button"
                className={`btn-mic${listening ? ' listening' : ''}`}
                onClick={toggleDictation}
              >
                {listening ? 'Stop' : 'Dictate'}
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
