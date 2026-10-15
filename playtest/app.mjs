// The portal's one piece of behaviour: "Play intro with sound" replays the
// game's Z13 ident jingle. Escape, a second press or hiding the page stops
// it. No analytics, no autoplay.
const button = document.getElementById('intro-sound');
const audio = document.getElementById('intro-audio');

if (button instanceof HTMLButtonElement && audio instanceof HTMLAudioElement) {
  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    button.setAttribute('aria-pressed', 'false');
  };
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    if (!audio.paused) {
      stop();
      return;
    }
    audio.currentTime = 0;
    button.setAttribute('aria-pressed', 'true');
    audio.play().catch(stop);
  });
  audio.addEventListener('ended', stop);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
}
