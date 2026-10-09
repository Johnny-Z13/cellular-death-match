import { describe, expect, it } from 'vitest';
import { dishExitState, isRackExitVisible } from '../../src/game/dishExitAction';

const base = {
  complete: false,
  firstTrial: false,
  saveBlocked: false,
  armedUntilMs: 0,
  nowMs: 100,
};

describe('dish exit action', () => {
  it('locks incomplete Trial 1', () => {
    expect(dishExitState({ ...base, firstTrial: true })).toMatchObject({
      mode: 'locked', disabled: true,
    });
  });

  it('requires an armed second activation to leave', () => {
    expect(dishExitState(base)).toMatchObject({ mode: 'abandon', label: 'Leave trial' });
    expect(dishExitState({ ...base, armedUntilMs: 4_000 })).toMatchObject({
      mode: 'confirm-abandon', label: 'Leave trial?', detail: 'tap again',
    });
    expect(dishExitState({ ...base, armedUntilMs: 99 })).toMatchObject({ mode: 'abandon' });
  });

  it('prioritizes finish and save retry semantics', () => {
    expect(dishExitState({ ...base, complete: true })).toMatchObject({ mode: 'bank', label: 'Finish trial' });
    expect(dishExitState({ ...base, complete: true, saveBlocked: true })).toMatchObject({
      mode: 'retry-save', label: 'Retry save',
    });
  });

  it('shows the rack exit only when it finishes or retries; leaving lives in Options', () => {
    expect(isRackExitVisible('bank')).toBe(true);
    expect(isRackExitVisible('retry-save')).toBe(true);
    expect(isRackExitVisible('locked')).toBe(false);
    expect(isRackExitVisible('abandon')).toBe(false);
    expect(isRackExitVisible('confirm-abandon')).toBe(false);
  });
});
