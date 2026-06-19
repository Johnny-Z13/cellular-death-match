export interface EscalationParams {
  readonly epochTicks: number;
  readonly crisisIntervalMul: number;
  readonly outbreakSeverity: number;
  readonly mutationStrength: number;
  readonly accidentIntervalMul: number;
}

const MID_GAME_START = 3;
const MIN_EPOCH_TICKS = 60 * 40;   // 40 seconds minimum
const BASE_EPOCH_TICKS = 60 * 70;  // 70 seconds starting
const TICKS_REDUCTION_PER_EPOCH = 60 * 5;

export function getEscalation(epochIndex: number): EscalationParams {
  const depth = Math.max(0, epochIndex - MID_GAME_START);
  const epochTicks = Math.max(
    MIN_EPOCH_TICKS,
    BASE_EPOCH_TICKS - depth * TICKS_REDUCTION_PER_EPOCH,
  );
  return {
    epochTicks,
    crisisIntervalMul: Math.pow(0.95, depth),
    outbreakSeverity: 3 + depth,
    mutationStrength: 1.0 + depth * 0.1,
    accidentIntervalMul: Math.pow(0.92, depth),
  };
}
