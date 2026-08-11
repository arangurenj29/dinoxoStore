export const ROUND_DURATION_MS = 30_000;

export const TARGET_TYPES = {
  pulse: { label: 'Pulso azul', points: 1 },
  surge: { label: 'Sobrecarga azul', points: 3 },
};

export function createInitialState() {
  return { captures: 0, combo: 0, misses: 0, score: 0 };
}

export function collectTarget(state, type) {
  const target = TARGET_TYPES[type];
  if (!target) throw new Error(`Unknown target type: ${type}`);

  const combo = state.combo + 1;
  const comboBonus = Math.min(Math.floor(combo / 5), 3);

  return {
    ...state,
    captures: state.captures + 1,
    combo,
    score: state.score + target.points + comboBonus,
  };
}

export function missTarget(state) {
  return { ...state, combo: 0, misses: state.misses + 1 };
}

export function formatRemainingTime(remainingMs) {
  return (Math.max(0, remainingMs) / 1000).toFixed(1);
}

export function selectTargetType(random = Math.random) {
  return random() > 0.76 ? 'surge' : 'pulse';
}

export function selectPosition(random = Math.random, positionCount = 12) {
  return Math.min(positionCount - 1, Math.floor(random() * positionCount));
}
