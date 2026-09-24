import app from "./worker-entry.js";

const iconTag = '<link rel="icon" href="/assets/favicon-nexauren.png?v=20260924">';
const ogTag = '<meta property="og:image" content="/assets/social-preview-nexauren.png?v=20260924">';
const twitterTag = '<meta name="twitter:image" content="/assets/social-preview-nexauren.png?v=20260924">';
const brandImage = '/assets/nexauren-brand.png?v=20260924';

export default {
  async fetch(request, env, ctx) {
    const response = await app.fetch(request, env, ctx);
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.toLowerCase().includes("text/html")) return response;

    const path = new URL(request.url).pathname.toLowerCase();
    if (path === "/blog" || path.startsWith("/blog/") || path === "/articles" || path.startsWith("/articles/") || path === "/admin" || path.startsWith("/admin/")) return response;

    let html = await response.text();
    html = html.replace(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/gi, iconTag);
    html = html.replace(/<meta[^>]*property=["']og:image["'][^>]*>/gi, ogTag);
    html = html.replace(/<meta[^>]*name=["']twitter:image["'][^>]*>/gi, twitterTag);
    html = html.replace(/<img([^>]*?)src=["']\/nexauren-story-favicon\.(?:svg|png|ico)(?:\?[^"']*)?["']([^>]*)>/gi, '<img$1src="' + brandImage + '"$2>');
    html = html.replace(/<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gi, '<link rel="apple-touch-icon" href="' + brandImage + '">');

    if (!/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/i.test(html)) html = html.replace(/<\/head>/i, iconTag + "\n</head>");
    if (!/<meta[^>]*property=["']og:image["'][^>]*>/i.test(html)) html = html.replace(/<\/head>/i, ogTag + "\n</head>");
    if (!/<meta[^>]*name=["']twitter:image["'][^>]*>/i.test(html)) html = html.replace(/<\/head>/i, twitterTag + "\n</head>");

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  },
  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === "function") return app.scheduled(controller, env, ctx);
  }
};
