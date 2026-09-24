import app from "./worker-entry.js";

const iconTag = '<link rel="icon" href="/assets/favicon-nexauren.png">';
const ogTag = '<meta property="og:image" content="/assets/social-preview-nexauren.png">';
const twitterTag = '<meta name="twitter:image" content="/assets/social-preview-nexauren.png">';

export default {
  async fetch(request, env, ctx) {
    const response = await app.fetch(request, env, ctx);
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.toLowerCase().includes("text/html")) return response;

    const path = new URL(request.url).pathname.toLowerCase();
    if (path === "/blog" || path.startsWith("/blog/") || path === "/articles" || path.startsWith("/articles/") || path === "/admin" || path.startsWith("/admin/")) {
      return response;
    }

    let html = await response.text();

    const oldIcon = '<link rel="icon" href="/nexauren-story-favicon.ico?v=20260922-6"><link rel="icon" type="image/svg+xml" href="/nexauren-story-favicon.svg?v=20260922-6"><link rel="icon" type="image/png" sizes="32x32" href="/nexauren-story-favicon.png?v=20260922-6">';
    html = html.replace(oldIcon, iconTag);

    const oldOg = '<meta property="og:image" content="https://nexaurenstory.com/nexauren-story-social-preview.png?v=20260922-2">';
    html = html.replace(oldOg, ogTag);

    const oldTwitter = '<meta name="twitter:image" content="https://nexaurenstory.com/nexauren-story-social-preview.png?v=20260922-2">';
    html = html.replace(oldTwitter, twitterTag);

    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  },
  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === "function") return app.scheduled(controller, env, ctx);
  }
};
