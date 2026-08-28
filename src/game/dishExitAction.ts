export type DishExitMode = 'locked' | 'abandon' | 'confirm-abandon' | 'bank' | 'retry-save';

export interface DishExitContext {
  complete: boolean;
  firstTrial: boolean;
  openLab: boolean;
  saveBlocked: boolean;
  armedUntilMs: number;
  nowMs: number;
}

export interface DishExitState {
  mode: DishExitMode;
  label: string;
  detail: string;
  explanation: string;
  disabled: boolean;
}

export function dishExitState(context: DishExitContext): DishExitState {
  if (context.saveBlocked) {
    return state('retry-save', 'Retry save', 'dish preserved', 'Retry the verified save. The completed dish is still here.');
  }
  if (context.complete) {
    return state('bank', 'Bank result', 'ready', 'Persist this result, then continue.');
  }
  if (context.firstTrial) {
    return state('locked', 'Complete trial', 'in progress', 'Finish Dr. E’s taught sequence before leaving.', true);
  }
  const noun = context.openLab ? 'study' : 'trial';
  if (context.armedUntilMs > context.nowMs) {
    return state(
      'confirm-abandon',
      `Abandon ${noun}?`,
      'tap again',
      `Leave without completing this ${capitalize(noun)}? Logged observations remain; no result will be banked.`,
    );
  }
  return state(
    'abandon',
    `Abandon ${noun}`,
    context.openLab ? 'no result' : 'unsealed',
    `Leave this ${noun} without banking a result.`,
  );
}

function state(
  mode: DishExitMode,
  label: string,
  detail: string,
  explanation: string,
  disabled = false,
): DishExitState {
  return { mode, label, detail, explanation, disabled };
}

function capitalize(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}
