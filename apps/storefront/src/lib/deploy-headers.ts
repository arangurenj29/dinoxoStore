import type { DeployEnvironment } from './site-metadata';

export function renderDeployHeaders(
  deployEnvironment: DeployEnvironment,
): string {
  if (deployEnvironment === 'preview') {
    return '/*\n  X-Robots-Tag: noindex, nofollow\n';
  }

  return '# Producción indexable: no se define un bloqueo global de robots.\n';
}
