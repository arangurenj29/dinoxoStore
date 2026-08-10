import type { DeployEnvironment } from './site-metadata';

const staticSecurityHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const;

export function resolveDeployHeaders(
  deployEnvironment: DeployEnvironment,
  supabaseUrl: string,
): Record<string, string> {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' || url.origin !== supabaseUrl) {
    throw new Error('Supabase URL must be an exact HTTPS origin for CSP.');
  }

  const websocketOrigin = `wss://${url.host}`;
  const headers: Record<string, string> = {};

  if (deployEnvironment === 'preview') {
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }

  Object.assign(headers, {
    'Content-Security-Policy': `default-src 'self'; base-uri 'self'; connect-src 'self' ${url.origin} ${websocketOrigin}; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' blob: data: ${url.origin}; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; upgrade-insecure-requests`,
    ...staticSecurityHeaders,
  });

  return headers;
}

export function renderDeployHeaders(
  deployEnvironment: DeployEnvironment,
  supabaseUrl: string,
): string {
  const headers = resolveDeployHeaders(deployEnvironment, supabaseUrl);

  return [
    '/*',
    ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`),
    '',
  ].join('\n');
}
