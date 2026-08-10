import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderDeployHeaders } from '../src/lib/deploy-headers.ts';
import { loadPublicConfig } from './public-config.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const storefrontDirectory = path.resolve(scriptDirectory, '..');
const deployEnvironment = process.argv[2] ?? 'preview';

if (deployEnvironment !== 'preview' && deployEnvironment !== 'production') {
  throw new Error(`Unsupported deploy environment: ${deployEnvironment}`);
}

const publicDirectory = path.join(storefrontDirectory, 'public');
const config = await loadPublicConfig(
  new URL('../config/public-env.json', import.meta.url),
  deployEnvironment,
  process.env,
);
await mkdir(publicDirectory, { recursive: true });
await writeFile(
  path.join(publicDirectory, '_headers'),
  renderDeployHeaders(deployEnvironment, config.supabaseUrl),
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
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
    PUBLIC_SUPABASE_URL: config.supabaseUrl,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
