export type DishExitMode = 'locked' | 'abandon' | 'confirm-abandon' | 'bank' | 'retry-save';

export interface DishExitContext {
  complete: boolean;
  firstTrial: boolean;
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
    return state('retry-save', 'Retry save', 'dish preserved', 'Retry the save. The finished dish is still here.');
  }
  if (context.complete) {
    return state('bank', 'Finish trial', 'ready', 'Save this result and continue.');
  }
  if (context.firstTrial) {
    return state('locked', 'Finish trial', 'in progress', 'Finish Dr. E’s lesson first.', true);
  }
  if (context.armedUntilMs > context.nowMs) {
    return state('confirm-abandon', 'Leave trial?', 'tap again', 'Leave without a result? Notebook entries stay.');
  }
  return state('abandon', 'Leave trial', 'no result', 'Leave this trial without a result. Notebook entries stay.');
}

/** The rack's end slot is a finish control. Leaving an unfinished trial is a
 *  pause-menu action, so it never sits among the tools. */
export function isRackExitVisible(mode: DishExitMode): boolean {
  return mode === 'bank' || mode === 'retry-save';
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
