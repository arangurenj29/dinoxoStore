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

  assert.match(html, /<html lang="es" data-theme="dark">/);
  assert.match(html, /<main[\s>]/);
  assert.match(html, /<h1[^>]*>Tu recarga,<br>r[áa]pida y segura<\/h1>/);
  assert.match(
    html,
    new RegExp(
      `<meta name="robots" content="${isPreview ? 'noindex, nofollow' : 'index, follow'}">`,
    ),
  );
  assertNoExecutableClientScript(html);
});

test('el primer viewport conserva la marca raster y ofrece una conversión por WhatsApp', async () => {
  const html = await readArtifact('index.html');

  assert.match(html, /<header[^>]*class="site-header"/);
  assert.match(
    html,
    /<main[^>]*>\s*<section[^>]*id="inicio"[^>]*class="hero"/s,
  );
  assert.match(html, /<h1[^>]*>Tu recarga,<br>r[áa]pida y segura<\/h1>/);
  assert.match(
    html,
    /<img[^>]*src="\/brand\/dinoxostore-logo-isolated-v1-640\.webp"[^>]*alt="Dinoxo Store"/,
  );
  assert.match(html, /href="https:\/\/wa\.me\/584241140038\?text=/);
  assert.match(html, /href="#inicio"/);
  assert.doesNotMatch(html, /<svg[^>]*aria-label="Dinoxo Store"/i);
});

test('el recorrido comercial usa contenido demo tipado y CTAs contextuales sin JavaScript', async () => {
  const html = await readArtifact('index.html');

  for (const sectionId of [
    'prueba',
    'como-funciona',
    'productos',
    'confianza',
    'preguntas',
    'contacto',
  ]) {
    assert.match(html, new RegExp(`<section[^>]*id="${sectionId}"`));
  }

  assert.equal((html.match(/class="catalog-card"/g) ?? []).length, 3);
  assert.equal((html.match(/Producto de demostración/g) ?? []).length, 3);
  assert.equal((html.match(/USD 10/g) ?? []).length, 3);
  assert.match(html, /href="https:\/\/wa\.me\/584241140038\?text=/);
  assert.match(html, /https:\/\/www\.instagram\.com\/dinoxo\.store/);
  assert.match(html, /https:\/\/www\.tiktok\.com\/@dinoxo\.store/);
  assertNoExecutableClientScript(html);
});

test('404 es estática, noindex y no declara un canonical engañoso', async () => {
  const html = await readArtifact('404.html');

  assert.match(html, /<h1[^>]*>Página no encontrada<\/h1>/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /<link rel="canonical"/i);
  assert.match(html, /<a href="\/">Volver al inicio<\/a>/);
  assert.match(html, /<main class="not-found-page">/);
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
  } else {
    assert.doesNotMatch(headers, /X-Robots-Tag/i);
    assert.match(html, /content="index, follow"/);
  }

  assert.match(headers, /Content-Security-Policy: default-src 'self'/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
});
