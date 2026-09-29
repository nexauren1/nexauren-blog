import app from "./worker-entry.js";

const ICON = '<link rel="icon" type="image/png" href="/assets/favicon-nexauren.png?v=20260925-brand">';
const OG = '<meta property="og:image" content="https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2">';
const OG_SECURE = '<meta property="og:image:secure_url" content="https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2">';
const OG_WIDTH = '<meta property="og:image:width" content="1200">';
const OG_HEIGHT = '<meta property="og:image:height" content="630">';
const OG_TYPE = '<meta property="og:image:type" content="image/png">';
const TW = '<meta name="twitter:image" content="https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2">';
const FOOTER_SCRIPT = '<script src="/assets/nexauren-footer.js?v=20260928-4" defer></script>';
const ANALYTICS_SCRIPT = '<script src="/assets/analytics.js?v=20260929-1" defer></script>';

function upsert(html, regex, tag) {
  return regex.test(html)
    ? html.replace(regex, tag)
    : html.replace(/<\/head>/i, tag + "\n</head>");
}

export default {
  async fetch(request, env, ctx) {
    const response = await app.fetch(request, env, ctx);
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.toLowerCase().includes("text/html")) return response;

    const path = new URL(request.url).pathname.toLowerCase();

    // Analytics is intentionally excluded from private/auth surfaces.
    if (
      path === "/admin" || path.startsWith("/admin/") ||
      path === "/account" || path.startsWith("/account/") ||
      path.startsWith("/__/auth/")
    ) {
      return response;
    }

    let html = await response.text();

    html = html.replace(/<link[^>]+href=["'][^"']*nexauren-story-favicon\.svg(?:\?[^"']*)?["'][^>]*>/gi, "");

    // Remove the old homepage-only Google tag. Analytics is now injected centrally.
    html = html.replace(
      /<!-- Nexauren Story — Google tag \(public pages only\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/i,
      ""
    );

    html = upsert(html, /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*>/i, ICON);
    html = upsert(html, /<meta[^>]+property=["']og:image["'][^>]*>/i, OG);
    html = upsert(html, /<meta[^>]+property=["']og:image:secure_url["'][^>]*>/i, OG_SECURE);
    html = upsert(html, /<meta[^>]+property=["']og:image:width["'][^>]*>/i, OG_WIDTH);
    html = upsert(html, /<meta[^>]+property=["']og:image:height["'][^>]*>/i, OG_HEIGHT);
    html = upsert(html, /<meta[^>]+property=["']og:image:type["'][^>]*>/i, OG_TYPE);
    html = upsert(html, /<meta[^>]+name=["']twitter:image["'][^>]*>/i, TW);
    html = upsert(html, /<script[^>]+src=["'][^"']*nexauren-footer\.js(?:\?[^"']*)?["'][^>]*><\/script>/i, FOOTER_SCRIPT);
    html = upsert(html, /<script[^>]+src=["'][^"']*\/assets\/analytics\.js(?:\?[^"']*)?["'][^>]*><\/script>/i, ANALYTICS_SCRIPT);

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "public, max-age=300, must-revalidate");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  },

  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === "function") {
      return app.scheduled(controller, env, ctx);
    }
  }
};
