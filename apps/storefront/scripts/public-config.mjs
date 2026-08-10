import { readFile } from 'node:fs/promises';

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing ${label} in explicit public configuration.`);
  }
  return value.trim();
}

export function supabaseOrigin(rawUrl) {
  const value = requireString(rawUrl, 'Supabase URL');
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('Supabase URL must use HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Supabase URL must be a clean HTTPS origin.');
  }
  return url.origin;
}

function validateConfig(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(
      'Missing explicit Supabase public environment configuration.',
    );
  }
  const supabaseUrl = supabaseOrigin(candidate.supabaseUrl);
  const supabasePublishableKey = requireString(
    candidate.supabasePublishableKey,
    'Supabase publishable key',
  );
  if (!supabasePublishableKey.startsWith('sb_publishable_')) {
    throw new Error('Supabase key must be a publishable key.');
  }
  return { supabasePublishableKey, supabaseUrl };
}

export function resolvePublicConfig(deployEnvironment, configured, overrides) {
  const overrideUrl = overrides.PUBLIC_SUPABASE_URL;
  const overrideKey = overrides.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (Boolean(overrideUrl) !== Boolean(overrideKey)) {
    throw new Error(
      'PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY must be supplied together.',
    );
  }
  if (deployEnvironment === 'preview' && !overrideUrl) {
    throw new Error(
      'Preview requires an isolated PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY override.',
    );
  }
  if (overrideUrl && overrideKey) {
    const resolved = validateConfig({
      supabasePublishableKey: overrideKey,
      supabaseUrl: overrideUrl,
    });
    if (deployEnvironment === 'preview') {
      const production = validateConfig(configured.production);
      if (resolved.supabaseUrl === production.supabaseUrl) {
        throw new Error(
          'Preview Supabase must be isolated and cannot use the production origin.',
        );
      }
    }
    return resolved;
  }
  return validateConfig(configured[deployEnvironment]);
}

export async function loadPublicConfig(
  configUrl,
  deployEnvironment,
  overrides,
) {
  const configured = JSON.parse(await readFile(configUrl, 'utf8'));
  return resolvePublicConfig(deployEnvironment, configured, overrides);
}
