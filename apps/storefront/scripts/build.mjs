import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderDeployHeaders } from '../src/lib/deploy-headers.ts';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const storefrontDirectory = path.resolve(scriptDirectory, '..');
const deployEnvironment = process.argv[2] ?? 'preview';

if (deployEnvironment !== 'preview' && deployEnvironment !== 'production') {
  throw new Error(`Unsupported deploy environment: ${deployEnvironment}`);
}

const publicDirectory = path.join(storefrontDirectory, 'public');
await mkdir(publicDirectory, { recursive: true });
await writeFile(
  path.join(publicDirectory, '_headers'),
  renderDeployHeaders(deployEnvironment),
  'utf8',
);

const astroExecutable = path.join(
  storefrontDirectory,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'astro.cmd' : 'astro',
);
const result = spawnSync(astroExecutable, ['build'], {
  cwd: storefrontDirectory,
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    PUBLIC_DEPLOY_ENV: deployEnvironment,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
