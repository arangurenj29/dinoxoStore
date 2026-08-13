import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_ENEMIES,
  BASE_HEIGHT,
  BASE_WIDTH,
  CARD_POINTS,
  CARDS_PER_TYPE,
  ENEMY_POINTS,
  ENEMY_SENSE_RANGE,
  FLEE_TICKS,
  LIVES,
  MODE_TICKS,
  PELLET_POINTS,
  STUN_TICKS,
  allEnemiesEaten,
  cardFor,
  createLevel,
  explodeCard,
  fleeEnemies,
  isWall,
  manhattan,
  moveEnemies,
  movePlayer,
  resolveCollisions,
  tickFlee,
  tickMode,
  tickStun,
} from '../public/nox-eat-engine.js';

function makeFixedState(maze) {
  const height = maze.length;
  const width = maze[0].length;
  let pellets = 0;
  const cards = { playstation: 0, nintendo: 0, xbox: 0 };
  for (const row of maze) {
    for (const cell of row) {
      if (cell === '.') pellets += 1;
      else if (cardFor(cell)) cards[cardFor(cell)] += 1;
    }
  }
  const eaten = new Set();
  const startKey = '1,1';
  const startCell = maze[1][1];
  let score = 0;
  if (startCell === '.') {
    score += PELLET_POINTS;
    pellets -= 1;
    eaten.add(startKey);
  } else if (cardFor(startCell)) {
    const card = cardFor(startCell);
    score += CARD_POINTS[card];
    cards[card] -= 1;
    eaten.add(startKey);
  }
  return {
    cards,
    complete: false,
    defeated: false,
    eaten,
    enemies: [],
    fleeAccum: 0,
    fleeTicks: 0,
    height,
    level: 1,
    lives: LIVES,
    maze,
    mode: 'normal',
    modeTicks: 0,
    moved: false,
    moves: 0,
    pellets,
    player: { x: 1, y: 1 },
    score,
    stunned: 0,
    width,
  };
}

const OPEN = ['##########', '#........#', '#........#', '##########'];

const BIG = [
  '####################',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '####################',
];

const BIGGER = [
  '################',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '################',
];

test('Nox Eat crea un nivel 1 válido con 4 dragones y 4 gift cards de cada una', () => {
  const state = createLevel(1, () => 0.5);

  assert.equal(state.width, BASE_WIDTH);
  assert.equal(state.height, BASE_HEIGHT);
  assert.equal(state.level, 1);
  assert.equal(state.lives, LIVES);
  assert.equal(state.defeated, false);
  assert.equal(state.fleeTicks, 0);
  assert.equal(state.fleeAccum, 0);
  assert.equal(state.mode, 'normal');
  assert.equal(state.modeTicks, 0);
  assert.equal(state.enemies.length, BASE_ENEMIES);
  assert.equal(state.cards.playstation, CARDS_PER_TYPE);
  assert.equal(state.cards.nintendo, CARDS_PER_TYPE);
  assert.equal(state.cards.xbox, CARDS_PER_TYPE);
  assert.deepEqual(state.player, { x: 1, y: 1 });
  assert.equal(state.eaten.has('1,1'), true);
  assert.equal(state.score, PELLET_POINTS);
  assert.equal(isWall(state, 0, 0), true);
  assert.equal(isWall(state, 1, 1), false);
  assert.equal(isWall(state, state.width, 1), true);

  const counts = { P: 0, N: 0, X: 0 };
  for (const row of state.maze) {
    for (const cell of row) {
      if (cell === 'P' || cell === 'N' || cell === 'X') counts[cell] += 1;
    }
  }
  assert.equal(counts.P, CARDS_PER_TYPE);
  assert.equal(counts.N, CARDS_PER_TYPE);
  assert.equal(counts.X, CARDS_PER_TYPE);
  assert.notEqual(state.maze[1][1], 'P');
  assert.notEqual(state.maze[1][1], 'N');
  assert.notEqual(state.maze[1][1], 'X');

  for (const enemy of state.enemies) {
    assert.equal(enemy.eaten, false);
    assert.equal(isWall(state, enemy.x, enemy.y), false);
    assert.equal(cardFor(state.maze[enemy.y][enemy.x]), null);
  }
});

test('Nox Eat crea un tablero totalmente conectado y jugable', () => {
  const state = createLevel(1, () => 0.31);
  const visited = new Set([`${state.player.x},${state.player.y}`]);
  const queue = [{ x: state.player.x, y: state.player.y }];

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = `${nextX},${nextY}`;
      if (!isWall(state, nextX, nextY) && !visited.has(key)) {
        visited.add(key);
        queue.push({ x: nextX, y: nextY });
      }
    }
  }

  let openCells = 0;
  for (const row of state.maze) {
    for (const cell of row) {
      if (cell !== '#') openCells += 1;
    }
  }

  assert.equal(visited.size, openCells);
});

test('Nox Eat crea tableros más grandes y con más dragones por nivel', () => {
  const level2 = createLevel(2, () => 0.5);
  const level3 = createLevel(3, () => 0.5);

  assert.equal(level2.width, BASE_WIDTH + 4);
  assert.equal(level2.height, BASE_HEIGHT + 4);
  assert.equal(level2.enemies.length, BASE_ENEMIES + 1);
  assert.equal(level2.cards.playstation, CARDS_PER_TYPE);

  assert.equal(level3.width, BASE_WIDTH + 8);
  assert.equal(level3.height, BASE_HEIGHT + 8);
  assert.equal(level3.enemies.length, BASE_ENEMIES + 2);
});

test('Nox Eat genera laberintos distintos en cada nivel', () => {
  const a = createLevel(1, () => 0.11);
  const b = createLevel(1, () => 0.89);
  assert.notDeepEqual(a.maze, b.maze);
});

test('cardFor reconoce las gift cards', () => {
  assert.equal(cardFor('P'), 'playstation');
  assert.equal(cardFor('N'), 'nintendo');
  assert.equal(cardFor('X'), 'xbox');
  assert.equal(cardFor('.'), null);
});

test('Nox Eat no atraviesa paredes y se mueve un paso ortogonal', () => {
  let state = makeFixedState(OPEN);

  state = movePlayer(state, -1, 0);
  assert.equal(state.moved, false);
  assert.deepEqual(state.player, { x: 1, y: 1 });
  assert.equal(state.moves, 0);

  state = movePlayer(state, 1, 0);
  assert.equal(state.moved, true);
  assert.deepEqual(state.player, { x: 2, y: 1 });
  assert.equal(state.moves, 1);
});

test('Nox Eat suma puntos al comer un pellet', () => {
  let state = makeFixedState(OPEN);
  state = movePlayer(state, 1, 0);

  assert.equal(state.score, 2 * PELLET_POINTS);
  assert.equal(state.pellets, 14);
  assert.equal(state.eaten.has('2,1'), true);
});

test('Nox Eat no vuelve a sumar una celda ya comida', () => {
  let state = makeFixedState(OPEN);
  state = movePlayer(state, 1, 0);
  state = movePlayer(state, 1, 0);
  const scoreAfter = state.score;
  const eatenAfter = state.eaten.size;
  state = movePlayer(state, -1, 0);
  state = movePlayer(state, 1, 0);

  assert.equal(state.score, scoreAfter);
  assert.equal(state.eaten.size, eatenAfter);
});

test('Nox Eat suma puntos por gift card y activa el modo rojo', () => {
  let state = makeFixedState(['###', '#PX', '###']);

  assert.equal(state.score, CARD_POINTS.playstation);
  assert.equal(state.cards.playstation, 0);

  state = movePlayer(state, 1, 0);
  assert.equal(state.score, CARD_POINTS.playstation + CARD_POINTS.xbox);
  assert.equal(state.cards.xbox, 0);
  assert.equal(state.mode, 'red');
  assert.equal(state.modeTicks, MODE_TICKS);
  assert.equal(state.complete, true);
});

test('Nox Eat reinicia el modo rojo al comer otra gift card', () => {
  let state = makeFixedState(['####', '#.PX', '####']);
  state = {
    ...state,
    mode: 'red',
    modeTicks: 5,
  };
  state = movePlayer(state, 1, 0);
  state = movePlayer(state, 1, 0);
  assert.equal(state.mode, 'red');
  assert.equal(state.modeTicks, MODE_TICKS);
});

test('Nox Eat valida argumentos de movimiento', () => {
  const state = makeFixedState(OPEN);
  assert.throws(() => movePlayer(state, 1, 1), /one orthogonal step/);
  assert.throws(() => movePlayer(state, 0.5, 0), /integers/);
});

test(`Nox Eat: los enemigos persiguen dentro del rango de ${ENEMY_SENSE_RANGE} celdas`, () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 1, y: 1 },
    enemies: [{ x: 5, y: 1, eaten: false }],
  };
  assert.ok(manhattan(state.enemies[0], state.player) <= ENEMY_SENSE_RANGE);
  state = moveEnemies(state, () => 0);
  assert.deepEqual(state.enemies[0], { x: 4, y: 1, eaten: false });
});

test('Nox Eat: los enemigos huyen en modo rojo', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    mode: 'red',
    modeTicks: MODE_TICKS,
    player: { x: 1, y: 1 },
    enemies: [{ x: 5, y: 1, eaten: false }],
  };
  state = moveEnemies(state, () => 0);
  assert.deepEqual(state.enemies[0], { x: 6, y: 1, eaten: false });
});

test('Nox Eat: los enemigos se mueven al azar fuera del rango', () => {
  let state = makeFixedState(BIG);
  state = {
    ...state,
    player: { x: 1, y: 1 },
    enemies: [{ x: 18, y: 4, eaten: false }],
  };
  assert.ok(manhattan({ x: 18, y: 4 }, { x: 1, y: 1 }) > ENEMY_SENSE_RANGE);
  state = moveEnemies(state, () => 0);
  const moved = state.enemies[0];
  assert.equal(moved.eaten, false);
  assert.equal(isWall(state, moved.x, moved.y), false);
  assert.equal(Math.abs(moved.x - 18) + Math.abs(moved.y - 4), 1);
});

test('Nox Eat: en modo rojo muerde al dragón que lo toca', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    mode: 'red',
    modeTicks: MODE_TICKS,
    score: 10,
    player: { x: 3, y: 1 },
    enemies: [{ x: 3, y: 1, eaten: false }],
  };
  state = resolveCollisions(state);
  assert.equal(state.enemies[0].eaten, true);
  assert.equal(state.score, 10 + ENEMY_POINTS);
});

test('Nox Eat: al ser tocado en modo normal pierde una vida, se paraliza y los dragones huyen', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 3, y: 1 },
    enemies: [{ x: 3, y: 1, eaten: false }],
  };
  state = resolveCollisions(state);
  assert.equal(state.lives, LIVES - 1);
  assert.equal(state.defeated, false);
  assert.equal(state.stunned, STUN_TICKS);
  assert.equal(state.fleeTicks, FLEE_TICKS);
  assert.equal(state.fleeAccum, 0);
  assert.equal(state.mode, 'normal');
  assert.equal(state.modeTicks, 0);
  assert.equal(state.enemies[0].eaten, false);
});

test('Nox Eat: el toque no termina la partida mientras queden vidas', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 3, y: 1 },
    enemies: [{ x: 3, y: 1, eaten: false }],
  };
  state = resolveCollisions(state);
  state = { ...state, stunned: 0, fleeTicks: 0, fleeAccum: 0 };
  state = resolveCollisions(state);
  assert.equal(state.lives, LIVES - 2);
  assert.equal(state.defeated, false);
  assert.equal(state.stunned, STUN_TICKS);
  assert.equal(state.fleeTicks, FLEE_TICKS);
});

test('Nox Eat: quedarse sin vidas termina la partida', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    lives: 1,
    player: { x: 3, y: 1 },
    enemies: [{ x: 3, y: 1, eaten: false }],
  };
  state = resolveCollisions(state);
  assert.equal(state.lives, 0);
  assert.equal(state.defeated, true);
});

test('Nox Eat: el modo rojo dura MODE_TICKS ticks y expira solo', () => {
  let state = makeFixedState(OPEN);
  state = { ...state, mode: 'red', modeTicks: MODE_TICKS };
  state = tickMode(state);
  assert.equal(state.modeTicks, MODE_TICKS - 1);
  state = { ...state, modeTicks: 1 };
  state = tickMode(state);
  assert.equal(state.mode, 'normal');
  assert.equal(state.modeTicks, 0);
});

test('Nox Eat: allEnemiesEaten detecta cuando no quedan dragones', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    enemies: [
      { x: 3, y: 1, eaten: true },
      { x: 5, y: 1, eaten: true },
    ],
  };
  assert.equal(allEnemiesEaten(state), true);
  state = {
    ...state,
    enemies: [
      { x: 3, y: 1, eaten: true },
      { x: 5, y: 1, eaten: false },
    ],
  };
  assert.equal(allEnemiesEaten(state), false);
  assert.equal(allEnemiesEaten({ ...state, enemies: [] }), false);
});

function withCard(maze, x, y, ch) {
  return maze.map((row, ry) =>
    ry === y ? row.slice(0, x) + ch + row.slice(x + 1) : row,
  );
}

test('Nox Eat: los pasillos tienen 3 celdas de ancho', () => {
  const state = createLevel(1, () => 0.5);
  let maxRun = 0;
  for (let y = 0; y < state.height; y += 1) {
    let run = 0;
    for (const cell of state.maze[y]) {
      if (cell !== '#') {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }
  }
  assert.ok(maxRun >= 3, `pasillo máximo de ${maxRun} celdas`);
});

test('Nox Eat: la explosión quema en forma de letra y mata a los dragones de la zona', () => {
  let state = makeFixedState(BIGGER);
  state = {
    ...state,
    maze: withCard(state.maze, 7, 7, 'P'),
    player: { x: 7, y: 7 },
    enemies: [
      { x: 1, y: 1, eaten: false },
      { x: 7, y: 1, eaten: false },
      { x: 13, y: 6, eaten: false },
      { x: 1, y: 7, eaten: false },
      { x: 7, y: 6, eaten: false },
      { x: 7, y: 7, eaten: false },
      { x: 13, y: 7, eaten: false },
      { x: 7, y: 13, eaten: false },
    ],
  };

  state = explodeCard(state);
  const eatenEnemies = state.enemies
    .filter((enemy) => enemy.eaten)
    .map((e) => `${e.x},${e.y}`);
  assert.deepEqual(
    eatenEnemies.sort(),
    ['1,1', '1,7', '13,6', '7,1', '7,6'].sort(),
  );
});

test('Nox Eat: la explosión N y X matan solo a sus formas', () => {
  const commonEnemies = [
    { x: 7, y: 1, eaten: false },
    { x: 1, y: 7, eaten: false },
    { x: 13, y: 7, eaten: false },
    { x: 7, y: 13, eaten: false },
    { x: 7, y: 7, eaten: false },
    { x: 1, y: 1, eaten: false },
    { x: 13, y: 13, eaten: false },
  ];

  let nState = makeFixedState(BIGGER);
  nState = {
    ...nState,
    maze: withCard(nState.maze, 7, 7, 'N'),
    player: { x: 7, y: 7 },
    enemies: commonEnemies.map((e) => ({ ...e })),
  };
  nState = explodeCard(nState);
  assert.deepEqual(
    nState.enemies
      .filter((enemy) => enemy.eaten)
      .map((e) => `${e.x},${e.y}`)
      .sort(),
    ['1,1', '1,7', '13,13', '13,7', '7,7'].sort(),
  );

  let xState = makeFixedState(BIGGER);
  xState = {
    ...xState,
    maze: withCard(xState.maze, 7, 7, 'X'),
    player: { x: 7, y: 7 },
    enemies: commonEnemies.map((e) => ({ ...e })),
  };
  xState = explodeCard(xState);
  assert.deepEqual(
    xState.enemies
      .filter((enemy) => enemy.eaten)
      .map((e) => `${e.x},${e.y}`)
      .sort(),
    ['1,1', '13,13', '7,7'].sort(),
  );
});

test('Nox Eat: la explosión come los puntos de la zona y suma puntaje', () => {
  let state = makeFixedState(BIGGER);
  state = {
    ...state,
    maze: withCard(state.maze, 7, 7, 'P'),
    player: { x: 7, y: 7 },
  };
  const pelletsBefore = state.pellets;
  const scoreBefore = state.score;
  state = explodeCard(state);
  assert.ok(state.pellets < pelletsBefore);
  assert.ok(state.score > scoreBefore);
  assert.equal(state.eaten.has('7,1'), true);
});

test('Nox Eat: al ser alcanzado Nox se paraliza y los dragones se preparan para huir', () => {
  let state = makeFixedState(BIG);
  state = {
    ...state,
    player: { x: 9, y: 2 },
    enemies: [{ x: 9, y: 2, eaten: false }],
  };
  state = resolveCollisions(state);
  assert.equal(state.lives, LIVES - 1);
  assert.equal(state.defeated, false);
  assert.equal(state.stunned, STUN_TICKS);
  assert.equal(state.fleeTicks, FLEE_TICKS);
  const enemy = state.enemies[0];
  assert.equal(enemy.eaten, false);
  assert.equal(isWall(state, enemy.x, enemy.y), false);
});

test('Nox Eat: tickFlee hace huir a los dragones cada FLEE_STEP_EVERY ticks', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 5, y: 1 },
    enemies: [{ x: 6, y: 1, eaten: false }],
    fleeTicks: FLEE_TICKS,
  };
  const start = { x: state.enemies[0].x, y: state.enemies[0].y };
  let movedSteps = 0;
  for (let i = 0; i < FLEE_TICKS; i += 1) {
    const before = { x: state.enemies[0].x, y: state.enemies[0].y };
    state = tickFlee(state, () => 0);
    if (state.enemies[0].x !== before.x || state.enemies[0].y !== before.y) {
      movedSteps += 1;
    }
  }
  assert.ok(
    movedSteps >= 3,
    `el dragón huyó ${movedSteps} casillas en ${FLEE_TICKS} ticks`,
  );
  assert.equal(state.fleeTicks, 0);
  assert.equal(isWall(state, state.enemies[0].x, state.enemies[0].y), false);
  assert.ok(
    manhattan(state.enemies[0], state.player) > manhattan(start, state.player),
    'el dragón terminó más lejos de Nox',
  );
});

test('Nox Eat: fleeEnemies aleja a cada enemigo de Nox', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 5, y: 1 },
    enemies: [
      { x: 6, y: 1, eaten: false },
      { x: 3, y: 1, eaten: false },
      { x: 5, y: 2, eaten: false },
    ],
  };
  const distances = state.enemies.map((e) => manhattan(e, state.player));
  state = fleeEnemies(state, () => 0);
  state.enemies.forEach((enemy, index) => {
    assert.equal(isWall(state, enemy.x, enemy.y), false);
    assert.ok(
      manhattan(enemy, state.player) >= distances[index],
      `enemigo ${index} se acercó: ${distances[index]} -> ${manhattan(enemy, state.player)}`,
    );
  });
});

test('Nox Eat: Nox no se mueve mientras está paralizado', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    stunned: 3,
    player: { x: 3, y: 1 },
  };
  state = movePlayer(state, 1, 0);
  assert.equal(state.moved, false);
  assert.deepEqual(state.player, { x: 3, y: 1 });
});

test('Nox Eat: los enemigos no avanzan con moveEnemies mientras huyen', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 1, y: 1 },
    enemies: [{ x: 5, y: 1, eaten: false }],
    fleeTicks: 8,
  };
  state = moveEnemies(state, () => 0, 2);
  assert.deepEqual(state.enemies[0], { x: 5, y: 1, eaten: false });
});

test('Nox Eat: el stun dura STUN_TICKS ticks y expira solo', () => {
  let state = makeFixedState(OPEN);
  state = { ...state, stunned: STUN_TICKS };
  state = tickStun(state);
  assert.equal(state.stunned, STUN_TICKS - 1);
  state = { ...state, stunned: 1 };
  state = tickStun(state);
  assert.equal(state.stunned, 0);
});

test('Nox Eat: los enemigos avanzan steps casillas por tick', () => {
  let state = makeFixedState(OPEN);
  state = {
    ...state,
    player: { x: 1, y: 1 },
    enemies: [{ x: 6, y: 1, eaten: false }],
  };
  state = moveEnemies(state, () => 0, 2);
  assert.deepEqual(state.enemies[0], { x: 4, y: 1, eaten: false });
});
