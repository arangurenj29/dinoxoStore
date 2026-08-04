import type { DeployEnvironment } from './site-metadata';

const securityHeaders = [
  "  Content-Security-Policy: default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; upgrade-insecure-requests",
  '  Cross-Origin-Opener-Policy: same-origin',
  '  Cross-Origin-Resource-Policy: same-origin',
  '  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
  '  X-Content-Type-Options: nosniff',
  '  X-Frame-Options: DENY',
];

export function renderDeployHeaders(
  deployEnvironment: DeployEnvironment,
): string {
  const robotsHeader =
    deployEnvironment === 'preview'
      ? ['  X-Robots-Tag: noindex, nofollow']
      : [];

  return ['/*', ...robotsHeader, ...securityHeaders, ''].join('\n');
}
