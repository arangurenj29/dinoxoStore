import assert from 'node:assert/strict';
import test from 'node:test';

import { runProductionSmoke } from '../scripts/production-smoke.mjs';

function response(url, body, headers = {}, status = 200) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    headers: {
      get: (name) => normalizedHeaders.get(name.toLowerCase()) ?? null,
    },
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    url,
  };
}

const secureHeaders = {
  'content-security-policy': "default-src 'self'; object-src 'none'",
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
};

test('production smoke retries propagation then verifies root and admin', async () => {
  const calls = [];
  const waits = [];
  let failedOnce = false;
  const fetchImpl = async (url) => {
    calls.push(url);
    if (!failedOnce) {
      failedOnce = true;
      throw new Error('edge still propagating');
    }
    return url.endsWith('/admin')
      ? response(
          url,
          '<meta name="robots" content="noindex, nofollow">',
          secureHeaders,
        )
      : response(url, '<main>Dinoxo Store</main>', secureHeaders);
  };

  const result = await runProductionSmoke({
    attempts: 3,
    delayMs: 25,
    fetchImpl,
    sleep: async (delay) => waits.push(delay),
  });

  assert.equal(result.attempt, 2);
  assert.deepEqual(waits, [25]);
  assert.deepEqual(calls, [
    'https://dinoxostore.com/',
    'https://dinoxostore.com/',
    'https://dinoxostore.com/admin',
  ]);
});

test('production smoke fails when admin is indexable or security headers are absent', async () => {
  await assert.rejects(
    runProductionSmoke({
      attempts: 1,
      fetchImpl: async (url) =>
        response(url, '<meta name="robots" content="index, follow">', {
          'strict-transport-security': 'max-age=31536000',
          'x-content-type-options': 'nosniff',
        }),
      sleep: async () => undefined,
    }),
    /CSP|noindex/,
  );
});

test('WRONG_ROOT_REDIRECT_ACCEPTED: root must not resolve to the admin route', async () => {
  await assert.rejects(
    runProductionSmoke({
      attempts: 1,
      fetchImpl: async () =>
        response(
          'https://dinoxostore.com/admin',
          '<meta name="robots" content="noindex, nofollow">',
          secureHeaders,
        ),
      sleep: async () => undefined,
    }),
    /root path|pathname|must resolve to \/$/i,
  );
});

test('MAX_AGE_ZERO_ACCEPTED: HSTS max-age must be a positive integer', async () => {
  await assert.rejects(
    runProductionSmoke({
      attempts: 1,
      fetchImpl: async (url) =>
        response(
          url,
          url.endsWith('/admin')
            ? '<meta name="robots" content="noindex, nofollow">'
            : '<main>Dinoxo Store</main>',
          {
            ...secureHeaders,
            'strict-transport-security': 'max-age=0; includeSubDomains',
          },
        ),
      sleep: async () => undefined,
    }),
    /HSTS|max-age/i,
  );
});
