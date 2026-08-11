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

function assertNoExecutableClientScript(html, allowCatalogModule = false) {
  const executableScripts = [
    ...html.matchAll(/<script\b[^>]*>(?:[\s\S]*?)<\/script>/gi),
  ].map(([script]) => script);
  if (allowCatalogModule) {
    for (const script of executableScripts) {
      if (/application\/ld\+json/i.test(script)) continue;
      assert.match(script, /type=["']module["']/i);
      assert.match(script, /catalog-client|\/api\/catalog/i);
    }
  } else {
    assert.equal(executableScripts.length, 0);
  }
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
  assert.match(
    html,
    /<script[^>]*src="\/catalog-client\.js"[^>]*type="module"/i,
  );
  assert.match(html, /href="\/juegos\/"/);
  assertNoExecutableClientScript(html, true);
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
  assert.match(
    html,
    /<span[^>]*class="icon icon--whatsapp-contact"[^>]*aria-hidden="true"/,
  );
  assert.match(html, /href="https:\/\/wa\.me\/584268158785\?text=/);
  assert.match(
    html,
    /<a[^>]*class="site-wordmark"[^>]*href="#inicio"[^>]*>[\s\S]*dinoxo\.store[\s\S]*<\/a>/,
  );
  assert.match(html, /class="site-wordmark__logo"/);
  assert.match(html, /aria-label="Instagram"/);
  assert.match(html, /aria-label="TikTok"/);
  assert.match(html, /aria-label="Linktree"/);
  assert.doesNotMatch(html, /<svg[^>]*aria-label="Dinoxo Store"/i);
});

test('el recorrido comercial conecta el catálogo publicado y sus CTAs', async () => {
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

  assert.equal((html.match(/class="catalog-card"/g) ?? []).length, 0);
  assert.match(html, /data-catalog-grid/);
  assert.match(html, /Cargando catálogo/);
  assert.doesNotMatch(html, /Ejemplo de catálogo|Plataforma demo|USD 10/);
  assert.match(html, /catalog-client|\/api\/catalog/i);
  assert.match(html, /https:\/\/www\.instagram\.com\/dinoxo\.store/);
  assert.match(html, /https:\/\/www\.tiktok\.com\/@dinoxo\.store/);
  assert.equal((html.match(/class="step-mascot /g) ?? []).length, 3);
  assert.match(html, /src="\/brand\/mascot\/nox-step-choose-v1\.png"/);
  assert.match(html, /src="\/brand\/mascot\/nox-step-confirm-v1\.png"/);
  assert.match(html, /src="\/brand\/mascot\/nox-step-receive-v1\.png"/);
  assertNoExecutableClientScript(html, true);
});

test('Dino Rush es público, jugable y no solicita información personal', async () => {
  const html = await readArtifact('juegos/dino-rush/index.html');

  assert.match(html, /<title>Dino Rush \| Dinoxo Store<\/title>/);
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/dinoxostore\.com\/juegos\/dino-rush\/">/,
  );
  assert.match(html, /data-dino-rush/);
  assert.match(html, /data-game-arena/);
  assert.match(html, /data-game-start/);
  assert.match(html, /src="\/dino-rush\.js" type="module"/);
  assert.match(html, /No solicitamos ni almacenamos datos personales\./);
  assert.doesNotMatch(html, /<form[\s>]/i);
  assert.doesNotMatch(html, /<input[\s>]/i);
  assert.doesNotMatch(html, /\/api\/(?:games|leads)/i);
});

test('el Arcade Dinoxo permite elegir juegos públicos sin capturar datos', async () => {
  const html = await readArtifact('juegos/index.html');

  assert.match(html, /<title>Arcade Dinoxo \| Dinoxo Store<\/title>/);
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/dinoxostore\.com\/juegos\/">/,
  );
  assert.match(html, /href="\/juegos\/dino-rush\/"/);
  assert.match(html, /href="\/juegos\/nox-runner\/"/);
  assert.match(html, /src="\/brand\/mascot\/nox-runner-v1\.png"/);
  assert.match(html, /No pedimos ni almacenamos tus datos\./);
  assert.doesNotMatch(html, /<form[\s>]/i);
  assert.doesNotMatch(html, /<input[\s>]/i);
  assertNoExecutableClientScript(html);
});

test('Nox Runner es público, jugable y no solicita información personal', async () => {
  const html = await readArtifact('juegos/nox-runner/index.html');

  assert.match(html, /<title>Nox Runner \| Dinoxo Store<\/title>/);
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/dinoxostore\.com\/juegos\/nox-runner\/">/,
  );
  assert.match(html, /data-nox-runner/);
  assert.match(html, /data-runner-arena/);
  assert.match(html, /data-runner-hitbox/);
  assert.match(html, /data-runner-start/);
  assert.match(html, /src="\/nox-runner\.js" type="module"/);
  assert.match(html, /src="\/brand\/mascot\/nox-runner-v1\.png"/);
  assert.match(html, /src="\/brand\/mascot\/nox-runner-stride-v1\.png"/);
  assert.match(html, /src="\/brand\/mascot\/nox-runner-jump-v1\.png"/);
  assert.match(html, /no los almacenamos ni solicitamos datos personales/i);
  assert.doesNotMatch(html, /<form[\s>]/i);
  assert.doesNotMatch(html, /<input[\s>]/i);
  assert.doesNotMatch(html, /\/api\/(?:games|leads)/i);
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

test('el panel /admin se construye como superficie privada y no indexable', async () => {
  const html = await readArtifact('admin/index.html');

  assert.match(html, /<main class="admin-shell">/);
  assert.match(html, /id="admin-login"/);
  assert.match(html, /id="login-password"[^>]+type="password"/);
  assert.match(html, />Iniciar sesión</);
  assert.doesNotMatch(html, /Enviar enlace/);
  assert.match(html, /id="admin-workspace"/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /<link rel="canonical"/i);
  assert.match(html, /<script[^>]+type="module"[^>]+src="\/_astro\//);
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
