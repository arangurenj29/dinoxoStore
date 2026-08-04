import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL(
  '../.github/workflows/quality.yml',
  import.meta.url,
);

test('CI habilita Corepack antes de instalar sin solicitar caché pnpm prematura', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');
  const corepackStep = workflow.indexOf('run: corepack enable');
  const installStep = workflow.indexOf(
    'run: corepack pnpm install --frozen-lockfile',
  );

  assert.doesNotMatch(workflow, /cache:\s*pnpm/);
  assert.ok(corepackStep >= 0, 'CI debe habilitar Corepack');
  assert.ok(installStep > corepackStep, 'CI debe instalar después de Corepack');
});

test('CI valida marca y cada build con un smoke de entorno explícito', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /corepack pnpm test:static:preview/);
  assert.match(workflow, /corepack pnpm test:static:production/);
  assert.match(workflow, /python3 brand\/tools\/validate_brand\.py/);
});
