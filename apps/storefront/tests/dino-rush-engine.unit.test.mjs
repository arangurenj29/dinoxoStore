import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ROUND_DURATION_MS,
  collectTarget,
  createInitialState,
  formatRemainingTime,
  missTarget,
  selectPosition,
  selectTargetType,
} from '../public/dino-rush-engine.js';

test('Dino Rush acumula puntos y bonificación de combo', () => {
  let state = createInitialState();
  for (let index = 0; index < 5; index += 1) {
    state = collectTarget(state, 'pulse');
  }

  assert.equal(state.captures, 5);
  assert.equal(state.combo, 5);
  assert.equal(state.score, 6);
});

test('Dino Rush reinicia el combo sin borrar el puntaje', () => {
  const captured = collectTarget(createInitialState(), 'surge');
  const missed = missTarget(captured);

  assert.equal(missed.combo, 0);
  assert.equal(missed.score, 3);
  assert.equal(missed.misses, 1);
});

test('Dino Rush formatea el tiempo y mantiene posiciones en rango', () => {
  assert.equal(ROUND_DURATION_MS, 30_000);
  assert.equal(formatRemainingTime(12_340), '12.3');
  assert.equal(formatRemainingTime(-1), '0.0');
  assert.equal(
    selectTargetType(() => 0.8),
    'surge',
  );
  assert.equal(
    selectTargetType(() => 0.2),
    'pulse',
  );
  assert.equal(
    selectPosition(() => 1),
    11,
  );
  assert.equal(
    selectPosition(() => 0),
    0,
  );
});
