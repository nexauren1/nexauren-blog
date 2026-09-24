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

    return response;
  },
  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === "function") return app.scheduled(controller, env, ctx);
  }
};
