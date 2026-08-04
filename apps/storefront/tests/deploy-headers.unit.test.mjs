import assert from 'node:assert/strict';
import test from 'node:test';

import { renderDeployHeaders } from '../src/lib/deploy-headers.ts';

test('preview envía X-Robots-Tag noindex para todas las rutas', () => {
  const headers = renderDeployHeaders('preview');

  assert.match(headers, /\/\*\s*\n\s+X-Robots-Tag: noindex, nofollow/);
});

test('producción no envía un X-Robots-Tag global', () => {
  const headers = renderDeployHeaders('production');

  assert.doesNotMatch(headers, /X-Robots-Tag/i);
  assert.match(headers, /producción indexable/i);
});
