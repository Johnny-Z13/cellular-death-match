// The original Z13 jingle drives the letter pops and falling yellow diamond.
// Autoplay denial falls back to the same reveal on a silent clock.
const button = document.getElementById('intro-sound');
const audio = document.getElementById('intro-audio');
const ident = document.querySelector('.ident');
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

if (button instanceof HTMLButtonElement && audio instanceof HTMLAudioElement && ident) {
  let active = false;
  let generation = 0;
  let frame = 0;
  let failsafe = 0;
  let animations = [];
  const label = button.querySelector('.intro-long');
  const shortLabel = button.querySelector('.intro-short');
  audio.volume = 0.65;

  const setButton = (playing) => {
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Stop intro' : 'Replay intro with sound');
    label.textContent = playing ? 'Stop intro' : 'Replay with sound';
    shortLabel.textContent = playing ? 'Stop' : 'Intro';
  };

  const stop = () => {
    active = false;
    generation++;
    audio.pause();
    cancelAnimationFrame(frame);
    clearTimeout(failsafe);
    root.classList.add('intro-skipped');
    for (const animation of animations) animation.cancel();
    animations = [];
    setButton(false);
  };

  const start = () => {
    stop();
    active = true;
    const request = ++generation;
    let followingAudio = false;
    let settled = false;
    let base = 0;
    let wallStart = performance.now();
    audio.currentTime = 0;
    setButton(true);
    if (!reduce.matches) {
      // Flush the hidden state so replay creates a fresh CSS animation timeline.
      void ident.offsetWidth;
      root.classList.remove('intro-skipped');
      animations = ident.getAnimations({ subtree: true });
      for (const animation of animations) animation.pause();
    }

    const draw = () => {
      if (!active || request !== generation) return;
      let seconds;
      if (followingAudio && !audio.paused && !audio.ended) {
        seconds = audio.currentTime;
      } else {
        if (followingAudio) {
          followingAudio = false;
          base = audio.currentTime;
          wallStart = performance.now();
        }
        seconds = base + (performance.now() - wallStart) / 1000;
      }
      if (seconds >= 3) { stop(); return; }
      for (const animation of animations) animation.currentTime = seconds * 1000;
      frame = requestAnimationFrame(draw);
    };

    const begin = (withAudio) => {
      if (!active || request !== generation || settled) return;
      settled = true;
      followingAudio = withAudio;
      wallStart = performance.now();
      draw();
    };

    // A missing or stalled media request must never hold the page behind black.
    failsafe = setTimeout(stop, 6000);
    const pendingLimit = setTimeout(() => {
      if (!active || request !== generation || settled) return;
      audio.pause();
      begin(false);
    }, 800);
    audio.play().then(() => {
      clearTimeout(pendingLimit);
      if (request !== generation) return;
      if (!active || settled) { audio.pause(); return; }
      begin(true);
    }, () => {
      clearTimeout(pendingLimit);
      begin(false);
    });
  };

  button.addEventListener('click', () => { if (active) stop(); else start(); });
  ident.addEventListener('pointerdown', stop);
  document.addEventListener('keydown', (event) => {
    if (active && (event.key === 'Escape' || event.key === 'Tab')) stop();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reduce.addEventListener('change', stop);
  setButton(false);
  if (reduce.matches || document.hidden) stop();
  else start();
}
