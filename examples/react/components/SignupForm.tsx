import { useState, useRef, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

/* ------------------------------------------------------------------ */
/*  SignupForm                                                        */
/* ------------------------------------------------------------------ */

interface SignupFormProps {
  cadenceRef: (node: HTMLElement | null) => void;
  onReset: () => void;
  sampleCount: number;
}

export function SignupForm({
  cadenceRef,
  onReset,
  sampleCount,
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
  } = useSpeechRecognition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const interimLenRef = useRef(0);
  const prevFinalRef = useRef('');

  /* — mode switch -------------------------------------------------- */

  function switchMode(next: 'single' | 'form') {
    if (next === mode) return;
    SpeechRecognition.stopListening();
    resetTranscript();
    prevFinalRef.current = '';
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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleReset() {
    SpeechRecognition.stopListening();
    resetTranscript();
    prevFinalRef.current = '';
    setFreetext('');
    setForm({ name: '', email: '', password: '', bio: '' });
    interimLenRef.current = 0;
    onReset();
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
    // 1) input without recent keydown → triggers inputWithoutKeystrokes
    // 2) synthetic keydown (isTrusted=false) → increments syntheticEvents
    //    ctrlKey:true makes observer skip timing data collection
    // 3) matching keyup to decrement pendingFilteredUps
    const el = textareaRef.current;
    if (el) {
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }
  }

  // Handle finalized speech results
  useEffect(() => {
    if (!finalTranscript) return;
    const newText = finalTranscript.slice(prevFinalRef.current.length);
    if (!newText) return;
    applyTranscriptUpdate(newText, true);
    prevFinalRef.current = finalTranscript;
  }, [finalTranscript]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle interim (partial) speech results
  useEffect(() => {
    if (!interimTranscript) return;
    applyTranscriptUpdate(interimTranscript, false);
  }, [interimTranscript]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDictation() {
    if (listening) {
      SpeechRecognition.stopListening();
      interimLenRef.current = 0;
    } else {
      interimLenRef.current = 0;
      prevFinalRef.current = finalTranscript; // Anchor to current position
      SpeechRecognition.startListening({ continuous: true });
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
                onChange={(e) => setFreetext(e.target.value)}
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
