export const ARENA_WIDTH = 120;
export const ARENA_HEIGHT = 80;

export const PLAYER_WIDTH = 9;
export const PLAYER_HEIGHT = 9;
export const PLAYER_X = 14;
export const PLAYER_MOVE_SPEED = 2;
export const PLAYER_FIRE_COOLDOWN = 8;
export const PLAYER_INVULNERABLE_TICKS = 45;

export const BULLET_WIDTH = 3;
export const BULLET_HEIGHT = 3;
export const BULLET_SPEED = 7;

export const ENEMY_FIRE_WIDTH = 4;
export const ENEMY_FIRE_HEIGHT = 4;
export const ENEMY_FIRE_SPEED = 3.5;

export const GARGOYLE_W = 13;
export const GARGOYLE_H = 8;
export const GARGOYLE_HP = 1;
export const GARGOYLE_VX = 1.2;
export const GARGOYLE_POINTS = 100;

export const DRAGON_W = 11;
export const DRAGON_H = 10;
export const DRAGON_HP = 2;
export const DRAGON_VX = 1.6;
export const DRAGON_POINTS = 200;

export const BOSS_GARGOYLE_W = 16;
export const BOSS_GARGOYLE_H = 23;
export const BOSS_GARGOYLE_HP = 18;
export const BOSS_GARGOYLE_POINTS = 1000;

export const BOSS_DRAGON_W = 20;
export const BOSS_DRAGON_H = 18;
export const BOSS_DRAGON_HP = 26;
export const BOSS_DRAGON_POINTS = 1500;

export const BOSS_SPEED = 0.6;
export const BOSS_HOLD_X = 76;

export const LIVES = 3;
export const MAX_LEVEL = 4;

export const VICTORY_MESSAGE = 'Nox a detenido la invazion';

export const WAVE = {
  1: { kind: 'gargola', count: 10 },
  2: { kind: 'gargola', count: 12, boss: 'gargola' },
  3: { kind: 'dragon', count: 14 },
  4: { kind: 'dragon', count: 16, boss: 'dragon' },
};

function makeWave(level) {
  const wave = WAVE[Math.min(Math.max(level, 1), MAX_LEVEL)] ?? WAVE[1];
  const queue = [];
  for (let i = 0; i < wave.count; i += 1) {
    queue.push(wave.kind);
  }
  return { queue, boss: wave.boss ?? null };
}

function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeEnemy(kind, id, random) {
  const stats = {
    gargola: {
      w: GARGOYLE_W,
      h: GARGOYLE_H,
      hp: GARGOYLE_HP,
      vx: GARGOYLE_VX,
    },
    dragon: {
      w: DRAGON_W,
      h: DRAGON_H,
      hp: DRAGON_HP,
      vx: DRAGON_VX,
    },
  }[kind];
  const y = stats.h / 2 + random() * (ARENA_HEIGHT - stats.h - 10) + 5;
  return {
    id,
    kind,
    x: ARENA_WIDTH + stats.w,
    y,
    w: stats.w,
    h: stats.h,
    hp: stats.hp,
    maxHp: stats.hp,
    vx: stats.vx,
    wobble: random() * Math.PI * 2,
    wobbleSpeed: 0.05 + random() * 0.09,
    wobbleRange: 2 + random() * 7,
    baseY: y,
    fireTimer: Math.floor(40 + random() * 50),
  };
}

function makeBoss(kind, random) {
  const stats = {
    gargola: {
      w: BOSS_GARGOYLE_W,
      h: BOSS_GARGOYLE_H,
      hp: BOSS_GARGOYLE_HP,
    },
    dragon: {
      w: BOSS_DRAGON_W,
      h: BOSS_DRAGON_H,
      hp: BOSS_DRAGON_HP,
    },
  }[kind];
  const y = ARENA_HEIGHT / 2 - stats.h / 2;
  return {
    kind,
    x: ARENA_WIDTH + stats.w,
    y,
    w: stats.w,
    h: stats.h,
    hp: stats.hp,
    maxHp: stats.hp,
    phase: 0,
    fireTimer: Math.floor(30 + random() * 20),
  };
}

export function createLevel(level = 1, random = Math.random) {
  const wave = makeWave(level);
  const spawnOrder = shuffle(wave.queue, random);
  return {
    id: 0,
    level: Math.min(Math.max(level, 1), MAX_LEVEL),
    status: 'playing',
    score: 0,
    lives: LIVES,
    tickCount: 0,
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    player: {
      x: PLAYER_X,
      y: ARENA_HEIGHT / 2 - PLAYER_HEIGHT / 2,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT,
      cooldown: 0,
    },
    bullets: [],
    enemies: [],
    boss: null,
    enemyFire: [],
    spawnQueue: spawnOrder,
    spawnTimer: 24,
    invulnerableTicks: 0,
    bossPending: wave.boss,
    bossSpawned: false,
    message: null,
  };
}

export function createInitialState(random = Math.random) {
  return createLevel(1, random);
}

export function rectsOverlap(a, b, inset = 0) {
  const ax = a.x + inset;
  const ay = a.y + inset;
  const bx = b.x + inset;
  const by = b.y + inset;
  const aw = Math.max(a.w - inset * 2, 0);
  const ah = Math.max(a.h - inset * 2, 0);
  const bw = Math.max(b.w - inset * 2, 0);
  const bh = Math.max(b.h - inset * 2, 0);
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function movePlayer(state, direction) {
  if (!Number.isFinite(direction)) {
    throw new Error('Movement direction must be a finite number.');
  }
  if (direction === 0) return state;
  const delta = Math.max(-1, Math.min(1, direction)) * PLAYER_MOVE_SPEED;
  const y = Math.max(
    PLAYER_HEIGHT / 2,
    Math.min(state.height - PLAYER_HEIGHT / 2, state.player.y + delta),
  );
  return { ...state, player: { ...state.player, y } };
}

export function fire(state) {
  const { player } = state;
  if (player.cooldown > 0) return state;
  const bullet = {
    x: player.x + player.w / 2 + BULLET_WIDTH / 2,
    y: player.y,
    w: BULLET_WIDTH,
    h: BULLET_HEIGHT,
    vx: BULLET_SPEED,
  };
  return {
    ...state,
    bullets: [...state.bullets, bullet],
    player: { ...player, cooldown: PLAYER_FIRE_COOLDOWN },
  };
}

export function hitPlayer(state) {
  if (state.invulnerableTicks > 0) return state;
  const lives = state.lives - 1;
  const next = {
    ...state,
    lives,
    invulnerableTicks: PLAYER_INVULNERABLE_TICKS,
  };
  if (lives <= 0) {
    return { ...next, status: 'lost' };
  }
  return next;
}

function spawnNextEnemy(state, random) {
  const nextId = state.id + 1;
  const enemy = makeEnemy(state.spawnQueue[0], nextId, random);
  return {
    ...state,
    id: nextId,
    enemies: [...state.enemies, enemy],
    spawnQueue: state.spawnQueue.slice(1),
    spawnTimer: Math.floor(34 + random() * 34),
  };
}

function moveEnemies(state) {
  const enemies = state.enemies
    .map((enemy) => {
      const phase = enemy.wobble + enemy.wobbleSpeed * state.tickCount;
      const y = enemy.baseY + Math.sin(phase) * enemy.wobbleRange;
      return { ...enemy, x: enemy.x - enemy.vx, y };
    })
    .filter((enemy) => enemy.x + enemy.w >= -2);
  return { ...state, enemies };
}

function fireFromEnemies(state, random) {
  const fireProjectiles = [];
  const enemies = state.enemies.map((enemy) => {
    const fireTimer = enemy.fireTimer - 1;
    if (fireTimer > 0) {
      return { ...enemy, fireTimer };
    }
    const nextEnemy = {
      ...enemy,
      fireTimer: Math.floor(70 + random() * 60),
    };
    fireProjectiles.push({
      x: enemy.x - ENEMY_FIRE_WIDTH,
      y: enemy.y + enemy.h / 2 - ENEMY_FIRE_HEIGHT / 2,
      w: ENEMY_FIRE_WIDTH,
      h: ENEMY_FIRE_HEIGHT,
      vx: -ENEMY_FIRE_SPEED,
    });
    return nextEnemy;
  });

  let boss = state.boss;
  if (boss) {
    const fireTimer = boss.fireTimer - 1;
    if (fireTimer <= 0) {
      boss = {
        ...boss,
        fireTimer: Math.floor(46 + random() * 30),
      };
      const count = boss.kind === 'gargola' ? 5 : 7;
      for (let i = 0; i < count; i += 1) {
        const spread = i - (count - 1) / 2;
        fireProjectiles.push({
          x: boss.x - ENEMY_FIRE_WIDTH,
          y:
            boss.y +
            boss.h / 2 -
            ENEMY_FIRE_HEIGHT / 2 +
            spread * (boss.h / count),
          w: ENEMY_FIRE_WIDTH,
          h: ENEMY_FIRE_HEIGHT,
          vx: -ENEMY_FIRE_SPEED,
        });
      }
    } else {
      boss = { ...boss, fireTimer };
    }
  }

  return {
    ...state,
    enemies,
    boss,
    enemyFire: [...state.enemyFire, ...fireProjectiles],
  };
}

function moveBoss(state) {
  if (!state.boss) return state;
  let { boss } = state;
  if (boss.x > BOSS_HOLD_X) {
    boss = { ...boss, x: Math.max(BOSS_HOLD_X, boss.x - BOSS_SPEED) };
  } else {
    boss = {
      ...boss,
      phase: boss.phase + 0.02,
      y: boss.y + Math.sin(boss.phase) * 0.9,
    };
  }
  return { ...state, boss };
}

function moveProjectiles(state) {
  const bullets = state.bullets
    .map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx }))
    .filter((bullet) => bullet.x <= state.width + BULLET_WIDTH);
  const enemyFire = state.enemyFire
    .map((fire) => ({ ...fire, x: fire.x + fire.vx }))
    .filter((fire) => fire.x + fire.w >= -2);
  return { ...state, bullets, enemyFire };
}

function resolveBullets(state) {
  const enemies = state.enemies.map((enemy) => ({ ...enemy }));
  const bullets = [];
  let score = state.score;
  let boss = state.boss;

  for (const bullet of state.bullets) {
    let hit = false;

    for (const enemy of enemies) {
      if (enemy.hp <= 0 || !rectsOverlap(bullet, enemy, 1)) continue;
      hit = true;
      enemy.hp -= 1;
      if (enemy.hp <= 0) {
        score += enemy.kind === 'gargola' ? GARGOYLE_POINTS : DRAGON_POINTS;
      }
      break;
    }

    if (!hit && boss && rectsOverlap(bullet, boss, 1)) {
      hit = true;
      boss.hp -= 1;
      if (boss.hp <= 0) {
        score +=
          boss.kind === 'gargola' ? BOSS_GARGOYLE_POINTS : BOSS_DRAGON_POINTS;
        boss = null;
      }
    }

    if (!hit) bullets.push(bullet);
  }

  return {
    ...state,
    enemies: enemies.filter((enemy) => enemy.hp > 0),
    bullets,
    boss,
    score,
  };
}

function resolveEnemyFire(state) {
  if (state.enemyFire.length === 0) {
    return state;
  }
  let next = state;
  for (const fire of state.enemyFire) {
    if (next.invulnerableTicks > 0) break;
    if (rectsOverlap(fire, next.player, 1)) {
      next = hitPlayer(next);
      break;
    }
  }
  return next;
}

function resolveContact(state) {
  if (state.invulnerableTicks > 0) {
    return state;
  }
  let next = state;
  const collided =
    next.enemies.some((enemy) => rectsOverlap(enemy, next.player, 1)) ||
    (next.boss !== null && rectsOverlap(next.boss, next.player, 1));
  if (collided) {
    next = hitPlayer(next);
  }
  return next;
}

function levelComplete(state) {
  return {
    ...state,
    status: 'complete',
    bossPending: null,
    bossSpawned: true,
  };
}

export function tick(state, input = {}, random = Math.random) {
  if (state.status !== 'playing') return state;

  let next = {
    ...state,
    tickCount: state.tickCount + 1,
    player: {
      ...state.player,
      cooldown: Math.max(0, state.player.cooldown - 1),
    },
    invulnerableTicks: Math.max(0, state.invulnerableTicks - 1),
  };

  const direction = input.up ? -1 : input.down ? 1 : (input.move ?? 0);
  if (direction !== 0) {
    next = movePlayer(next, direction);
  }
  if (input.fire) {
    next = fire(next);
  }

  next = { ...next, spawnTimer: next.spawnTimer - 1 };
  if (next.spawnQueue.length > 0 && next.spawnTimer <= 0) {
    next = spawnNextEnemy(next, random);
  }

  next = moveEnemies(next);
  next = moveBoss(next);
  next = fireFromEnemies(next, random);
  next = moveProjectiles(next);
  next = resolveBullets(next);
  next = resolveEnemyFire(next);
  next = resolveContact(next);

  if (next.status === 'lost') {
    return next;
  }

  if (!next.boss && next.enemies.length === 0) {
    if (next.bossPending && !next.bossSpawned) {
      const boss = makeBoss(next.bossPending, random);
      next = {
        ...next,
        boss,
        bossSpawned: true,
        message: null,
      };
    }
  }

  if (next.boss) return next;

  if (next.enemies.length === 0 && next.spawnQueue.length === 0) {
    next = levelComplete(next);
  }

  return next;
}

export function nextLevel(state, random = Math.random) {
  const level = state.level + 1;
  if (level > MAX_LEVEL) {
    return {
      ...state,
      level: MAX_LEVEL,
      status: 'won',
      message: VICTORY_MESSAGE,
    };
  }
  const fresh = createLevel(level, random);
  return {
    ...fresh,
    score: state.score,
    lives: state.lives,
    status: 'playing',
    message: null,
  };
}

export function restart(state, random = Math.random) {
  const fresh = createLevel(state.level, random);
  return { ...fresh, status: 'playing' };
}
