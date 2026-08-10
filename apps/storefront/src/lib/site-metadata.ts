export type DeployEnvironment = 'preview' | 'production';

export interface SiteMetadata {
  canonicalUrl: string;
  description: string;
  robots: 'index, follow' | 'noindex, nofollow';
  title: string;
}

export interface PageMetadata extends Omit<SiteMetadata, 'canonicalUrl'> {
  canonicalUrl: string | undefined;
}

export type PageKind = 'admin' | 'default' | 'not-found';

const CANONICAL_URL = 'https://dinoxostore.com/';

export function resolveSiteMetadata(
  deployEnvironment: DeployEnvironment | undefined,
): SiteMetadata {
  const isProduction = deployEnvironment === 'production';

  return {
    canonicalUrl: CANONICAL_URL,
    description:
      'Compra contenido digital gamer con información clara y atención directa.',
    robots: isProduction ? 'index, follow' : 'noindex, nofollow',
    title: 'Dinoxo Store',
  };
}

export function resolvePageMetadata(
  deployEnvironment: DeployEnvironment | undefined,
  pageKind: PageKind = 'default',
): PageMetadata {
  const metadata = resolveSiteMetadata(deployEnvironment);

  if (pageKind === 'not-found' || pageKind === 'admin') {
    return {
      ...metadata,
      canonicalUrl: undefined,
      robots: 'noindex, nofollow',
    };
  }

  return metadata;
}
