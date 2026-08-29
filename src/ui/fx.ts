// Cinematic feedback layer: epoch intro banners, discovery toasts, and phase
// transition wipes. Desktop keeps its richer concurrent presentation. Phones
// use one priority-directed attention channel so events never stack over play.

import {
  NotificationDirector,
  type DirectedNotification,
  type NotificationPriority,
} from './notificationDirector';

export type ToastKind = 'discovery' | 'catalyst' | 'lifeform';
export type BannerAccent = 'bio' | 'amber' | 'violet';

export interface GenomeRevealInfo {
  id: string;
  name: string;
  asset: string;
  alt: string;
  primary: readonly [number, number, number];
  archivePosition: string;
}

export interface Fx {
  clearPhaseVisuals(): void;
  showEpochBanner(eyebrow: string, title: string, sub?: string): void;
  showUnlockBanner(eyebrow: string, title: string, sub: string, accent: BannerAccent): void;
  showGenomeDecode(items: readonly GenomeRevealInfo[], onComplete: () => void): void;
  showToast(kind: ToastKind, kicker: string, title: string): void;
  playWipe(): void;
}

type MobileFxPayload =
  | {
      kind: 'banner';
      eyebrow: string;
      title: string;
      sub: string;
      accent: BannerAccent | null;
    }
  | {
      kind: 'toast';
      toastKind: ToastKind;
      kicker: string;
      title: string;
    }
  | {
      kind: 'genome';
      items: readonly GenomeRevealInfo[];
      onComplete: () => void;
    };

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
  const genomeReveal = document.getElementById('fx-genome');
  const genomeEyebrow = document.getElementById('fx-genome-eyebrow');
  const genomeTitle = document.getElementById('fx-genome-title');
  const genomeSub = document.getElementById('fx-genome-sub');
  const genomeArt = document.getElementById('fx-genome-art');

  let desktopBannerTimer = 0;
  let mobileTimer = 0;
  let mobileExitTimer = 0;
  let activeMobileToast: HTMLElement | null = null;
  const mobileDirector = new NotificationDirector<MobileFxPayload>(4);
  const accentClasses = ['fx-banner-accent-bio', 'fx-banner-accent-amber', 'fx-banner-accent-violet'];
  let finishActiveGenome: (() => void) | null = null;

  genomeReveal?.addEventListener('click', () => finishActiveGenome?.());
  wipe?.addEventListener('animationend', () => wipe.classList.remove('fx-wipe-play'));

  function isCompactMobile(): boolean {
    return window.matchMedia('(max-width: 899px)').matches;
  }

  function setBannerContent(
    eyebrow: string,
    title: string,
    sub: string,
    accent: BannerAccent | null,
  ): boolean {
    if (!banner || !bannerEyebrow || !bannerTitle || !bannerSub) return false;
    bannerEyebrow.textContent = eyebrow;
    bannerTitle.textContent = title;
    bannerSub.textContent = sub;
    banner.classList.remove('fx-banner-show', 'fx-banner-arcade', ...accentClasses);
    if (accent) banner.classList.add('fx-banner-arcade', `fx-banner-accent-${accent}`);
    void banner.offsetWidth;
    banner.classList.add('fx-banner-show');
    banner.setAttribute('aria-hidden', 'false');
    return true;
  }

  function hideBanner(): void {
    banner?.classList.remove('fx-banner-show', 'fx-banner-arcade', ...accentClasses);
    banner?.setAttribute('aria-hidden', 'true');
    toasts?.classList.remove('fx-toasts-banner-active');
  }

  function createToastElement(kind: ToastKind, kicker: string, title: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `fx-toast fx-toast-${kind}`;
    const dot = document.createElement('span');
    dot.className = 'fx-toast-dot';
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('div');
    text.className = 'fx-toast-text';
    const kickerEl = document.createElement('span');
    kickerEl.className = 'fx-toast-kicker';
    kickerEl.textContent = kicker;
    const titleEl = document.createElement('span');
    titleEl.className = 'fx-toast-title';
    titleEl.textContent = title;
    text.append(kickerEl, titleEl);
    el.append(dot, text);
    return el;
  }

  function playDesktopBanner(
    eyebrow: string,
    title: string,
    sub: string,
    accent: BannerAccent | null,
  ): void {
    if (!setBannerContent(eyebrow, title, sub, accent)) return;
    toasts?.classList.add('fx-toasts-banner-active');
    window.clearTimeout(desktopBannerTimer);
    const bannerLife = reduceMotion ? (accent ? 1900 : 2600) : (accent ? 1900 : 3250);
    desktopBannerTimer = window.setTimeout(hideBanner, bannerLife);
  }

  function clearMobileVisual(): void {
    window.clearTimeout(mobileTimer);
    window.clearTimeout(mobileExitTimer);
    activeMobileToast?.remove();
    activeMobileToast = null;
    hideBanner();
    hideGenomeReveal();
  }

  function hideGenomeReveal(): void {
    genomeReveal?.classList.remove('fx-genome-show', 'fx-genome-batch');
    genomeReveal?.setAttribute('aria-hidden', 'true');
    genomeReveal?.setAttribute('tabindex', '-1');
    finishActiveGenome = null;
  }

  function setGenomeContent(items: readonly GenomeRevealInfo[]): boolean {
    if (!genomeReveal || !genomeEyebrow || !genomeTitle || !genomeSub || !genomeArt || items.length === 0) {
      return false;
    }
    const batch = items.length > 2;
    genomeEyebrow.textContent = batch ? 'GENOME ARCHIVE EXPANDED' : 'GENOME DECODED';
    genomeTitle.textContent = batch ? `${items.length} GENOMES DECODED` : items[0]!.name;
    genomeSub.textContent = `${items[0]!.archivePosition} · EGG SYNTHESIS UNLOCKED`;
    genomeArt.replaceChildren(...items.map((item) => {
      const img = document.createElement('img');
      img.src = item.asset;
      img.alt = item.alt;
      img.width = 384;
      img.height = 384;
      return img;
    }));
    const [r, g, b] = items[0]!.primary;
    genomeReveal.style.setProperty('--genome-color', `rgb(${r}, ${g}, ${b})`);
    genomeReveal.classList.toggle('fx-genome-batch', batch);
    genomeReveal.classList.remove('fx-genome-show');
    void genomeReveal.offsetWidth;
    genomeReveal.classList.add('fx-genome-show');
    genomeReveal.setAttribute('aria-hidden', 'false');
    genomeReveal.setAttribute('tabindex', '0');
    genomeReveal.focus({ preventScroll: true });
    return true;
  }

  function playGenomeReveal(
    items: readonly GenomeRevealInfo[],
    onComplete: () => void,
    notificationKey?: string,
  ): void {
    if (!setGenomeContent(items)) {
      onComplete();
      if (notificationKey) finishMobile(notificationKey);
      return;
    }
    let finished = false;
    finishActiveGenome = () => {
      if (finished) return;
      finished = true;
      // Stage the destination while the fully opaque Genome layer still owns
      // the screen. Removing it afterward prevents the arena from flashing
      // between this reward and its staged Method/autonomy destination.
      onComplete();
      hideGenomeReveal();
      if (notificationKey) finishMobile(notificationKey);
    };
  }

  function finishMobile(key: string): void {
    clearMobileVisual();
    const next = mobileDirector.complete(key);
    if (next) startMobile(next);
  }

  function startMobile(notification: DirectedNotification<MobileFxPayload>): void {
    const payload = notification.payload;
    if (payload.kind === 'genome') {
      playGenomeReveal(payload.items, payload.onComplete, notification.key);
      return;
    }
    if (payload.kind === 'banner') {
      if (!setBannerContent(payload.eyebrow, payload.title, payload.sub, payload.accent)) {
        finishMobile(notification.key);
        return;
      }
      toasts?.classList.add('fx-toasts-banner-active');
      const bannerLife = reduceMotion
        ? (payload.accent ? 1500 : 2200)
        : (payload.accent ? 1700 : 2600);
      mobileTimer = window.setTimeout(() => finishMobile(notification.key), bannerLife);
      return;
    }

    if (!toasts) {
      finishMobile(notification.key);
      return;
    }
    activeMobileToast = createToastElement(payload.toastKind, payload.kicker, payload.title);
    toasts.append(activeMobileToast);
    const toastLife = reduceMotion ? 2200 : 3200;
    mobileTimer = window.setTimeout(() => {
      activeMobileToast?.classList.add('fx-toast-out');
      mobileExitTimer = window.setTimeout(() => finishMobile(notification.key), 420);
    }, toastLife);
  }

  function enqueueMobile(
    payload: MobileFxPayload,
    priority: NotificationPriority,
  ): void {
    const semanticTitle = payload.kind === 'genome'
      ? payload.items.map((item) => item.id).join('+')
      : payload.kind === 'toast' && payload.kicker === 'Strain Unlocked'
        ? payload.title.replace(/ eggs$/i, '')
        : payload.title;
    const key = `message:${semanticTitle.trim().toLowerCase()}`;
    const result = mobileDirector.enqueue({ key, priority, payload });
    if (result.action === 'start') {
      startMobile(result.active);
    } else if (result.action === 'replace') {
      clearMobileVisual();
      startMobile(result.active);
    }
  }

  return {
    clearPhaseVisuals() {
      window.clearTimeout(desktopBannerTimer);
      window.clearTimeout(mobileTimer);
      window.clearTimeout(mobileExitTimer);
      activeMobileToast?.remove();
      activeMobileToast = null;
      hideBanner();
      mobileDirector.clear();
    },
    showEpochBanner(eyebrow, title, sub = '') {
      if (isCompactMobile()) {
        enqueueMobile({ kind: 'banner', eyebrow, title, sub, accent: null }, 3);
      } else {
        playDesktopBanner(eyebrow, title, sub, null);
      }
    },
    showUnlockBanner(eyebrow, title, sub, accent) {
      if (isCompactMobile()) {
        enqueueMobile({ kind: 'banner', eyebrow, title, sub, accent }, 3);
      } else {
        playDesktopBanner(eyebrow, title, sub, accent);
      }
    },
    showGenomeDecode(items, onComplete) {
      if (items.length === 0) {
        onComplete();
        return;
      }
      if (isCompactMobile()) {
        enqueueMobile({ kind: 'genome', items, onComplete }, 4);
      } else {
        playGenomeReveal(items, onComplete);
      }
    },
    showToast(kind, kicker, title) {
      if (isCompactMobile()) {
        const priority: NotificationPriority = kind === 'catalyst' ? 1 : 2;
        enqueueMobile({ kind: 'toast', toastKind: kind, kicker, title }, priority);
        return;
      }
      if (!toasts) return;
      const el = createToastElement(kind, kicker, title);
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
