import {
  ROUND_DURATION_MS,
  TARGET_TYPES,
  collectTarget,
  createInitialState,
  formatRemainingTime,
  missTarget,
  selectPosition,
  selectTargetType,
} from './dino-rush-engine.js';

const game = document.querySelector('[data-dino-rush]');

if (game) {
  const arena = game.querySelector('[data-game-arena]');
  const combo = game.querySelector('[data-game-combo]');
  const result = game.querySelector('[data-game-result]');
  const score = game.querySelector('[data-game-score]');
  const startButton = game.querySelector('[data-game-start]');
  const status = game.querySelector('[data-game-status]');
  const time = game.querySelector('[data-game-time]');

  let activeTarget = null;
  let animationFrame = 0;
  let roundEndsAt = 0;
  let running = false;
  let spawnTimeout = 0;
  let state = createInitialState();

  function render() {
    score.textContent = String(state.score).padStart(3, '0');
    combo.textContent = `×${state.combo}`;
  }

  function clearActiveTarget() {
    window.clearTimeout(spawnTimeout);
    activeTarget?.remove();
    activeTarget = null;
  }

  function scheduleNextTarget(delay = 120) {
    window.clearTimeout(spawnTimeout);
    spawnTimeout = window.setTimeout(spawnTarget, delay);
  }

  function markMiss(message) {
    state = missTarget(state);
    render();
    status.textContent = message;
  }

  function createBurst(position) {
    const burst = document.createElement('span');
    burst.className = `dino-rush__burst dino-rush__position-${position + 1}`;
    burst.setAttribute('aria-hidden', 'true');
    arena.append(burst);
    window.setTimeout(() => burst.remove(), 420);
  }

  function spawnTarget() {
    if (!running) return;

    const type = selectTargetType();
    const position = selectPosition();
    const target = document.createElement('button');
    const targetData = TARGET_TYPES[type];
    const lifetime = type === 'surge' ? 680 : 940;

    target.className = `dino-rush__target dino-rush__target--${type} dino-rush__position-${position + 1}`;
    target.type = 'button';
    target.dataset.target = type;
    target.setAttribute('aria-label', `Capturar ${targetData.label}`);
    target.innerHTML = '<span aria-hidden="true"></span>';
    target.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      if (!running || activeTarget !== target) return;

      window.clearTimeout(spawnTimeout);
      activeTarget = null;
      state = collectTarget(state, type);
      render();
      createBurst(position);
      target.remove();
      status.textContent = `+${targetData.points} energía. Combo ×${state.combo}.`;
      scheduleNextTarget();
    });

    activeTarget = target;
    arena.append(target);
    spawnTimeout = window.setTimeout(() => {
      if (!running || activeTarget !== target) return;
      activeTarget = null;
      target.remove();
      markMiss('El núcleo se escapó. Combo reiniciado.');
      scheduleNextTarget(160);
    }, lifetime);
  }

  function finishRound() {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    clearActiveTarget();
    arena.dataset.gameState = 'finished';
    time.textContent = '0.0';
    startButton.textContent = 'Jugar otra vez';
    startButton.disabled = false;
    result.hidden = false;
    result.textContent = `Partida terminada: ${state.score} puntos y ${state.captures} núcleos capturados.`;
    status.textContent =
      'Partida terminada. Puedes volver a jugar cuando quieras.';
  }

  function updateTimer() {
    const remaining = roundEndsAt - performance.now();
    time.textContent = formatRemainingTime(remaining);
    if (remaining <= 0) {
      finishRound();
      return;
    }
    animationFrame = window.requestAnimationFrame(updateTimer);
  }

  function startRound() {
    window.cancelAnimationFrame(animationFrame);
    clearActiveTarget();
    state = createInitialState();
    running = true;
    roundEndsAt = performance.now() + ROUND_DURATION_MS;
    arena.dataset.gameState = 'playing';
    result.hidden = true;
    startButton.disabled = true;
    status.textContent = 'Consola activa. Captura la energía azul.';
    render();
    updateTimer();
    spawnTarget();
  }

  arena.addEventListener('pointerdown', () => {
    if (!running) return;
    if (activeTarget) {
      clearActiveTarget();
      markMiss('El vacío no carga energía. Combo reiniciado.');
      scheduleNextTarget(160);
    }
  });

  startButton.addEventListener('click', startRound);
  render();
}
