// Z13 studio ident: "Z", "1", "3" pop in, the yellow pixel drops onto the
// floor line, squashes and tips onto its corner, PRESENTS fades in, then the
// black plate fades to reveal the game.
//
// Framework-free on purpose so every Z13 web game can copy this file plus
// `public/branding/z13-mark.png` and `z13-ident.mp3`. Timings match the
// z13labs.com intro (z13labs-website/app/components/StudioIntro.tsx) and the
// Rush Parade playtest ident, which hit on the audio's beats.
//
// While the sound plays, the picture follows the audio clock (a stalled track
// holds the picture). If the browser blocks autoplay, or the player muted the
// game, it runs silently on wall-clock time. Any tap or key skips it.

export const IDENT_TIMING = {
  letterStarts: [0.0175, 0.1775, 0.345],
  letterFade: 0.08,
  letterSettle: 0.24,
  letterScaleFrom: 1.16,
  pixelDropStart: 0.285,
  pixelVisible: 0.36,
  pixelLand: 0.5125,
  pixelSquash: 0.636,
  pixelSettle: 0.7075,
  pixelSquashScale: 0.85,
  pixelDropFrom: -65,
  pixelTipped: 0.935,
  captionStart: 0.645,
  captionFade: 0.3,
  // The ident audio runs 2.4s; the plate holds black until then.
  hold: 2.4,
  fade: 0.6,
  skipFade: 0.25,
  // Missing artwork or a hung track can never trap the player behind black.
  failsafe: 6,
  volume: 0.65,
} as const;

const MARK_WIDTH = 282;
const MARK_HEIGHT = 97;
const LETTER_CLIPS = ['inset(0 63.7% 0 0)', 'inset(0 38% 0 39%)', 'inset(0 0 0 63%)'];
const PIXEL_YELLOW = '#ffd10d';

export interface StudioIdentOptions {
  /** Reused if present (index.html paints it before scripts run, so the game never flashes). */
  plate?: HTMLElement | null;
  markSrc: string;
  audioSrc: string;
  muted: boolean;
  captionFont?: string;
}

export function playStudioIdent(options: StudioIdentOptions): Promise<void> {
  const t = IDENT_TIMING;
  const total = t.hold + t.fade;
  const plate = options.plate ?? document.createElement('div');
  plate.className = 'z13-ident';
  plate.setAttribute('aria-hidden', 'true');
  Object.assign(plate.style, {
    position: 'fixed', inset: '0', zIndex: '2147483000', background: '#000',
    display: 'grid', placeItems: 'center', cursor: 'pointer', touchAction: 'none',
  });
  if (!plate.isConnected) document.body.append(plate);

  const scale = Math.min(1, (window.innerWidth - 80) / MARK_WIDTH);
  const stage = el('div', { width: `${MARK_WIDTH}px`, transform: `scale(${scale})` });
  const mark = el('div', { position: 'relative', width: `${MARK_WIDTH}px`, height: `${MARK_HEIGHT}px` });
  const letters = LETTER_CLIPS.map((clipPath) => el('span', {
    position: 'absolute', inset: '0 32px 0 0', opacity: '0', clipPath,
    background: `url("${options.markSrc}") center / contain no-repeat`,
  }));
  const pixel = el('i', {
    position: 'absolute', right: '0', bottom: '1px', width: '23px', height: '23px',
    background: PIXEL_YELLOW, opacity: '0', transformOrigin: 'bottom right',
  });
  const caption = el('p', {
    margin: '27px 0 0', textAlign: 'center', color: '#aaa', opacity: '0',
    font: `10px ${options.captionFont ?? 'ui-monospace, monospace'}`,
    letterSpacing: '0.62em', textIndent: '0.62em',
  });
  caption.textContent = 'PRESENTS';
  mark.append(...letters, pixel);
  stage.append(mark, caption);
  plate.replaceChildren(stage);

  // Every animation spans the whole ident so one clock can scrub them all.
  const at = (seconds: number) => Math.min(1, Math.max(0, seconds / total));
  const timeline = { duration: total * 1000, fill: 'both' as const };
  const animations: Animation[] = [
    ...letters.map((letter, i) => {
      const s = t.letterStarts[i]!;
      return letter.animate([
        { offset: 0, opacity: 0, transform: `scale(${t.letterScaleFrom})` },
        { offset: at(s), opacity: 0, transform: `scale(${t.letterScaleFrom})` },
        { offset: at(s + t.letterFade), opacity: 1 },
        { offset: at(s + t.letterSettle), opacity: 1, transform: 'scale(1)' },
        { offset: 1, opacity: 1, transform: 'scale(1)' },
      ], timeline);
    }),
    pixel.animate([
      { offset: 0, opacity: 0, transform: `translateY(${t.pixelDropFrom}px)` },
      { offset: at(t.pixelDropStart), opacity: 0, transform: `translateY(${t.pixelDropFrom}px)` },
      { offset: at(t.pixelVisible), opacity: 1 },
      { offset: at(t.pixelLand), opacity: 1, transform: 'translateY(0) scaleY(1)' },
      { offset: at(t.pixelSquash), opacity: 1, transform: `translateY(0) scaleY(${t.pixelSquashScale})` },
      { offset: at(t.pixelSettle), opacity: 1, transform: 'translateY(0) scaleY(1) rotate(0deg)' },
      { offset: at(t.pixelTipped), opacity: 1, transform: 'rotate(45deg)' },
      { offset: 1, opacity: 1, transform: 'rotate(45deg)' },
    ], timeline),
    caption.animate([
      { offset: 0, opacity: 0 },
      { offset: at(t.captionStart), opacity: 0 },
      { offset: at(t.captionStart + t.captionFade), opacity: 1 },
      { offset: 1, opacity: 1 },
    ], timeline),
    plate.animate([
      { offset: 0, opacity: 1 },
      { offset: at(t.hold), opacity: 1 },
      { offset: 1, opacity: 0 },
    ], timeline),
  ];
  for (const animation of animations) animation.pause();

  const audio = options.muted ? null : new Audio(options.audioSrc);
  if (audio) {
    audio.preload = 'auto';
    audio.volume = t.volume;
  }

  return new Promise<void>((resolve) => {
    let done = false;
    let frame = 0;
    // Ident time = audio time while it plays, then wall time from where it got to.
    let followingAudio = false;
    let waiting = true;
    let base = 0;
    let wallStart = performance.now();

    const clock = (): number => {
      if (waiting) return 0;
      if (followingAudio && audio && !audio.paused && !audio.ended) return audio.currentTime;
      if (followingAudio && audio) {
        followingAudio = false;
        base = audio.currentTime;
        wallStart = performance.now();
      }
      return base + (performance.now() - wallStart) / 1000;
    };

    const finish = (fadeSeconds: number) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(failsafe);
      window.removeEventListener('keydown', skip, true);
      document.removeEventListener('visibilitychange', onVisibility);
      audio?.pause();
      for (const animation of animations) animation.cancel();
      const remove = () => { plate.remove(); resolve(); };
      if (fadeSeconds <= 0) { remove(); return; }
      plate.style.pointerEvents = 'none';
      plate.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fadeSeconds * 1000, fill: 'forwards' })
        .finished.then(remove, remove);
    };
    const skip = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      finish(t.skipFade);
    };
    const onVisibility = () => { if (document.hidden) finish(0); };

    const draw = () => {
      if (done) return;
      const seconds = clock();
      if (seconds >= total) { finish(0); return; }
      for (const animation of animations) animation.currentTime = seconds * 1000;
      frame = requestAnimationFrame(draw);
    };

    const failsafe = window.setTimeout(() => finish(t.skipFade), t.failsafe * 1000);
    plate.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip, true);
    document.addEventListener('visibilitychange', onVisibility);

    const artwork = new Image();
    artwork.src = options.markSrc;
    artwork.decode()
      .then(async () => {
        if (done) return;
        if (audio) {
          try {
            await audio.play();
            followingAudio = true;
          } catch {
            // Autoplay blocked: the full picture still plays, silently.
          }
        }
        if (done) return;
        waiting = false;
        wallStart = performance.now();
        draw();
      })
      .catch(() => finish(t.skipFade));
  });
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  return node;
}
