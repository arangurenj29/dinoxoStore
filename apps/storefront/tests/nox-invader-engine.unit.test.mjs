import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BOSS_DRAGON_HP,
  BOSS_GARGOYLE_HP,
  BOSS_GARGOYLE_POINTS,
  BOSS_HOLD_X,
  BULLET_SPEED,
  DRAGON_HP,
  DRAGON_POINTS,
  GARGOYLE_POINTS,
  LIVES,
  MAX_LEVEL,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_HEIGHT,
  PLAYER_MOVE_SPEED,
  PLAYER_WIDTH,
  PLAYER_X,
  VICTORY_MESSAGE,
  createInitialState,
  createLevel,
  fire,
  hitPlayer,
  movePlayer,
  nextLevel,
  rectsOverlap,
  restart,
  tick,
} from '../public/nox-invader-engine.js';

function playLevel(level, random) {
  let state = createLevel(level, random);
  for (let i = 0; i < 6000; i += 1) {
    let move = 0;
    const incoming = state.enemyFire.some((fire) => {
      const sameLane = Math.abs(fire.y - state.player.y) < state.player.h + 1;
      const close =
        fire.x - state.player.x > -2 && fire.x - state.player.x < 40;
      return sameLane && close;
    });
    const danger = state.enemies.some((enemy) => {
      const sameLane = Math.abs(enemy.y - state.player.y) < enemy.h + 2;
      const close = enemy.x - state.player.x < 30;
      return sameLane && close;
    });
    if (incoming || danger) {
      move = state.player.y > state.height / 2 ? -1 : 1;
    } else {
      const targets = state.boss
        ? [state.boss]
        : state.enemies.slice().sort((a, b) => a.x - b.x);
      if (targets.length > 0) {
        const target = targets[0];
        const gap = target.y - state.player.y;
        if (gap > 1) move = 1;
        else if (gap < -1) move = -1;
      }
    }
    state = tick(state, { fire: true, move }, random);
    if (state.status === 'complete') return state;
    if (state.status === 'lost') return state;
  }
  return state;
}

test('Nox Invader crea un nivel 1 válido con la nave y el marcador en cero', () => {
  const state = createLevel(1, () => 0.5);

  assert.equal(state.level, 1);
  assert.equal(state.status, 'playing');
  assert.equal(state.score, 0);
  assert.equal(state.lives, LIVES);
  assert.equal(state.width, ARENA_WIDTH);
  assert.equal(state.height, ARENA_HEIGHT);
  assert.deepEqual(state.player, {
    x: PLAYER_X,
    y: ARENA_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT,
    cooldown: 0,
  });
  assert.equal(state.spawnQueue.length, 10);
  assert.equal(state.bossPending, null);
  assert.equal(state.boss, null);
  assert.equal(state.bullets.length, 0);
  assert.equal(state.enemies.length, 0);
});

test('Nox Invader respeta el nivel máximo y crea el jefe del nivel 2 y 4', () => {
  const level2 = createLevel(2, () => 0.5);
  const level4 = createLevel(4, () => 0.5);

  assert.equal(level2.bossPending, 'gargola');
  assert.equal(level4.bossPending, 'dragon');

  const over = createLevel(MAX_LEVEL + 3, () => 0.5);
  assert.equal(over.level, MAX_LEVEL);
});

test('Nox Invader mueve a la nave dentro de los límites verticales', () => {
  let state = createLevel(1, () => 0.5);

  state = movePlayer(state, -1);
  assert.equal(
    state.player.y,
    ARENA_HEIGHT / 2 - PLAYER_HEIGHT / 2 - PLAYER_MOVE_SPEED,
  );

  state = movePlayer(state, 1);
  assert.equal(state.player.y, ARENA_HEIGHT / 2 - PLAYER_HEIGHT / 2);

  let moved = state;
  for (let i = 0; i < 200; i += 1) {
    moved = movePlayer(moved, -1);
  }
  assert.equal(moved.player.y, PLAYER_HEIGHT / 2);

  moved = state;
  for (let i = 0; i < 200; i += 1) {
    moved = movePlayer(moved, 1);
  }
  assert.equal(moved.player.y, ARENA_HEIGHT - PLAYER_HEIGHT / 2);
});

test('Nox Invader valida el argumento de movimiento', () => {
  const state = createLevel(1, () => 0.5);
  assert.throws(() => movePlayer(state, Number.NaN), /finite/);
});

test('Nox Invader dispara fuego hacia la derecha con enfriamiento', () => {
  let state = createLevel(1, () => 0.5);

  state = fire(state);
  assert.equal(state.bullets.length, 1);
  assert.equal(state.bullets[0].vx, BULLET_SPEED);
  assert.equal(state.player.cooldown, PLAYER_FIRE_COOLDOWN);

  state = fire(state);
  assert.equal(state.bullets.length, 1);

  for (let i = 0; i < PLAYER_FIRE_COOLDOWN + 1; i += 1) {
    state = tick(state, { fire: true }, () => 0.5);
  }
  assert.ok(state.bullets.length >= 2);
});

test('Nox Invader quita vidas al recibir un golpe y pierde al quedarse sin vidas', () => {
  let state = createLevel(1, () => 0.5);

  state = hitPlayer(state);
  assert.equal(state.lives, LIVES - 1);
  assert.equal(state.invulnerableTicks, 45);

  for (let i = 0; i < 46; i += 1) {
    state = tick(state, {}, () => 0.5);
  }

  state = {
    ...state,
    lives: 1,
    invulnerableTicks: 0,
  };
  state = hitPlayer(state);
  assert.equal(state.lives, 0);
  assert.equal(state.status, 'lost');
});

test('Nox Invader: el fuego del jugador daña a los enemigos y suma puntos', () => {
  let state = createLevel(1, () => 0.5);
  state = {
    ...state,
    enemies: [
      {
        id: 1,
        kind: 'gargola',
        x: PLAYER_X + 20,
        y: state.player.y,
        w: 13,
        h: 8,
        hp: 1,
        maxHp: 1,
        vx: 1,
        wobble: 0,
        wobbleSpeed: 0.1,
        wobbleRange: 0,
        baseY: state.player.y,
        fireTimer: 999,
      },
    ],
    bullets: [
      {
        x: PLAYER_X + 14,
        y: state.player.y,
        w: 3,
        h: 3,
        vx: BULLET_SPEED,
      },
    ],
  };

  state = tick(state, {}, () => 0.5);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.score, GARGOYLE_POINTS);
});

test('Nox Invader: los dragones aguantan dos impactos', () => {
  let state = createLevel(3, () => 0.5);
  state = {
    ...state,
    enemies: [
      {
        id: 1,
        kind: 'dragon',
        x: PLAYER_X + 20,
        y: state.player.y,
        w: 11,
        h: 10,
        hp: DRAGON_HP,
        maxHp: DRAGON_HP,
        vx: 1,
        wobble: 0,
        wobbleSpeed: 0.1,
        wobbleRange: 0,
        baseY: state.player.y,
        fireTimer: 999,
      },
    ],
    bullets: [
      {
        x: PLAYER_X + 14,
        y: state.player.y,
        w: 3,
        h: 3,
        vx: BULLET_SPEED,
      },
    ],
  };

  state = tick(state, {}, () => 0.5);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0].hp, DRAGON_HP - 1);
  assert.equal(state.score, 0);

  state = {
    ...state,
    bullets: [
      {
        x: PLAYER_X + 14,
        y: state.player.y,
        w: 3,
        h: 3,
        vx: BULLET_SPEED,
      },
    ],
  };
  state = tick(state, {}, () => 0.5);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.score, DRAGON_POINTS);
});

test('Nox Invader: el fuego enemigo daña a la nave', () => {
  let state = createLevel(1, () => 0.5);
  state = {
    ...state,
    enemyFire: [
      {
        x: state.player.x + 4,
        y: state.player.y,
        w: 4,
        h: 4,
        vx: -3.5,
      },
    ],
  };

  state = tick(state, {}, () => 0.5);
  assert.equal(state.lives, LIVES - 1);
});

test('Nox Invader: el nivel termina cuando no quedan enemigos ni cola', () => {
  let state = createLevel(1, () => 0.5);
  state = { ...state, spawnQueue: [], enemies: [] };

  state = tick(state, {}, () => 0.5);
  assert.equal(state.status, 'complete');
});

test('Nox Invader: el jefe del nivel 2 aparece al vaciar la oleada', () => {
  let state = createLevel(2, () => 0.5);
  state = { ...state, spawnQueue: [], enemies: [] };

  state = tick(state, {}, () => 0.5);
  assert.notEqual(state.boss, null);
  assert.equal(state.boss.kind, 'gargola');
  assert.equal(state.boss.hp, BOSS_GARGOYLE_HP);
  assert.equal(state.status, 'playing');
});

test('Nox Invader: al destruir el jefe el nivel 2 se completa', () => {
  let state = createLevel(2, () => 0.5);
  state = {
    ...state,
    spawnQueue: [],
    enemies: [],
    bossSpawned: true,
    boss: {
      kind: 'gargola',
      x: BOSS_HOLD_X,
      y: 30,
      w: 16,
      h: 23,
      hp: BOSS_GARGOYLE_HP,
      maxHp: BOSS_GARGOYLE_HP,
      phase: 0,
      fireTimer: 999,
    },
  };

  let destroyed = false;
  for (let i = 0; i < 2000; i += 1) {
    state = tick(state, { fire: true }, () => 0.5);
    if (state.boss === null && state.status === 'complete') break;
    if (state.status === 'lost') break;
    destroyed = true;
  }
  assert.equal(destroyed, true);
  assert.equal(state.boss, null);
  assert.equal(state.status, 'complete');
  assert.equal(state.score, BOSS_GARGOYLE_POINTS);
});

test('Nox Invader: nextLevel avanza al siguiente nivel conservando score y vidas', () => {
  let state = createLevel(1, () => 0.5);
  state = {
    ...state,
    score: 250,
    lives: 2,
  };
  const next = nextLevel(state, () => 0.5);

  assert.equal(next.level, 2);
  assert.equal(next.status, 'playing');
  assert.equal(next.score, 250);
  assert.equal(next.lives, 2);
  assert.equal(next.bullets.length, 0);
  assert.equal(next.enemies.length, 0);
});

test('Nox Invader: nextLevel más allá del máximo declara la victoria', () => {
  let state = createLevel(MAX_LEVEL, () => 0.5);
  state = {
    ...state,
    score: 4000,
    lives: 2,
  };
  const next = nextLevel(state, () => 0.5);

  assert.equal(next.status, 'won');
  assert.equal(next.message, VICTORY_MESSAGE);
  assert.equal(next.score, 4000);
});

test('Nox Invader: restart reinicia el nivel en curso', () => {
  let state = createLevel(2, () => 0.5);
  state = { ...state, score: 300, lives: 1, enemies: [], spawnQueue: [] };
  const again = restart(state, () => 0.5);

  assert.equal(again.level, 2);
  assert.equal(again.status, 'playing');
  assert.equal(again.score, 0);
  assert.equal(again.lives, LIVES);
  assert.equal(again.enemies.length, 0);
  assert.equal(again.spawnQueue.length, 12);
});

test('Nox Invader: una oleada completa se puede ganar de principio a fin', () => {
  const state = playLevel(1, () => 0.42, { fire: true });
  assert.equal(state.status, 'complete');
  assert.ok(state.score >= GARGOYLE_POINTS);
});

test('Nox Invader: rectsOverlap detecta y descarta rectángulos separados', () => {
  assert.equal(
    rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }),
    true,
  );
  assert.equal(
    rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 }),
    false,
  );
  assert.equal(
    rectsOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 10, h: 10 },
      2,
    ),
    false,
  );
});

test('Nox Invader: la partida completa termina ganando el nivel 4', () => {
  let state = createLevel(4, () => 0.5);
  state = {
    ...state,
    spawnQueue: [],
    enemies: [],
    bossSpawned: true,
    boss: {
      kind: 'dragon',
      x: BOSS_HOLD_X,
      y: 30,
      w: 20,
      h: 18,
      hp: BOSS_DRAGON_HP,
      maxHp: BOSS_DRAGON_HP,
      phase: 0,
      fireTimer: 999,
    },
  };

  let finished = false;
  for (let i = 0; i < 4000; i += 1) {
    state = tick(state, { fire: true }, () => 0.5);
    if (state.status === 'lost') {
      state = restart(state, () => 0.5);
      continue;
    }
    if (state.status === 'complete') {
      state = nextLevel(state, () => 0.5);
    }
    if (state.status === 'won') {
      finished = true;
      break;
    }
  }
  assert.equal(finished, true);
  assert.equal(state.message, VICTORY_MESSAGE);
  assert.ok(state.score > 0);
});

test('Nox Invader: createInitialState arranca en nivel 1', () => {
  const state = createInitialState(() => 0.5);
  assert.equal(state.level, 1);
});
