import assert from 'node:assert/strict';
import test from 'node:test';

import { applySecurityHeaders, fetchPublicCatalog } from '../src/worker.ts';

test('the Worker includes the Supabase origin in the production CSP', () => {
  const response = applySecurityHeaders(
    new Response('ok', { headers: { 'Content-Type': 'text/plain' } }),
    'https://yvbrvclbqmvxxtfehxxp.supabase.co',
  );

  const contentSecurityPolicy = response.headers.get('Content-Security-Policy');

  assert.match(
    contentSecurityPolicy ?? '',
    /connect-src 'self' https:\/\/yvbrvclbqmvxxtfehxxp\.supabase\.co wss:\/\/yvbrvclbqmvxxtfehxxp\.supabase\.co/,
  );
  assert.match(
    contentSecurityPolicy ?? '',
    /img-src 'self' blob: data: https:\/\/yvbrvclbqmvxxtfehxxp\.supabase\.co/,
  );
});

test('the public catalog contract reads only published products through Supabase REST', async () => {
  const requests = [];
  const response = await fetchPublicCatalog(
    'https://yvbrvclbqmvxxtfehxxp.supabase.co',
    'sb_publishable_test',
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return new Response(
        JSON.stringify([
          {
            id: 'product-1',
            slug: 'steam-wallet',
            name: 'Steam Wallet',
            description: 'Saldo digital',
            product_variants: [
              {
                id: 'variant-1',
                name: 'USD 10',
                platform: 'Steam',
                region: 'Global',
                denomination: 'USD 10',
                price_minor: 1000,
                currency: 'USD',
              },
            ],
            product_media: [],
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control') ?? '', /s-maxage=60/);
  assert.deepEqual(await response.json(), {
    products: [
      {
        id: 'product-1',
        slug: 'steam-wallet',
        name: 'Steam Wallet',
        description: 'Saldo digital',
        variants: [
          {
            id: 'variant-1',
            name: 'USD 10',
            platform: 'Steam',
            region: 'Global',
            denomination: 'USD 10',
            price_minor: 1000,
            currency: 'USD',
          },
        ],
        media: [],
      },
    ],
  });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /status=eq\.published/);
  assert.match(requests[0].url, /archived_at=is\.null/);
  assert.equal(requests[0].init.headers.apikey, 'sb_publishable_test');
});
