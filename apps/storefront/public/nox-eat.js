import {
  CARD_POINTS,
  EXPLOSION_SHAPES,
  LIVES,
  allEnemiesEaten,
  createLevel,
  explodeCard,
  moveEnemies,
  movePlayer,
  resolveCollisions,
  tickFlee,
  tickMode,
  tickStun,
} from './nox-eat-engine.js';
import { NoxEatAudio } from './nox-eat-audio.js';

const CARD_META = {
  P: { key: 'playstation', label: 'PS', points: CARD_POINTS.playstation },
  N: { key: 'nintendo', label: 'NX', points: CARD_POINTS.nintendo },
  X: { key: 'xbox', label: 'XB', points: CARD_POINTS.xbox },
};

const DIRS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

const MODE_LABELS = {
  red: '¡Modo rojo! Comé a los dragones',
};

const game = document.querySelector('[data-nox-eat]');

if (game) {
  const arenaEl = game.querySelector('.nox-eat__arena');
  const stageEl = game.querySelector('.nox-eat__stage');
  const grid = game.querySelector('[data-nox-eat-grid]');
  const scoreEl = game.querySelector('[data-game-score]');
  const cardsEl = game.querySelector('[data-game-cards]');
  const livesEl = game.querySelector('[data-game-lives]');
  const levelEl = game.querySelector('[data-game-level]');
  const resultEl = game.querySelector('[data-game-result]');
  const statusEl = game.querySelector('[data-game-status]');
  const startButton = game.querySelector('[data-game-start]');
  const playerEl = game.querySelector('[data-nox-eat-player]');
  const overlay = game.querySelector('[data-nox-eat-overlay]');
  const overlayTitle = game.querySelector('[data-nox-eat-overlay-title]');
  const overlayText = game.querySelector('[data-nox-eat-overlay-text]');
  const enemyEls = Array.from(game.querySelectorAll('[data-nox-eat-enemy]'));

  const ENEMY_SOURCES = [
    '/brand/mascot/nox-enemy-1.png',
    '/brand/mascot/nox-enemy-2.png',
    '/brand/mascot/nox-enemy-3.png',
  ];

  function ensureEnemies() {
    for (let i = enemyEls.length; i < state.enemies.length; i += 1) {
      const img = document.createElement('img');
      img.className = 'nox-eat__enemy';
      img.dataset.noxEatEnemy = String(i + 1);
      img.src = ENEMY_SOURCES[i % ENEMY_SOURCES.length];
      img.alt = '';
      img.width = 240;
      img.height = 171;
      stageEl.append(img);
      enemyEls.push(img);
    }
  }

  const audio = new NoxEatAudio();
  let level = 1;
  let state = createLevel(level);
  let running = false;
  let timer = 0;
  let pendingDir = null;
  let statusMessage = '';
  let preserveLivesOnNext = false;
  let enemyMoveAccum = 0;

  function bite(cardCell) {
    playerEl.classList.remove(
      'nox-eat__player--chomp',
      'nox-eat__player--card',
    );
    void playerEl.offsetWidth;
    playerEl.classList.add(
      cardCell ? 'nox-eat__player--card' : 'nox-eat__player--chomp',
    );
  }

  function showExplosion(cardType) {
    const shape = EXPLOSION_SHAPES[cardType];
    if (!shape) return;
    for (const [dx, dy] of shape) {
      const x = state.player.x + dx;
      const y = state.player.y + dy;
      if (x < 0 || y < 0 || x >= state.width || y >= state.height) continue;
      if (state.maze[y][x] === '#') continue;
      const fire = document.createElement('span');
      fire.className = 'nox-eat__fire';
      fire.style.left = `calc(${x} * var(--nox-eat-cell))`;
      fire.style.top = `calc(${y} * var(--nox-eat-cell))`;
      stageEl.append(fire);
    }
    window.setTimeout(() => {
      for (const fire of stageEl.querySelectorAll('.nox-eat__fire')) {
        fire.remove();
      }
    }, 700);
  }

  function cells() {
    return Array.from(grid.querySelectorAll('[data-x]'));
  }

  function render() {
    scoreEl.textContent = String(state.score).padStart(3, '0');
    cardsEl.textContent = [
      `PS ${state.cards.playstation}`,
      `NX ${state.cards.nintendo}`,
      `XB ${state.cards.xbox}`,
    ].join(' · ');
    if (livesEl) {
      livesEl.textContent = String(Math.max(state.lives, 0));
    }
    levelEl.textContent = String(state.level);
  }

  function fitBoard() {
    const available = arenaEl.clientWidth - 8;
    const cell = Math.max(
      13,
      Math.min(46, Math.floor(available / state.width)),
    );
    arenaEl.style.setProperty('--nox-eat-cell', `${cell}px`);
  }

  function buildGrid() {
    grid.innerHTML = '';
    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        const value = state.maze[y][x];
        const cell = document.createElement('span');
        cell.className = 'nox-eat__cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);

        if (value === '#') {
          cell.classList.add('nox-eat__cell--wall');
        } else {
          cell.classList.add('nox-eat__cell--open');
          const meta = CARD_META[value];
          if (meta) {
            const label = document.createElement('span');
            label.className = `nox-eat__card nox-eat__card--${meta.key}`;
            label.dataset.brand = meta.key;
            cell.append(label);
          }
        }
        grid.append(cell);
      }
    }
    fitBoard();
  }

  function renderBoard() {
    for (const cell of cells()) {
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      if (cell.classList.contains('nox-eat__cell--wall')) continue;
      cell.classList.toggle(
        'nox-eat__cell--eaten',
        state.eaten.has(`${x},${y}`),
      );
    }
  }

  function renderPlayer() {
    playerEl.style.setProperty('--nox-eat-x', state.player.x);
    playerEl.style.setProperty('--nox-eat-y', state.player.y);
    playerEl.classList.toggle('nox-eat__player--power', state.mode === 'red');
    playerEl.classList.toggle('nox-eat__player--stunned', state.stunned > 0);
  }

  function renderEnemies() {
    for (const enemyEl of enemyEls) {
      const index = Number(enemyEl.dataset.noxEatEnemy) - 1;
      const enemy = state.enemies[index];
      if (!enemy) {
        enemyEl.hidden = true;
        continue;
      }
      enemyEl.style.setProperty('--nox-eat-x', enemy.x);
      enemyEl.style.setProperty('--nox-eat-y', enemy.y);
      enemyEl.hidden = enemy.eaten;
      enemyEl.classList.toggle(
        'nox-eat__enemy--vulnerable',
        state.mode === 'red',
      );
      enemyEl.classList.toggle('nox-eat__enemy--scatter', state.fleeTicks > 0);
    }
  }

  function renderMode() {
    if (state.stunned > 0) {
      const seconds = Math.ceil(state.stunned * 0.15);
      statusEl.textContent = `¡NOX PARALIZADO! Recuperándose en ${seconds}s`;
    } else if (state.fleeTicks > 0) {
      statusEl.textContent = '¡Los dragones huyen de Nox!';
    } else if (state.mode !== 'normal') {
      const seconds = Math.ceil(state.modeTicks * 0.15);
      statusEl.textContent = `${MODE_LABELS[state.mode]} · ${seconds}s`;
    } else if (statusMessage) {
      statusEl.textContent = statusMessage;
    } else {
      statusEl.textContent = 'Movete con las flechas o WASD.';
    }
  }

  function finish(message, defeated = false) {
    running = false;
    window.clearInterval(timer);
    audio.stopMusic();
    playerEl.classList.remove(
      'nox-eat__player--chomp',
      'nox-eat__player--card',
      'nox-eat__player--power',
      'nox-eat__player--fragile',
      'nox-eat__player--stunned',
    );
    for (const enemyEl of enemyEls) {
      enemyEl.classList.remove(
        'nox-eat__enemy--vulnerable',
        'nox-eat__enemy--scatter',
      );
    }
    resultEl.textContent = message;
    if (defeated) {
      level = 1;
      preserveLivesOnNext = false;
      audio.playGameOver();
      overlayTitle.textContent = '¡Fin de la partida!';
      overlayText.textContent = `Puntaje final: ${state.score}. Te quedaste sin vidas. ¿Volvés a intentarlo desde el nivel 1?`;
      startButton.textContent = 'Volver a jugar';
    } else {
      level += 1;
      preserveLivesOnNext = true;
      audio.playGrowl();
      overlayTitle.textContent = '¡RICO! NOX ESTÁ SATISFECHO PERO QUIERE MÁS';
      overlayText.textContent = `Nivel ${state.level} superado. Nivel ${level}: +1 dragón y un tablero más grande.`;
      startButton.textContent = 'Siguiente nivel';
    }
    overlay.hidden = false;
  }

  function step() {
    if (!running) return;

    state = tickMode(state);
    state = tickStun(state);
    state = tickFlee(state);

    if (state.stunned > 0) {
      // Nox paralizado: no se mueve; los dragones huyen con tickFlee.
    } else {
      const playerSteps = state.mode === 'normal' ? 1 : 2;
      const livesBefore = state.lives;
      if (state.fleeTicks <= 0) {
        // En modo rojo los enemigos corren más lento: 1 casilla cada 2 ticks.
        if (state.mode === 'red') {
          enemyMoveAccum += 1;
          if (enemyMoveAccum >= 2) {
            enemyMoveAccum = 0;
            state = moveEnemies(state, undefined, 1);
          }
        } else {
          enemyMoveAccum = 0;
          state = moveEnemies(state, undefined, 1);
        }
      }
      state = resolveCollisions(state);

      if (pendingDir && !state.defeated) {
        const [dx, dy] = pendingDir;
        pendingDir = null;
        for (let i = 0; i < playerSteps; i += 1) {
          const eatenBefore = state.eaten.size;
          state = movePlayer(state, dx, dy);
          if (!state.moved) break;
          const meta = CARD_META[state.maze[state.player.y][state.player.x]];
          if (state.eaten.size > eatenBefore) {
            bite(Boolean(meta));
            if (meta) {
              audio.playCard();
              statusMessage = `+${meta.points} puntos · ${meta.label}`;
              const cardType = state.maze[state.player.y][state.player.x];
              const beforeEnemies = state.enemies.filter(
                (enemy) => !enemy.eaten,
              ).length;
              state = explodeCard(state);
              showExplosion(cardType);
              const killed =
                beforeEnemies -
                state.enemies.filter((enemy) => !enemy.eaten).length;
              if (killed > 0) {
                audio.playEnemy();
                statusMessage += ` · ¡Boom! ${killed} dragón${killed > 1 ? 'es' : ''}`;
              }
            } else {
              audio.playEat();
            }
          }
          state = resolveCollisions(state);
          if (state.defeated) break;
        }
      }

      if (state.lives < livesBefore && !state.defeated) {
        audio.playHit();
      }
    }

    render();
    renderBoard();
    renderPlayer();
    renderEnemies();
    renderMode();

    if (state.defeated) {
      finish('¡Te atraparon!', true);
      return;
    }
    if (state.complete) {
      finish(`¡Nivel completo! Puntaje final: ${state.score}`);
      return;
    }
    if (allEnemiesEaten(state)) {
      start({ preserveLives: true });
      statusMessage = '¡Comiste a todos los dragones! Tablero regenerado.';
      statusEl.textContent = statusMessage;
    }
  }

  function start(options = {}) {
    const keepLives = Boolean(options.preserveLives) || preserveLivesOnNext;
    const previousLives = keepLives && state ? state.lives : LIVES;
    preserveLivesOnNext = false;
    state = createLevel(level);
    state.lives = previousLives;
    running = true;
    pendingDir = null;
    statusMessage = '';
    resultEl.textContent = '';
    overlayTitle.textContent = '¿Listo para devorar?';
    overlayText.textContent =
      'Comé los puntos, atrapá las gift cards y esquivá a los dragones.';
    startButton.textContent = 'Iniciar partida';
    overlay.hidden = true;
    render();
    buildGrid();
    ensureEnemies();
    renderBoard();
    renderPlayer();
    renderEnemies();
    renderMode();
    audio.startMusic();
    window.clearInterval(timer);
    timer = window.setInterval(step, 150);
  }

  startButton.addEventListener('click', start);
  playerEl.addEventListener('animationend', () => {
    playerEl.classList.remove(
      'nox-eat__player--chomp',
      'nox-eat__player--card',
    );
  });
  window.addEventListener('keydown', (event) => {
    if (!(event.code in DIRS)) return;
    event.preventDefault();
    pendingDir = DIRS[event.code];
  });
  window.addEventListener('resize', () => {
    if (state) fitBoard();
  });

  render();
  buildGrid();
  ensureEnemies();
  renderBoard();
  renderPlayer();
  renderEnemies();
}
