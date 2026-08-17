import {
  MAX_LEVEL,
  VICTORY_MESSAGE,
  createInitialState,
  nextLevel,
  tick,
} from './nox-invader-engine.js';
import { NoxInvaderAudio } from './nox-invader-audio.js';

const game = document.querySelector('[data-nox-invader]');

if (game) {
  const arenaEl = game.querySelector('[data-nox-invader-arena]');
  const stageEl = game.querySelector('[data-nox-invader-stage]');
  const scoreEl = game.querySelector('[data-game-score]');
  const livesEl = game.querySelector('[data-game-lives]');
  const levelEl = game.querySelector('[data-game-level]');
  const resultEl = game.querySelector('[data-game-result]');
  const statusEl = game.querySelector('[data-game-status]');
  const startButton = game.querySelector('[data-game-start]');
  const playerEl = game.querySelector('[data-nox-invader-player]');
  const bossEl = game.querySelector('[data-nox-invader-boss]');
  const overlay = game.querySelector('[data-nox-invader-overlay]');
  const overlayTitle = game.querySelector('[data-nox-invader-overlay-title]');
  const overlayText = game.querySelector('[data-nox-invader-overlay-text]');

  const ENEMY_SOURCES = {
    gargola: '/brand/invader/gargola.png',
    dragon: '/brand/invader/dragon-bone.png',
  };

  const audio = new NoxInvaderAudio();
  let state = createInitialState();
  let running = false;
  let timer = 0;
  let enemyElements = new Map();
  let upPressed = false;
  let downPressed = false;

  function unit() {
    return Math.max(3, Math.min(11, Math.floor(arenaEl.clientWidth / 120)));
  }

  function scaleBox(entity, ratio, extra = 1) {
    const u = unit();
    const w = entity.w * u * extra;
    const h = entity.h * u * ratio * extra;
    return {
      left: entity.x * u + (entity.w * u - w) / 2,
      top: entity.y * u + (entity.h * u - h) / 2,
      width: w,
      height: h,
    };
  }

  function renderProjectiles() {
    const u = unit();
    for (const el of stageEl.querySelectorAll('.nox-invader__shot')) {
      el.remove();
    }
    for (const el of stageEl.querySelectorAll('.nox-invader__fire')) {
      el.remove();
    }
    for (const bullet of state.bullets) {
      const el = document.createElement('span');
      el.className = 'nox-invader__shot';
      el.setAttribute('aria-hidden', 'true');
      el.style.left = `${bullet.x * u}px`;
      el.style.top = `${bullet.y * u}px`;
      stageEl.append(el);
    }
    for (const fire of state.enemyFire) {
      const el = document.createElement('span');
      el.className = 'nox-invader__fire';
      el.setAttribute('aria-hidden', 'true');
      el.style.left = `${fire.x * u}px`;
      el.style.top = `${fire.y * u}px`;
      stageEl.append(el);
    }
  }

  function render() {
    scoreEl.textContent = String(state.score).padStart(4, '0');
    livesEl.textContent = String(Math.max(state.lives, 0));
    levelEl.textContent = String(state.level);

    const playerBox = scaleBox(state.player, 1, 1.45);
    playerEl.style.left = `${playerBox.left}px`;
    playerEl.style.top = `${playerBox.top}px`;
    playerEl.style.width = `${playerBox.width}px`;
    playerEl.style.height = `${playerBox.height}px`;
    playerEl.classList.toggle(
      'nox-invader__player--flash',
      state.invulnerableTicks > 0,
    );

    if (state.boss) {
      const ratio = state.boss.kind === 'gargola' ? 23 / 16 : 18 / 20;
      const box = scaleBox(state.boss, ratio, 1.3);
      bossEl.src =
        state.boss.kind === 'gargola'
          ? '/brand/invader/gargola-boss.png'
          : '/brand/invader/dragon-bone-boss.png';
      bossEl.hidden = false;
      bossEl.style.left = `${box.left}px`;
      bossEl.style.top = `${box.top}px`;
      bossEl.style.width = `${box.width}px`;
      bossEl.style.height = `${box.height}px`;
    } else {
      bossEl.hidden = true;
    }

    const enemyIds = new Set();
    for (const enemy of state.enemies) {
      enemyIds.add(enemy.id);
      let enemyEl = enemyElements.get(enemy.id);
      if (!enemyEl) {
        enemyEl = document.createElement('img');
        enemyEl.className = `nox-invader__enemy nox-invader__enemy--${enemy.kind}`;
        enemyEl.src = ENEMY_SOURCES[enemy.kind];
        enemyEl.alt = '';
        enemyEl.setAttribute('aria-hidden', 'true');
        stageEl.append(enemyEl);
        enemyElements.set(enemy.id, enemyEl);
      }
      const ratio = enemy.kind === 'gargola' ? 176 / 289 : 264 / 290;
      const box = scaleBox(enemy, ratio, 1.35);
      enemyEl.style.left = `${box.left}px`;
      enemyEl.style.top = `${box.top}px`;
      enemyEl.style.width = `${box.width}px`;
      enemyEl.style.height = `${box.height}px`;
    }
    for (const [id, enemyEl] of enemyElements) {
      if (!enemyIds.has(id)) {
        enemyEl.remove();
        enemyElements.delete(id);
      }
    }

    renderProjectiles();
  }

  function renderStatus(message) {
    statusEl.textContent = message;
  }

  function start() {
    window.clearInterval(timer);
    state = createInitialState();
    enemyElements.clear();
    resultEl.textContent = '';
    renderStatus('¡A disparar! Esquivá el fuego y derribá a los invasores.');
    running = true;
    overlay.hidden = true;
    render();
    audio.startMusic();
    timer = window.setInterval(step, 50);
  }

  function finish(message, defeated) {
    running = false;
    window.clearInterval(timer);
    audio.stopMusic();
    renderStatus('');
    resultEl.textContent = message;
    overlay.hidden = false;
    if (defeated) {
      audio.playGameOver();
      overlayTitle.textContent = '¡Fin de la partida!';
      overlayText.textContent = `Puntaje final: ${state.score}. Nox no pudo contener la invasión.`;
      startButton.textContent = 'Volver a jugar';
    } else if (state.level >= MAX_LEVEL) {
      audio.playVictory();
      overlayTitle.textContent = '¡INVASIÓN DETENIDA!';
      overlayText.textContent = `${VICTORY_MESSAGE}. Puntaje final: ${state.score}.`;
      startButton.textContent = 'Jugar de nuevo';
    } else {
      audio.playBoss();
      overlayTitle.textContent = `Nivel ${state.level} superado`;
      overlayText.textContent = `Puntaje: ${state.score}. Preparate para la próxima oleada.`;
      startButton.textContent = 'Siguiente nivel';
    }
  }

  function step() {
    if (!running) return;

    const livesBefore = state.lives;
    const shotsBefore = state.bullets.length;
    const enemiesBefore = state.enemies.length;
    state = tick(
      state,
      { up: upPressed, down: downPressed, fire: true },
      Math.random,
    );
    if (state.bullets.length > shotsBefore) {
      audio.playShot();
    }
    if (state.lives < livesBefore) {
      audio.playHit();
    }
    if (state.enemies.length < enemiesBefore) {
      audio.playExplosion();
    }

    render();

    if (state.status === 'lost') {
      finish('¡Te alcanzaron! Nox perdió todas sus vidas.', true);
      return;
    }
    if (state.status === 'complete') {
      if (state.level >= MAX_LEVEL) {
        state = nextLevel(state);
        render();
        finish(`${VICTORY_MESSAGE}.`, false);
      } else {
        finish(`Nivel ${state.level} superado. Puntaje: ${state.score}`, false);
      }
      return;
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      upPressed = true;
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      event.preventDefault();
      downPressed = true;
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      upPressed = false;
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      downPressed = false;
    }
  });

  const dpad = game.querySelector('.nox-invader__dpad');
  if (dpad) {
    const stateMap = { up: 'up', down: 'down' };
    dpad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('[data-dpad]');
      if (!btn) return;
      e.preventDefault();
      const dir = stateMap[btn.dataset.dpad];
      if (dir === 'up') upPressed = true;
      if (dir === 'down') downPressed = true;
    });
    dpad.addEventListener('pointerup', (e) => {
      const btn = e.target.closest('[data-dpad]');
      if (!btn) return;
      const dir = stateMap[btn.dataset.dpad];
      if (dir === 'up') upPressed = false;
      if (dir === 'down') downPressed = false;
    });
    dpad.addEventListener('pointerleave', () => {
      upPressed = false;
      downPressed = false;
    });
  }

  arenaEl.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      const rect = arenaEl.getBoundingClientRect();
      const y = e.touches[0].clientY - rect.top;
      if (y < rect.height / 2) {
        upPressed = true;
      } else {
        downPressed = true;
      }
    },
    { passive: false },
  );
  arenaEl.addEventListener(
    'touchend',
    () => {
      upPressed = false;
      downPressed = false;
    },
    { passive: true },
  );
  arenaEl.addEventListener(
    'touchcancel',
    () => {
      upPressed = false;
      downPressed = false;
    },
    { passive: true },
  );

  startButton.addEventListener('click', () => {
    if (state.status === 'complete' && state.level < MAX_LEVEL) {
      const next = nextLevel(state);
      window.clearInterval(timer);
      state = next;
      enemyElements.clear();
      resultEl.textContent = '';
      running = true;
      overlay.hidden = true;
      render();
      audio.startMusic();
      timer = window.setInterval(step, 50);
    } else {
      start();
    }
  });

  render();
}
