// Small, synthesized click/error sounds instead of shipping audio files —
// no asset to go missing, no extra network request, and the whole thing
// is a few hundred bytes of code instead of megabytes of samples for a
// handful of keystroke sounds.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  // Browsers suspend the context until a user gesture — a keypress counts,
  // so this resumes it right when we're about to use it.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function beep(freq: number, durationMs: number, type: OscillatorType, gainPeak: number) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, audioCtx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch {
    // Audio can fail for all sorts of environment reasons (autoplay
    // policy, no output device) — never worth breaking typing over.
  }
}

export function playKeySound() {
  beep(720, 35, "square", 0.05);
}

export function playErrorSound() {
  beep(180, 90, "sawtooth", 0.06);
}

export function playCompleteSound() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  [523, 659, 784].forEach((freq, i) => {
    setTimeout(() => beep(freq, 150, "sine", 0.07), i * 90);
  });
}
