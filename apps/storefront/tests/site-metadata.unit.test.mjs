import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolvePageMetadata,
  resolveSiteMetadata,
} from '../src/lib/site-metadata.ts';

test('producción permite indexación y usa el dominio canónico', () => {
  const metadata = resolveSiteMetadata('production');

  assert.equal(metadata.robots, 'index, follow');
  assert.equal(metadata.canonicalUrl, 'https://dinoxostore.com/');
  assert.equal(metadata.title, 'Dinoxo Store');
});

test('preview bloquea indexación sin cambiar el dominio canónico', () => {
  const metadata = resolveSiteMetadata('preview');

  assert.equal(metadata.robots, 'noindex, nofollow');
  assert.equal(metadata.canonicalUrl, 'https://dinoxostore.com/');
  assert.equal(metadata.title, 'Dinoxo Store');
});

test('la página 404 siempre bloquea indexación y omite canonical', () => {
  const metadata = resolvePageMetadata('production', 'not-found');

  assert.equal(metadata.robots, 'noindex, nofollow');
  assert.equal(metadata.canonicalUrl, undefined);
});

test('la página 404 conserva el bloqueo también en preview', () => {
  const metadata = resolvePageMetadata('preview', 'not-found');

  assert.equal(metadata.robots, 'noindex, nofollow');
  assert.equal(metadata.canonicalUrl, undefined);
});
