// Serve the self-contained studio only at the requested path. Other routes on
// nekokaii.com continue to use their existing origin and Workers configuration.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const publicPath = url.pathname === '/showcase-generator' || url.pathname === '/showcase-generator/';
    const previewRoot = url.hostname.endsWith('.workers.dev') && url.pathname === '/';
    if (!publicPath && !previewRoot) return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    // Asset hosting canonicalizes /index.html to /. Request / internally so
    // that redirect never escapes the public /showcase-generator mount.
    url.pathname = '/';
    const asset = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(asset.headers);
    headers.set('Cache-Control', 'no-cache');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(asset.body, { status: asset.status, headers });
  }
};
