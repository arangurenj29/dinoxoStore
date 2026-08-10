import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL(
  '../.github/workflows/quality.yml',
  import.meta.url,
);

async function readJob(name) {
  const workflow = await readFile(workflowUrl, 'utf8');
  const marker = `  ${name}:\n`;
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, `CI debe declarar el job ${name}`);
  const tail = workflow.slice(start + marker.length);
  const nextJob = tail.search(/^ {2}[a-z][a-z0-9_-]*:\n/m);
  const job = marker + (nextJob >= 0 ? tail.slice(0, nextJob) : tail);
  return { job, workflow };
}

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

test('CI ejecuta las pruebas SQL contra un stack Supabase local con CLI fijada', async () => {
  const { job } = await readJob('database');

  assert.match(job, /runs-on: ubuntu-latest/);
  assert.match(job, /version: 2\.101\.0/);
  assert.match(job, /run: supabase db start/);
  assert.match(job, /run: supabase test db --local/);
  assert.doesNotMatch(job, /supabase (?:link|db push)|--linked/);
});

test('CI nunca escribe en la única Supabase productiva', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.doesNotMatch(workflow, /^\s{2}migrate:\n/m);
  assert.doesNotMatch(workflow, /supabase link|supabase db push|--linked/);
  assert.doesNotMatch(
    workflow,
    /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_PROJECT_ID/,
  );
  assert.doesNotMatch(workflow, /include-seed|db reset|workflow_dispatch/);
});

test('producción se serializa sin cancelar una mutación en curso', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(
    workflow,
    /concurrency:\s*\n\s+group: production-\$\{\{ github\.repository \}\}-\$\{\{ github\.ref \}\}/,
  );
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /cancel-in-progress: true/);
});

test('deploy depende de ambos gates y concede solo permisos necesarios', async () => {
  const { job } = await readJob('deploy');

  assert.match(job, /needs:\s*\[storefront, database\]/);
  assert.match(
    job,
    /permissions:\s*\n\s+contents: read\s*\n\s+deployments: write/,
  );
});

test('deploy construye producción y usa Wrangler fijado desde el subdirectorio', async () => {
  const { job } = await readJob('deploy');
  const build = job.indexOf('run: corepack pnpm build:production');
  const deploy = job.indexOf(
    'uses: cloudflare/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd',
  );

  assert.ok(build >= 0, 'Deploy debe construir producción explícitamente');
  assert.ok(deploy > build, 'Wrangler debe ejecutarse después del build');
  assert.match(job, /workingDirectory: apps\/storefront/);
  assert.match(job, /wranglerVersion: 4\.118\.0/);
  assert.match(job, /command: deploy/);
  assert.match(job, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(job, /accountId: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.match(job, /gitHubToken: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.doesNotMatch(job, /supabase (?:db push|migration|link)/);
});

test('acciones con acceso a producción están fijadas por SHA completo', async () => {
  const deploy = (await readJob('deploy')).job;
  const smoke = (await readJob('smoke')).job;
  const productionJobs = `${deploy}\n${smoke}`;
  const actionReferences = [
    ...productionJobs.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g),
  ];

  assert.ok(actionReferences.length >= 4);
  for (const [, reference] of actionReferences) {
    assert.match(reference, /^[0-9a-f]{40}$/);
  }
  assert.match(
    deploy,
    /cloudflare\/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd/,
  );
});

test('smoke corre después del deploy y verifica producción sin credenciales', async () => {
  const { job, workflow } = await readJob('smoke');
  const databasePosition = workflow.indexOf('  database:');
  const deployPosition = workflow.indexOf('  deploy:');
  const smokePosition = workflow.indexOf('  smoke:');

  assert.ok(
    databasePosition < deployPosition && deployPosition < smokePosition,
  );
  assert.match(job, /needs:\s*deploy/);
  assert.match(job, /run: node scripts\/production-smoke\.mjs/);
  assert.doesNotMatch(job, /CLOUDFLARE_|SUPABASE_|environment:\s*production/);
});

test('la guía de despliegue documenta configuración mínima, rollback y límites', async () => {
  const guide = await readFile(
    new URL('../docs/deployment/cloudflare-production.md', import.meta.url),
    'utf8',
  );

  assert.match(guide, /GitHub Environment `production`/);
  assert.match(guide, /CLOUDFLARE_API_TOKEN/);
  assert.match(guide, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(guide, /workflow nunca escribe en Supabase/);
  assert.match(guide, /aplican manualmente/);
  assert.match(guide, /Workers Scripts (?:Edit|Write)/);
  assert.match(guide, /Workers Routes (?:Edit|Write)/);
  assert.match(guide, /wrangler versions list/);
  assert.match(guide, /wrangler rollback/);
  assert.match(guide, /supabase db push --linked/);
  assert.match(guide, /archivos versionados en `supabase\/migrations`/i);
  assert.match(guide, /no se cancela/i);
});
