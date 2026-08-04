import assert from 'node:assert/strict';
import test from 'node:test';

import { renderDeployHeaders } from '../src/lib/deploy-headers.ts';

test('preview envía X-Robots-Tag noindex para todas las rutas', () => {
  const headers = renderDeployHeaders('preview');

  assert.match(headers, /\/\*\s*\n\s+X-Robots-Tag: noindex, nofollow/);
  assert.match(headers, /Content-Security-Policy: default-src 'self'/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
  assert.match(headers, /X-Frame-Options: DENY/);
});

test('producción es indexable y mantiene los encabezados de seguridad', () => {
  const headers = renderDeployHeaders('production');

  assert.doesNotMatch(headers, /X-Robots-Tag/i);
  assert.match(headers, /Content-Security-Policy: default-src 'self'/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
  assert.match(headers, /Permissions-Policy: /);
  assert.match(headers, /Cross-Origin-Opener-Policy: same-origin/);
  assert.match(headers, /Cross-Origin-Resource-Policy: same-origin/);
});
