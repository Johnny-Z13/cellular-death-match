// Dr. E lives in four slots: the coach (which also hosts the first-run
// welcome), the HUD director, the method intro and the onboarding pointer.
// Each slot is a canvas drawn by the cell-face renderer. This module creates
// the faces, keeps each one's resolution matched to its size on screen, and
// moves them together: one expression and one mouth. It reads the coach's
// state from its classes, so the coach's lesson logic stays untouched.
import { DR_E_DIRECTION, type FaceExpressionId } from '../content/drETuning';
import { createDrEFace, type DrEFace } from './drEFace/faceRenderer';
import type { SpeechEnvelope } from './drEFace/faceModel';

export interface DrEPresence {
  setExpression(id: FaceExpressionId): void;
  speak(speech: SpeechEnvelope, startMs: number): void;
  stopSpeaking(): void;
}

/** The expression each coach state wears. */
export function expressionForCoach(classes: DOMTokenList | readonly string[], kicker: string): FaceExpressionId {
  const has = (name: string) => (Array.isArray(classes) ? classes.includes(name) : (classes as DOMTokenList).contains(name));
  if (has('coach-success')) return 'delighted';
  if (has('coach-welcome')) return 'happy';
  if (/note|observe/i.test(kicker)) return 'thinking';
  return 'neutral';
}

export function createDrEPresence(additiveBloom: boolean): DrEPresence {
  const faces: DrEFace[] = [];
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>('canvas.dre-face[data-dre-slot]')) {
    const face = createDrEFace(canvas, { direction: DR_E_DIRECTION, size: 64, cssSized: true, additiveBloom });
    faces.push(face);
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(([entry]) => {
        const width = entry?.contentRect.width ?? 0;
        if (width > 0) face.setSize(width);
      }).observe(canvas);
    }
  }

  const presence: DrEPresence = {
    setExpression: (id) => { for (const face of faces) face.setExpression(id); },
    speak: (speech, startMs) => { for (const face of faces) face.speak(speech, startMs); },
    stopSpeaking: () => { for (const face of faces) face.stopSpeaking(); },
  };

  const coach = document.getElementById('coach');
  const kicker = document.getElementById('coach-kicker');
  if (coach && typeof MutationObserver === 'function') {
    let current: FaceExpressionId | null = null;
    const sync = () => {
      const next = expressionForCoach(coach.classList, kicker?.textContent ?? '');
      if (next === current) return;
      current = next;
      presence.setExpression(next);
    };
    new MutationObserver(sync).observe(coach, { attributes: true, attributeFilter: ['class'] });
    if (kicker) new MutationObserver(sync).observe(kicker, { childList: true, characterData: true, subtree: true });
    sync();
  }
  return presence;
}
