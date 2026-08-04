import assert from 'node:assert/strict';
import test from 'node:test';

import storefrontWorker from '../src/worker.ts';

test('redirige HTTP a HTTPS antes de servir cualquier recurso', async () => {
  const response = await storefrontWorker.fetch(
    new Request('http://dinoxostore.com/productos?origen=prueba'),
    {
      ASSETS: {
        fetch: async () => new Response('no debe servirse por HTTP'),
      },
    },
  );

  assert.equal(response.status, 308);
  assert.equal(
    response.headers.get('location'),
    'https://dinoxostore.com/productos?origen=prueba',
  );
});

test('sirve el recurso estático cuando la petición ya usa HTTPS', async () => {
  let receivedRequest;
  const request = new Request('https://dinoxostore.com/');

  const response = await storefrontWorker.fetch(request, {
    ASSETS: {
      fetch: async (assetRequest) => {
        receivedRequest = assetRequest;
        return new Response('activo');
      },
    },
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'activo');
  assert.equal(receivedRequest, request);
});
