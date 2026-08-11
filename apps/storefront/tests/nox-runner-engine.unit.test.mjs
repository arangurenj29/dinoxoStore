import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canJump,
  createInitialRunnerState,
  paceFromScore,
  rectanglesOverlap,
  scoreFromElapsed,
} from '../public/nox-runner-engine.js';

test('Nox Runner inicia con una partida limpia', () => {
  assert.deepEqual(createInitialRunnerState(), { score: 0, pace: 1 });
});

test('Nox Runner suma puntos según el tiempo recorrido', () => {
  assert.equal(scoreFromElapsed(-120), 0);
  assert.equal(scoreFromElapsed(99), 0);
  assert.equal(scoreFromElapsed(100), 1);
  assert.equal(scoreFromElapsed(3_740), 37);
});

test('Nox Runner aumenta el ritmo en hitos de puntaje', () => {
  assert.equal(paceFromScore(0), 1);
  assert.equal(paceFromScore(69), 1);
  assert.equal(paceFromScore(70), 2);
  assert.equal(paceFromScore(179), 2);
  assert.equal(paceFromScore(180), 3);
});

test('Nox solo puede saltar durante una carrera y fuera de otro salto', () => {
  assert.equal(canJump({ isRunning: false, isJumping: false }), false);
  assert.equal(canJump({ isRunning: true, isJumping: true }), false);
  assert.equal(canJump({ isRunning: true, isJumping: false }), true);
});

test('Nox Runner detecta intersecciones entre la mascota y un glitch', () => {
  const character = { top: 100, right: 180, bottom: 190, left: 100 };
  const touchingObstacle = { top: 140, right: 205, bottom: 200, left: 155 };
  const distantObstacle = { top: 140, right: 280, bottom: 200, left: 220 };

  assert.equal(rectanglesOverlap(character, touchingObstacle, 8), true);
  assert.equal(rectanglesOverlap(character, distantObstacle, 8), false);
});
