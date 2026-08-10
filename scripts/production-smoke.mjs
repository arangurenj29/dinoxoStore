import { pathToFileURL } from 'node:url';

const PRODUCTION_ORIGIN = 'https://dinoxostore.com';
const ROOT_URL = `${PRODUCTION_ORIGIN}/`;
const ADMIN_URL = `${PRODUCTION_ORIGIN}/admin`;

function requireHeader(response, name, predicate, expectation) {
  const value = response.headers.get(name);

  if (!value || !predicate(value)) {
    throw new Error(`${response.url} must return ${expectation}`);
  }
}

function hasPositiveHstsMaxAge(value) {
  const maxAgeDirective = value
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => /^max-age\s*=/i.test(directive));
  const match = maxAgeDirective?.match(/^max-age\s*=\s*(\d+)$/i);

  return Boolean(match && BigInt(match[1]) > 0n);
}

async function verifyResponse(response, { admin = false } = {}) {
  if (!response.ok || response.status !== 200) {
    throw new Error(`${response.url} returned HTTP ${response.status}`);
  }

  const finalUrl = new URL(response.url);
  if (
    finalUrl.protocol !== 'https:' ||
    finalUrl.hostname !== 'dinoxostore.com'
  ) {
    throw new Error(
      `${response.url} did not resolve to the production HTTPS host`,
    );
  }

  const expectedPaths = admin ? ['/admin', '/admin/'] : ['/'];
  if (!expectedPaths.includes(finalUrl.pathname)) {
    throw new Error(
      admin
        ? `${response.url} must resolve to the /admin path`
        : `${response.url} must resolve to the root path /`,
    );
  }

  requireHeader(
    response,
    'strict-transport-security',
    hasPositiveHstsMaxAge,
    'HSTS with a positive integer max-age',
  );
  requireHeader(
    response,
    'content-security-policy',
    (value) => /(?:^|;)\s*default-src\s+'self'(?:\s|;|$)/i.test(value),
    "a CSP whose default-src is 'self'",
  );
  requireHeader(
    response,
    'x-content-type-options',
    (value) => value.trim().toLowerCase() === 'nosniff',
    'X-Content-Type-Options: nosniff',
  );

  if (admin) {
    const body = await response.text();
    const noindex =
      /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["'][^>]*>/i.test(
        body,
      ) ||
      /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["'][^>]*>/i.test(
        body,
      );

    if (!noindex) {
      throw new Error(`${response.url} must expose a robots noindex directive`);
    }
  }
}

export async function runProductionSmoke({
  attempts = 6,
  delayMs = 10_000,
  fetchImpl = globalThis.fetch,
  sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const requestOptions = {
        headers: { 'user-agent': 'dinoxo-production-smoke/1.0' },
        redirect: 'follow',
      };
      const root = await fetchImpl(ROOT_URL, requestOptions);
      await verifyResponse(root);

      const admin = await fetchImpl(ADMIN_URL, requestOptions);
      await verifyResponse(admin, { admin: true });

      return { attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error(
    `Production smoke failed after ${attempts} attempts: ${lastError?.message ?? 'unknown error'}`,
    { cause: lastError },
  );
}

const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const result = await runProductionSmoke();
  console.log(`Production smoke passed on attempt ${result.attempt}`);
}
