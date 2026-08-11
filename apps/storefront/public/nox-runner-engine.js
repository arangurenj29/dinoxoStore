export const SCORE_INTERVAL_MS = 100;
export const JUMP_DURATION_MS = 720;
export const JUMP_GUARD_DURATION_MS = 900;

export function createInitialRunnerState() {
  return { score: 0, pace: 1 };
}

export function scoreFromElapsed(elapsedMs) {
  return Math.max(0, Math.floor(elapsedMs / SCORE_INTERVAL_MS));
}

export function paceFromScore(score) {
  if (score >= 180) return 3;
  if (score >= 70) return 2;
  return 1;
}

export function canJump({ isRunning, isJumping }) {
  return isRunning && !isJumping;
}

export function rectanglesOverlap(first, second, inset = 0) {
  return !(
    first.right - inset <= second.left + inset ||
    first.left + inset >= second.right - inset ||
    first.bottom - inset <= second.top + inset ||
    first.top + inset >= second.bottom - inset
  );
}
