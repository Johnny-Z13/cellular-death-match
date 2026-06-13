// Cinematic feedback layer: epoch intro banners, discovery toasts, and phase
// transition wipes. Pure DOM/CSS — no canvas coupling. Each effect is
// fire-and-forget and self-cleans; reduced-motion users get instant states.

export type ToastKind = 'discovery' | 'catalyst' | 'lifeform';
export type BannerAccent = 'bio' | 'amber' | 'violet';

export interface Fx {
  showEpochBanner(eyebrow: string, title: string, sub?: string): void;
  showUnlockBanner(eyebrow: string, title: string, sub: string, accent: BannerAccent): void;
  showToast(kind: ToastKind, kicker: string, title: string): void;
  playWipe(): void;
}

const reduceMotion = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFx(): Fx {
  const banner = document.getElementById('fx-banner');
  const bannerEyebrow = document.getElementById('fx-banner-eyebrow');
  const bannerTitle = document.getElementById('fx-banner-title');
  const bannerSub = document.getElementById('fx-banner-sub');
  const toasts = document.getElementById('fx-toasts');
  const wipe = document.getElementById('fx-wipe');

  let bannerTimer = 0;
  const accentClasses = ['fx-banner-accent-bio', 'fx-banner-accent-amber', 'fx-banner-accent-violet'];

  function playBanner(eyebrow: string, title: string, sub: string, accent: BannerAccent | null): void {
    if (!banner || !bannerEyebrow || !bannerTitle || !bannerSub) return;
    bannerEyebrow.textContent = eyebrow;
    bannerTitle.textContent = title;
    bannerSub.textContent = sub;
    banner.classList.remove('fx-banner-show', 'fx-banner-arcade', ...accentClasses);
    if (accent) banner.classList.add('fx-banner-arcade', `fx-banner-accent-${accent}`);
    // Force reflow so re-triggering the animation restarts it.
    void banner.offsetWidth;
    banner.classList.add('fx-banner-show');
    if (reduceMotion) {
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => banner.classList.remove('fx-banner-show'), accent ? 1900 : 2600);
    }
  }

  return {
    showEpochBanner(eyebrow, title, sub = '') {
      playBanner(eyebrow, title, sub, null);
    },
    showUnlockBanner(eyebrow, title, sub, accent) {
      playBanner(eyebrow, title, sub, accent);
    },
    showToast(kind, kicker, title) {
      if (!toasts) return;
      const el = document.createElement('div');
      el.className = `fx-toast fx-toast-${kind}`;
      const dot = document.createElement('span');
      dot.className = 'fx-toast-dot';
      const text = document.createElement('div');
      text.className = 'fx-toast-text';
      const k = document.createElement('span');
      k.className = 'fx-toast-kicker';
      k.textContent = kicker;
      const t = document.createElement('span');
      t.className = 'fx-toast-title';
      t.textContent = title;
      text.append(k, t);
      el.append(dot, text);
      toasts.append(el);
      while (toasts.children.length > 3) toasts.firstElementChild?.remove();

      const life = reduceMotion ? 2600 : 3200;
      window.setTimeout(() => {
        el.classList.add('fx-toast-out');
        window.setTimeout(() => el.remove(), 460);
      }, life);
    },
    playWipe() {
      if (!wipe || reduceMotion) return;
      wipe.classList.remove('fx-wipe-play');
      void wipe.offsetWidth;
      wipe.classList.add('fx-wipe-play');
    },
  };
}
