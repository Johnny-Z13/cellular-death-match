// Dr. E's text appears word by word as he says it. The voice plan gives each
// word's spoken onset; word i of the plan is word i of the displayed line,
// because the engine and this pattern match words identically.
import type { MumblePlan } from '../audio/mumble';

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/** How many characters of `text` are visible `tSec` into its speech: each
 *  spoken word brings its trailing punctuation and space with it. */
export function revealLengthAt(text: string, plan: Pick<MumblePlan, 'words' | 'duration'>, tSec: number): number {
  if (tSec >= plan.duration) return text.length;
  const starts = [...text.matchAll(WORD)].map((m) => m.index!);
  let shown = -1;
  for (let i = 0; i < plan.words.length && i < starts.length; i++) {
    if (plan.words[i]!.start <= tSec) shown = i;
  }
  if (shown < 0) return 0;
  return shown + 1 < starts.length ? starts[shown + 1]! : text.length;
}
