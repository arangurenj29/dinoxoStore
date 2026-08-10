import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolvePublicConfig,
  supabaseOrigin,
} from '../apps/storefront/scripts/public-config.mjs';
import { renderDeployHeaders } from '../apps/storefront/src/lib/deploy-headers.ts';

const configured = {
  production: {
    supabasePublishableKey: 'sb_publishable_production-test',
    supabaseUrl: 'https://production-ref.supabase.co',
  },
};

test('public config resolves an explicit environment without hidden defaults', () => {
  assert.deepEqual(resolvePublicConfig('production', configured, {}), {
    supabasePublishableKey: 'sb_publishable_production-test',
    supabaseUrl: 'https://production-ref.supabase.co',
  });
  assert.equal(
    supabaseOrigin('https://production-ref.supabase.co/rest/v1'),
    'https://production-ref.supabase.co',
  );
});

test('public config rejects missing, partial and unsafe overrides', () => {
  assert.throws(() => resolvePublicConfig('production', {}, {}), /missing/i);
  assert.throws(
    () =>
      resolvePublicConfig('production', configured, {
        PUBLIC_SUPABASE_URL: 'https://override.supabase.co',
      }),
    /together/i,
  );
  assert.throws(
    () =>
      resolvePublicConfig('production', configured, {
        PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        PUBLIC_SUPABASE_URL: 'http://unsafe.example.com',
      }),
    /https/i,
  );
});

test('preview fails closed without an isolated override and can never resolve production', () => {
  assert.throws(
    () => resolvePublicConfig('preview', configured, {}),
    /preview.*override/i,
  );
  assert.throws(
    () =>
      resolvePublicConfig('preview', configured, {
        PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          configured.production.supabasePublishableKey,
        PUBLIC_SUPABASE_URL: configured.production.supabaseUrl,
      }),
    /isolated/i,
  );
  assert.deepEqual(
    resolvePublicConfig('preview', configured, {
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_preview-ci-fixture',
      PUBLIC_SUPABASE_URL: 'https://preview-ci.invalid',
    }),
    {
      supabasePublishableKey: 'sb_publishable_preview-ci-fixture',
      supabaseUrl: 'https://preview-ci.invalid',
    },
  );
});

test('CSP allows only the configured Supabase HTTP and WebSocket origins', () => {
  const headers = renderDeployHeaders(
    'production',
    'https://production-ref.supabase.co',
  );

  assert.match(
    headers,
    /connect-src 'self' https:\/\/production-ref\.supabase\.co wss:\/\/production-ref\.supabase\.co/,
  );
  assert.match(
    headers,
    /img-src 'self' blob: data: https:\/\/production-ref\.supabase\.co/,
  );
  assert.doesNotMatch(headers, /yvbrvclbqmvxxtfehxxp/);
  assert.doesNotMatch(headers, /https:\/\/\*/);
});
