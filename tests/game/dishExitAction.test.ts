import { describe, expect, it } from 'vitest';
import { dishExitState } from '../../src/game/dishExitAction';

const base = {
  complete: false,
  firstTrial: false,
  openLab: true,
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

  it('requires an armed second activation to abandon', () => {
    expect(dishExitState(base)).toMatchObject({ mode: 'abandon', label: 'Abandon study' });
    expect(dishExitState({ ...base, armedUntilMs: 4_000 })).toMatchObject({
      mode: 'confirm-abandon', detail: 'tap again',
    });
    expect(dishExitState({ ...base, armedUntilMs: 99 })).toMatchObject({ mode: 'abandon' });
  });

  it('prioritizes bank and save retry semantics', () => {
    expect(dishExitState({ ...base, complete: true })).toMatchObject({ mode: 'bank', label: 'Bank result' });
    expect(dishExitState({ ...base, complete: true, saveBlocked: true })).toMatchObject({
      mode: 'retry-save', label: 'Retry save',
    });
  });

  it('names an authored abandon as an unsealed Trial', () => {
    expect(dishExitState({ ...base, openLab: false })).toMatchObject({
      label: 'Abandon trial', detail: 'unsealed',
    });
  });
});
