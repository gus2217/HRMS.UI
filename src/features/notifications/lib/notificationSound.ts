// ============================================================
// notificationSound.ts
// Location: src/features/notifications/lib/notificationSound.ts
//
// In-app notification chime, synthesized with the Web Audio API —
// no audio asset to ship, works offline, and follows the system's
// light theme (a soft two-note "ding", not a jarring beep).
//
// Preference is stored in localStorage so it survives reloads:
//   jacana:notification-sound = "on" | "off"
//
// Browsers block AudioContext until the user has interacted with
// the page, so the context is created lazily on first play and
// resumed on the first pointer/key event.
// ============================================================

const SOUND_KEY = 'jacana:notification-sound';
const SOUND_DEFAULT = true;

let audioCtx: AudioContext | null = null;
let resumeHooked = false;

export function isNotificationSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    return raw === null ? SOUND_DEFAULT : raw === 'on';
  } catch {
    return SOUND_DEFAULT;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage unavailable — preference just won't persist */
  }
}

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();

  // Unlock on the first user gesture (autoplay policy).
  if (!resumeHooked) {
    resumeHooked = true;
    const resume = () => {
      if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume();
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

/**
 * Plays the notification chime. Safe to call on every live push —
 * it no-ops when sound is disabled, the tab is hidden, or the
 * browser cannot synthesize audio.
 */
export function playNotificationChime(): void {
  if (!isNotificationSoundEnabled()) return;
  // Don't chime at a hidden tab — the user isn't looking at the app.
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (ctx.state !== 'running') return; // resume is async; skip this push rather than queue

  const now = ctx.currentTime;

  const playNote = (freq: number, startAt: number, duration: number, volume: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Soft attack, gentle exponential decay — a "ding", not a "beep".
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  };

  // Pleasant two-note chime (E5 → A5, like a soft doorbell).
  playNote(659.25, now, 0.45, 0.16);
  playNote(880.0, now + 0.14, 0.6, 0.13);
}
