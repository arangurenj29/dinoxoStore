import {
  JUMP_DURATION_MS,
  JUMP_GUARD_DURATION_MS,
  canJump,
  createInitialRunnerState,
  paceFromScore,
  rectanglesOverlap,
  scoreFromElapsed,
} from './nox-runner-engine.js';

const runner = document.querySelector('[data-nox-runner]');

if (runner) {
  const arena = runner.querySelector('[data-runner-arena]');
  const character = runner.querySelector('[data-runner-character]');
  const hitbox = runner.querySelector('[data-runner-hitbox]');
  const message = runner.querySelector('[data-runner-message]');
  const pace = runner.querySelector('[data-runner-pace]');
  const result = runner.querySelector('[data-runner-result]');
  const score = runner.querySelector('[data-runner-score]');
  const startButton = runner.querySelector('[data-runner-start]');
  const status = runner.querySelector('[data-runner-status]');

  let animationFrame = 0;
  let isJumping = false;
  let isRunning = false;
  let obstacleTimeout = 0;
  let safeUntil = 0;
  let startedAt = 0;
  let state = createInitialRunnerState();

  function render() {
    score.textContent = String(state.score).padStart(3, '0');
    pace.textContent = String(state.pace).padStart(2, '0');
    status.textContent = isRunning
      ? 'En marcha'
      : state.score
        ? 'Finalizada'
        : 'Lista';
  }

  function clearObstacles() {
    window.clearTimeout(obstacleTimeout);
    arena
      .querySelectorAll('[data-runner-obstacle]')
      .forEach((obstacle) => obstacle.remove());
  }

  function obstacleDelay() {
    if (state.pace === 3) return 800 + Math.floor(Math.random() * 500);
    if (state.pace === 2) return 1050 + Math.floor(Math.random() * 600);
    return 1400 + Math.floor(Math.random() * 800);
  }

  function spawnObstacle() {
    if (!isRunning) return;

    const obstacle = document.createElement('span');
    const variant = Math.random() > 0.62 ? 'block' : 'spike';
    obstacle.className = `nox-runner__obstacle nox-runner__obstacle--${variant} nox-runner__obstacle--pace-${state.pace}`;
    obstacle.dataset.runnerObstacle = '';
    obstacle.setAttribute('aria-hidden', 'true');
    obstacle.addEventListener('animationend', () => obstacle.remove(), {
      once: true,
    });
    arena.append(obstacle);

    obstacleTimeout = window.setTimeout(spawnObstacle, obstacleDelay());
  }

  function finishRun() {
    isRunning = false;
    isJumping = false;
    window.cancelAnimationFrame(animationFrame);
    clearObstacles();
    character.classList.remove('is-jumping');
    arena.dataset.runnerState = 'finished';
    startButton.textContent = 'Correr otra vez';
    startButton.disabled = false;
    result.hidden = false;
    result.textContent = `Carrera terminada: ${state.score} puntos. Tu récord vive hasta que cierres la página.`;
    message.textContent = 'Glitch detectado. Nox puede intentarlo de nuevo.';
    render();
  }

  function checkCollision() {
    if (!isRunning || isJumping || performance.now() < safeUntil) return;
    const characterBounds = hitbox.getBoundingClientRect();
    const collided = [...arena.querySelectorAll('[data-runner-obstacle]')].some(
      (obstacle) =>
        rectanglesOverlap(
          characterBounds,
          obstacle.getBoundingClientRect(),
          12,
        ),
    );
    if (collided) finishRun();
  }

  function update() {
    if (!isRunning) return;
    state = {
      ...state,
      score: scoreFromElapsed(performance.now() - startedAt),
    };
    state = { ...state, pace: paceFromScore(state.score) };
    render();
    checkCollision();
    animationFrame = window.requestAnimationFrame(update);
  }

  function jump() {
    if (!canJump({ isRunning, isJumping })) return;
    isJumping = true;
    safeUntil = performance.now() + JUMP_GUARD_DURATION_MS;
    character.classList.add('is-jumping');
    message.textContent = '¡Buen salto! Seguí corriendo.';
    window.setTimeout(() => {
      isJumping = false;
      character.classList.remove('is-jumping');
    }, JUMP_DURATION_MS);
  }

  function startRun() {
    window.cancelAnimationFrame(animationFrame);
    clearObstacles();
    state = createInitialRunnerState();
    isJumping = false;
    safeUntil = 0;
    isRunning = true;
    startedAt = performance.now();
    arena.dataset.runnerState = 'playing';
    result.hidden = true;
    startButton.disabled = true;
    message.textContent =
      '¡A correr! Saltá los glitches que aparezcan en la pista.';
    render();
    obstacleTimeout = window.setTimeout(spawnObstacle, 850);
    update();
  }

  arena.addEventListener('pointerdown', jump);
  startButton.addEventListener('click', startRun);
  window.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Space' &&
      event.code !== 'ArrowUp' &&
      event.code !== 'Enter'
    )
      return;
    if (!isRunning) return;
    event.preventDefault();
    jump();
  });
  render();
}
