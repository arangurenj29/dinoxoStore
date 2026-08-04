import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const storefrontDirectory = path.resolve(testDirectory, '..');
const distributionDirectory = path.join(storefrontDirectory, 'dist');
const expectedDeployEnvironment = process.env.EXPECTED_DEPLOY_ENV;

if (
  expectedDeployEnvironment !== 'preview' &&
  expectedDeployEnvironment !== 'production'
) {
  throw new Error(
    'EXPECTED_DEPLOY_ENV must be explicitly set to preview or production.',
  );
}

async function readArtifact(relativePath) {
  return readFile(path.join(distributionDirectory, relativePath), 'utf8');
}

function assertNoExecutableClientScript(html) {
  assert.doesNotMatch(
    html,
    /<script\b(?![^>]*\btype=["']application\/ld\+json["'])/i,
  );
  assert.doesNotMatch(
    html,
    /<astro-island\b|client:(?:load|idle|visible|media|only)/i,
  );
}

test('la portada estática es semántica y coincide con el entorno desplegado', async () => {
  const html = await readArtifact('index.html');
  const isPreview = expectedDeployEnvironment === 'preview';

  assert.match(html, /<html lang="es">/);
  assert.match(html, /<main[\s>]/);
  assert.match(html, /<h1[^>]*>[^<]*Dinoxo Store[^<]*<\/h1>/);
  assert.match(
    html,
    new RegExp(
      `<meta name="robots" content="${isPreview ? 'noindex, nofollow' : 'index, follow'}">`,
    ),
  );
  assertNoExecutableClientScript(html);
});

test('404 es estática, noindex y no declara un canonical engañoso', async () => {
  const html = await readArtifact('404.html');

  assert.match(html, /<h1[^>]*>Página no encontrada<\/h1>/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /<link rel="canonical"/i);
  assert.match(html, /<a href="\/">Volver al inicio<\/a>/);
  assertNoExecutableClientScript(html);
});

test('el artefacto de headers coincide con el entorno esperado', async () => {
  const [html, headers] = await Promise.all([
    readArtifact('index.html'),
    readArtifact('_headers'),
  ]);

  if (expectedDeployEnvironment === 'preview') {
    assert.match(headers, /X-Robots-Tag: noindex, nofollow/i);
    assert.match(html, /content="noindex, nofollow"/);
    return;
  }

  assert.doesNotMatch(headers, /X-Robots-Tag/i);
  assert.match(headers, /producción indexable/i);
  assert.match(html, /content="index, follow"/);
});
