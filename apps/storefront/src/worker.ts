import { resolveDeployHeaders } from './lib/deploy-headers.ts';

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_URL: string;
}

const catalogCacheControl =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

interface PublicCatalogVariant {
  currency: string;
  denomination: string | null;
  id: string;
  name: string;
  platform: string | null;
  price_minor: number | null;
  region: string | null;
}

interface PublicCatalogMedia {
  alt_text: string | null;
  height: number | null;
  id: string;
  mime_type: string;
  position: number;
  storage_path: string;
  width: number | null;
}

interface PublicCatalogProduct {
  description: string | null;
  id: string;
  media: PublicCatalogMedia[];
  name: string;
  slug: string;
  variants: PublicCatalogVariant[];
}

function catalogResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': catalogCacheControl,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePublicCatalog(rows: unknown): PublicCatalogProduct[] {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row): PublicCatalogProduct[] => {
    if (!row || typeof row !== 'object') return [];
    const record = row as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      typeof record.slug !== 'string' ||
      typeof record.name !== 'string'
    ) {
      return [];
    }

    const variants = Array.isArray(record.product_variants)
      ? record.product_variants.flatMap((variant): PublicCatalogVariant[] => {
          if (!variant || typeof variant !== 'object') return [];
          const item = variant as Record<string, unknown>;
          if (
            typeof item.id !== 'string' ||
            typeof item.name !== 'string' ||
            typeof item.currency !== 'string'
          ) {
            return [];
          }
          return [
            {
              currency: item.currency,
              denomination: asNullableString(item.denomination),
              id: item.id,
              name: item.name,
              platform: asNullableString(item.platform),
              price_minor: asNullableNumber(item.price_minor),
              region: asNullableString(item.region),
            },
          ];
        })
      : [];
    const media = Array.isArray(record.product_media)
      ? record.product_media.flatMap((mediaItem): PublicCatalogMedia[] => {
          if (!mediaItem || typeof mediaItem !== 'object') return [];
          const item = mediaItem as Record<string, unknown>;
          if (
            typeof item.id !== 'string' ||
            typeof item.storage_path !== 'string' ||
            typeof item.mime_type !== 'string'
          ) {
            return [];
          }
          return [
            {
              alt_text: asNullableString(item.alt_text),
              height: asNullableNumber(item.height),
              id: item.id,
              mime_type: item.mime_type,
              position:
                typeof item.position === 'number' &&
                Number.isFinite(item.position)
                  ? item.position
                  : 0,
              storage_path: item.storage_path,
              width: asNullableNumber(item.width),
            },
          ];
        })
      : [];

    return [
      {
        description: asNullableString(record.description),
        id: record.id,
        media,
        name: record.name,
        slug: record.slug,
        variants,
      },
    ];
  });
}

export async function fetchPublicCatalog(
  supabaseUrl: string,
  publishableKey: string,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const origin = new URL(supabaseUrl);
  if (origin.protocol !== 'https:' || origin.origin !== supabaseUrl) {
    throw new Error('Supabase URL must be an exact HTTPS origin.');
  }

  const endpoint = new URL(`${origin.origin}/rest/v1/products`);
  endpoint.searchParams.set(
    'select',
    'id,slug,name,description,product_variants(id,name,platform,region,denomination,price_minor,currency),product_media(id,storage_path,alt_text,position,mime_type,width,height)',
  );
  endpoint.searchParams.set('status', 'eq.published');
  endpoint.searchParams.set('archived_at', 'is.null');
  endpoint.searchParams.set('order', 'updated_at.desc');

  let upstream: Response;
  try {
    upstream = await fetcher(endpoint, {
      headers: { Accept: 'application/json', apikey: publishableKey },
    });
  } catch {
    return catalogResponse({ products: [], error: 'catalog_unavailable' }, 502);
  }
  if (!upstream.ok)
    return catalogResponse({ products: [], error: 'catalog_unavailable' }, 502);

  let rows: unknown;
  try {
    rows = await upstream.json();
  } catch {
    return catalogResponse({ products: [], error: 'catalog_unavailable' }, 502);
  }

  return catalogResponse({ products: normalizePublicCatalog(rows) });
}

function toHttpsUrl(url: URL): string {
  url.protocol = 'https:';
  return url.toString();
}

export function applySecurityHeaders(
  response: Response,
  supabaseUrl: string,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(
    resolveDeployHeaders('production', supabaseUrl),
  )) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.protocol !== 'https:') {
      return Response.redirect(toHttpsUrl(url), 308);
    }

    if (url.pathname === '/api/catalog') {
      if (request.method !== 'GET') {
        return applySecurityHeaders(
          new Response('Method Not Allowed', {
            status: 405,
            headers: { Allow: 'GET' },
          }),
          env.SUPABASE_URL,
        );
      }

      return applySecurityHeaders(
        await fetchPublicCatalog(
          env.SUPABASE_URL,
          env.SUPABASE_PUBLISHABLE_KEY,
        ),
        env.SUPABASE_URL,
      );
    }

    return applySecurityHeaders(
      await env.ASSETS.fetch(request),
      env.SUPABASE_URL,
    );
  },
};
