export const PELLET_POINTS = 1;

export const CARD_POINTS = {
  playstation: 5,
  nintendo: 10,
  xbox: 15,
};

export const ENEMY_SENSE_RANGE = 5;
export const ENEMY_POINTS = 25;
export const MODE_TICKS = 53;
export const STUN_TICKS = 7;
export const LIVES = 3;
export const FLEE_TICKS = 13;
export const FLEE_STEP_EVERY = 3;

export const BASE_WIDTH = 21;
export const BASE_HEIGHT = 17;
export const BASE_ENEMIES = 4;
export const CARDS_PER_TYPE = 4;
export const MAX_LEVEL = 8;
export const MAX_ENEMIES = 14;
export const ENEMY_HOME_MIN_DIST = 8;

export const EXPLOSION_RADIUS = 6;

const CARD_CELLS = {
  P: 'playstation',
  N: 'nintendo',
  X: 'xbox',
};

const CARD_TYPES = ['P', 'N', 'X'];

export function cardFor(cell) {
  return CARD_CELLS[cell] ?? null;
}

export function isWall(state, x, y) {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
    return true;
  }
  return state.maze[y][x] === '#';
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export const START = { x: 1, y: 1 };

function shapeFrom(rows) {
  const cells = [];
  const cx = Math.floor(rows[0].length / 2);
  const cy = Math.floor(rows.length / 2);
  rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (ch === 'X') cells.push([x - cx, y - cy]);
    });
  });
  return cells;
}

export const EXPLOSION_SHAPES = {
  P: shapeFrom([
    'XXXXXXXXXXXXX',
    'X...........X',
    'X...........X',
    'X...........X',
    'X...........X',
    'XXXXXXXXXXXXX',
    'X............',
    'X............',
    'X............',
    'X............',
    'X............',
    'X............',
    'X............',
  ]),
  N: shapeFrom([
    'X...........X',
    'XX.........XX',
    'X.X.......X.X',
    'X..X.....X..X',
    'X...X...X...X',
    'X....X.X....X',
    'X.....X.....X',
    'X....X.X....X',
    'X...X...X...X',
    'X..X.....X..X',
    'X.X.......X.X',
    'XX.........XX',
    'X...........X',
  ]),
  X: shapeFrom([
    'X...........X',
    '.X.........X.',
    '..X.......X..',
    '...X.....X...',
    '....X...X....',
    '.....X.X.....',
    '......X......',
    '.....X.X.....',
    '....X...X....',
    '...X.....X...',
    '..X.......X..',
    '.X.........X.',
    'X...........X',
  ]),
};

function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Genera un laberinto con pasillos de 3 celdas de ancho.
// width = 4*C + 1, height = 4*R + 1, con C columnas y R filas de intersecciones.
export function generateMaze(width, height, random = Math.random) {
  const cols = (width - 1) / 4;
  const rows = (height - 1) / 4;
  const cellX = (cx) => 4 * cx + 1;
  const cellY = (cy) => 4 * cy + 1;
  const inBounds = (cx, cy) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;
  const key = (cx, cy) => `${cx},${cy}`;

  const maze = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => '#'),
  );
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      for (let dy = 0; dy < 3; dy += 1) {
        for (let dx = 0; dx < 3; dx += 1) {
          maze[cellY(cy) + dy][cellX(cx) + dx] = '.';
        }
      }
    }
  }

  // La pared entre la celda cx-1 y cx es la columna 4*cx.
  function openHorizontalWall(cx, cy) {
    for (let dy = 0; dy < 3; dy += 1) {
      maze[cellY(cy) + dy][4 * cx] = '.';
    }
  }

  // La pared entre la celda cy-1 y cy es la fila 4*cy.
  function openVerticalWall(cx, cy) {
    for (let dx = 0; dx < 3; dx += 1) {
      maze[4 * cy][cellX(cx) + dx] = '.';
    }
  }

  const visited = new Set([key(0, 0)]);
  const stack = [[0, 0]];
  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const options = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (inBounds(nx, ny) && !visited.has(key(nx, ny))) {
        options.push([nx, ny]);
      }
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny] = options[Math.floor(random() * options.length)];
    if (nx > cx) openHorizontalWall(nx, cy);
    else if (nx < cx) openHorizontalWall(cx, cy);
    else if (ny > cy) openVerticalWall(cx, ny);
    else openVerticalWall(cx, cy);
    visited.add(key(nx, ny));
    stack.push([nx, ny]);
  }

  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      if (random() < 0.28) {
        if (inBounds(cx + 1, cy)) openHorizontalWall(cx + 1, cy);
        if (inBounds(cx, cy + 1)) openVerticalWall(cx, cy + 1);
      }
    }
  }

  for (let x = 0; x < width; x += 1) {
    maze[0][x] = '#';
    maze[height - 1][x] = '#';
  }
  for (let y = 0; y < height; y += 1) {
    maze[y][0] = '#';
    maze[y][width - 1] = '#';
  }

  return maze.map((row) => row.join(''));
}

export function createLevel(level = 1, random = Math.random) {
  const capped = Math.max(1, Math.min(level, MAX_LEVEL));
  const width = BASE_WIDTH + 4 * (capped - 1);
  const height = BASE_HEIGHT + 4 * (capped - 1);
  const maze = generateMaze(width, height, random);

  const openCells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (maze[y][x] === '.') openCells.push({ x, y });
    }
  }

  const placeable = openCells.filter(
    (cell) => cell.x !== START.x || cell.y !== START.y,
  );
  const pool = shuffle(placeable, random);

  const cardCells = [];
  for (let t = 0; t < CARD_TYPES.length; t += 1) {
    for (let i = 0; i < CARDS_PER_TYPE; i += 1) {
      const cell = pool[t * CARDS_PER_TYPE + i];
      cardCells.push({ x: cell.x, y: cell.y, type: CARD_TYPES[t] });
    }
  }
  for (const card of cardCells) {
    maze[card.y] =
      maze[card.y].substring(0, card.x) +
      card.type +
      maze[card.y].substring(card.x + 1);
  }

  const enemyCount = Math.min(BASE_ENEMIES + capped - 1, MAX_ENEMIES);
  const enemyPool = pool.filter(
    (cell) => !cardCells.some((card) => card.x === cell.x && card.y === cell.y),
  );
  const farCells = shuffle(
    enemyPool.filter((cell) => manhattan(cell, START) >= ENEMY_HOME_MIN_DIST),
    random,
  );
  const enemies = [];
  for (let i = 0; i < enemyCount; i += 1) {
    const cell = farCells[i] ?? enemyPool[i];
    enemies.push({ x: cell.x, y: cell.y, eaten: false });
  }

  let pellets = 0;
  for (const row of maze) {
    for (const cell of row) {
      if (cell === '.') pellets += 1;
    }
  }

  const cards = {
    playstation: CARDS_PER_TYPE,
    nintendo: CARDS_PER_TYPE,
    xbox: CARDS_PER_TYPE,
  };

  let score = 0;
  const eaten = new Set();
  const startKey = `${START.x},${START.y}`;
  const startCell = maze[START.y][START.x];
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
    enemies,
    fleeAccum: 0,
    fleeTicks: 0,
    height,
    level: capped,
    lives: LIVES,
    maze,
    mode: 'normal',
    modeTicks: 0,
    moved: false,
    moves: 0,
    pellets,
    player: { ...START },
    score,
    stunned: 0,
    width,
  };
}

export function createInitialState(random = Math.random) {
  return createLevel(1, random);
}

function openNeighbors(state, x, y) {
  const candidates = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
  return candidates.filter((cell) => !isWall(state, cell.x, cell.y));
}

export function movePlayer(state, dx, dy) {
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) {
    throw new Error('Movement deltas must be integers.');
  }
  if (Math.abs(dx) + Math.abs(dy) !== 1) {
    throw new Error('Movement must be exactly one orthogonal step.');
  }

  if (state.stunned > 0) {
    return { ...state, moved: false };
  }

  const { x, y } = state.player;
  const nextX = x + dx;
  const nextY = y + dy;
  if (isWall(state, nextX, nextY)) {
    return { ...state, moved: false };
  }

  const key = `${nextX},${nextY}`;
  const eaten = new Set(state.eaten);
  const next = {
    ...state,
    eaten,
    moved: true,
    moves: state.moves + 1,
    player: { x: nextX, y: nextY },
  };

  if (!eaten.has(key)) {
    const cell = state.maze[nextY][nextX];
    if (cell === '.') {
      next.score += PELLET_POINTS;
      next.pellets -= 1;
      eaten.add(key);
    } else if (cardFor(cell)) {
      const card = cardFor(cell);
      next.score += CARD_POINTS[card];
      next.cards = { ...next.cards, [card]: next.cards[card] - 1 };
      next.mode = 'red';
      next.modeTicks = MODE_TICKS;
      eaten.add(key);
    }
  }

  next.complete =
    next.pellets === 0 &&
    Object.values(next.cards).every((value) => value === 0);
  return next;
}

export function explodeCard(state) {
  const cardCell = state.maze[state.player.y][state.player.x];
  const shape = EXPLOSION_SHAPES[cardCell];
  if (!shape) return state;

  const eaten = new Set(state.eaten);
  let { score, pellets } = state;
  const enemies = state.enemies.map((enemy) => ({ ...enemy }));

  for (const [dx, dy] of shape) {
    const x = state.player.x + dx;
    const y = state.player.y + dy;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) continue;
    if (state.maze[y][x] === '#') continue;

    const key = `${x},${y}`;
    if (!eaten.has(key)) {
      if (state.maze[y][x] === '.') {
        score += PELLET_POINTS;
        pellets -= 1;
      }
      eaten.add(key);
    }
    for (const enemy of enemies) {
      if (!enemy.eaten && enemy.x === x && enemy.y === y) {
        enemy.eaten = true;
        score += ENEMY_POINTS;
      }
    }
  }

  const next = { ...state, eaten, score, pellets, enemies };
  next.complete =
    next.pellets === 0 &&
    Object.values(next.cards).every((value) => value === 0);
  return next;
}

// Mueve a cada enemigo `steps` pasos por tick, a la misma velocidad que Nox.
export function moveEnemies(state, random = Math.random, steps = 1) {
  if (state.enemies.every((enemy) => enemy.eaten)) {
    return state;
  }
  // Mientras huyen, el movimiento lo maneja tickFlee.
  if (state.fleeTicks > 0) {
    return state;
  }

  const occupied = new Set(
    state.enemies
      .filter((enemy) => !enemy.eaten)
      .map((enemy) => `${enemy.x},${enemy.y}`),
  );

  const enemies = state.enemies.map((enemy) => {
    if (enemy.eaten) return enemy;

    for (let step = 0; step < steps; step += 1) {
      const options = openNeighbors(state, enemy.x, enemy.y).filter(
        (cell) => !occupied.has(`${cell.x},${cell.y}`),
      );
      if (options.length === 0) break;

      const distanceToPlayer = (cell) => manhattan(cell, state.player);
      let target;
      if (state.mode === 'red') {
        const max = Math.max(...options.map(distanceToPlayer));
        target = options.filter((cell) => distanceToPlayer(cell) === max);
      } else if (distanceToPlayer(enemy) <= ENEMY_SENSE_RANGE) {
        const min = Math.min(...options.map(distanceToPlayer));
        target = options.filter((cell) => distanceToPlayer(cell) === min);
      } else {
        target = options;
      }

      const pick = target[Math.floor(random() * target.length)];
      occupied.delete(`${enemy.x},${enemy.y}`);
      enemy = { ...enemy, x: pick.x, y: pick.y };
      occupied.add(`${enemy.x},${enemy.y}`);
    }
    return enemy;
  });

  return { ...state, enemies };
}

// Cada enemigo da un paso alejándose de Nox.
export function fleeEnemies(state, random = Math.random) {
  const occupied = new Set(
    state.enemies
      .filter((enemy) => !enemy.eaten)
      .map((enemy) => `${enemy.x},${enemy.y}`),
  );

  const enemies = state.enemies.map((enemy) => {
    if (enemy.eaten) return enemy;
    const options = openNeighbors(state, enemy.x, enemy.y).filter(
      (cell) => !occupied.has(`${cell.x},${cell.y}`),
    );
    if (options.length === 0) return enemy;
    const distanceToPlayer = (cell) => manhattan(cell, state.player);
    const max = Math.max(...options.map(distanceToPlayer));
    const target = options.filter((cell) => distanceToPlayer(cell) === max);
    const pick = target[Math.floor(random() * target.length)];
    occupied.delete(`${enemy.x},${enemy.y}`);
    occupied.add(`${pick.x},${pick.y}`);
    return { ...enemy, x: pick.x, y: pick.y };
  });

  return { ...state, enemies };
}

// Los enemigos huyen de Nox durante FLEE_TICKS, avanzando un paso cada
// FLEE_STEP_EVERY ticks (~4 casillas por 2 segundos).
export function tickFlee(state, random = Math.random) {
  if (!(state.fleeTicks > 0)) {
    return state;
  }
  const fleeTicks = state.fleeTicks - 1;
  const fleeAccum = state.fleeAccum + 1;
  let next = { ...state, fleeTicks, fleeAccum };
  if (fleeAccum >= FLEE_STEP_EVERY) {
    next = fleeEnemies(next, random);
    next = { ...next, fleeAccum: 0 };
  }
  if (next.fleeTicks <= 0) {
    return { ...next, fleeTicks: 0, fleeAccum: 0 };
  }
  return next;
}

export function tickMode(state) {
  if (state.mode === 'normal') {
    return state;
  }
  const modeTicks = state.modeTicks - 1;
  if (modeTicks <= 0) {
    return { ...state, mode: 'normal', modeTicks: 0 };
  }
  return { ...state, modeTicks };
}

export function tickStun(state) {
  if (!(state.stunned > 0)) {
    return state;
  }
  const stunned = state.stunned - 1;
  if (stunned <= 0) {
    return { ...state, stunned: 0 };
  }
  return { ...state, stunned };
}

export function resolveCollisions(state) {
  const enemies = state.enemies.map((enemy) => ({ ...enemy }));
  let { score, lives, stunned, fleeTicks, fleeAccum } = state;

  for (const enemy of enemies) {
    if (enemy.eaten) continue;
    if (enemy.x !== state.player.x || enemy.y !== state.player.y) continue;

    if (state.mode === 'red') {
      enemy.eaten = true;
      score += ENEMY_POINTS;
    } else {
      lives -= 1;
      stunned = STUN_TICKS;
      fleeTicks = FLEE_TICKS;
      fleeAccum = 0;
    }
  }

  const defeated = lives <= 0;
  return { ...state, enemies, score, lives, defeated, stunned, fleeTicks, fleeAccum };
}

export function allEnemiesEaten(state) {
  return state.enemies.length > 0 && state.enemies.every((enemy) => enemy.eaten);
}
