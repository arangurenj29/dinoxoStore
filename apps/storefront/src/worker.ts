interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
}

function toHttpsUrl(url: URL): string {
  url.protocol = 'https:';
  return url.toString();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.protocol !== 'https:') {
      return Response.redirect(toHttpsUrl(url), 308);
    }

    return env.ASSETS.fetch(request);
  },
};
