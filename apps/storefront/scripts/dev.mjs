import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPublicConfig } from './public-config.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const storefrontDirectory = path.resolve(scriptDirectory, '..');
const configUrl = new URL('../config/public-env.json', import.meta.url);
const config = await loadPublicConfig(configUrl, 'preview', process.env);
const astroExecutable = path.join(
  storefrontDirectory,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'astro.cmd' : 'astro',
);
const result = spawnSync(astroExecutable, ['dev'], {
  cwd: storefrontDirectory,
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    PUBLIC_DEPLOY_ENV: 'preview',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
    PUBLIC_SUPABASE_URL: config.supabaseUrl,
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
