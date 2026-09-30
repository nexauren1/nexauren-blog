import app from "./worker-entry.js";
import { filebasePutTemp, filebaseGetTemp, filebaseDeleteTemp, filebaseCleanupTemp } from "./filebase.js";

const ICON = '<link rel="icon" type="image/png" href="/assets/favicon-nexauren.png?v=20260925-brand">';
const OG = '<meta property="og:image" content="https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2">';
const OG_SECURE = '<meta property="og:image:secure_url" content="https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2">';
const OG_WIDTH = '<meta property="og:image:width" content="1200">';
const OG_HEIGHT = '<meta property="og:image:height" content="630">';
const OG_TYPE = '<meta property="og:image:type" content="image/png">';
const TW = '<meta name="twitter:image" content="https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2">';
const IMAGE_PATH_REDIRECTS = new Map([
  ["/tool/categories/imagem/antes-e-depois", "/tool/categories/imagem/before-after/"],
  ["/tool/categories/imagem/antes-e-depois/", "/tool/categories/imagem/before-after/"],
  ["/tool/categories/imagem/adicionar-bordas", "/tool/categories/imagem/image-borders/"],
  ["/tool/categories/imagem/adicionar-bordas/", "/tool/categories/imagem/image-borders/"],
  ["/tool/categories/imagem/desfocar-pixelizar", "/tool/categories/imagem/blur-pixelate/"],
  ["/tool/categories/imagem/desfocar-pixelizar/", "/tool/categories/imagem/blur-pixelate/"],
  ["/tool/categories/imagem/girar-espelhar", "/tool/categories/imagem/rotate-flip-image/"],
  ["/tool/categories/imagem/girar-espelhar/", "/tool/categories/imagem/rotate-flip-image/"],
  ["/tool/categories/imagem/juntar-imagens", "/tool/categories/imagem/combine-images/"],
  ["/tool/categories/imagem/juntar-imagens/", "/tool/categories/imagem/combine-images/"]
]);

const PDF_PATH_REDIRECTS = new Map([
  ["/tool/categories/pdf/adicionar-texto-pdf", "/tool/categories/pdf/add-text-to-pdf/"],
  ["/tool/categories/pdf/adicionar-texto-pdf/", "/tool/categories/pdf/add-text-to-pdf/"],
  ["/tool/categories/pdf/dividir-pdf", "/tool/categories/pdf/split-pdf/"],
  ["/tool/categories/pdf/dividir-pdf/", "/tool/categories/pdf/split-pdf/"],
  ["/tool/categories/pdf/duplicar-paginas", "/tool/categories/pdf/duplicate-pdf-pages/"],
  ["/tool/categories/pdf/duplicar-paginas/", "/tool/categories/pdf/duplicate-pdf-pages/"],
  ["/tool/categories/pdf/eliminar-paginas", "/tool/categories/pdf/delete-pdf-pages/"],
  ["/tool/categories/pdf/eliminar-paginas/", "/tool/categories/pdf/delete-pdf-pages/"],
  ["/tool/categories/pdf/inserir-paginas", "/tool/categories/pdf/insert-pdf-pages/"],
  ["/tool/categories/pdf/inserir-paginas/", "/tool/categories/pdf/insert-pdf-pages/"],
  ["/tool/categories/pdf/juntar-pdf", "/tool/categories/pdf/merge-pdf/"],
  ["/tool/categories/pdf/juntar-pdf/", "/tool/categories/pdf/merge-pdf/"],
  ["/tool/categories/pdf/marca-dagua-pdf", "/tool/categories/pdf/pdf-watermark/"],
  ["/tool/categories/pdf/marca-dagua-pdf/", "/tool/categories/pdf/pdf-watermark/"],
  ["/tool/categories/pdf/rodar-pdf", "/tool/categories/pdf/rotate-pdf/"],
  ["/tool/categories/pdf/rodar-pdf/", "/tool/categories/pdf/rotate-pdf/"]
]);

const DEV_TOOL_RENAMES = new Map([["gerador-de-qr-code","qr-code-generator"],["leitor-de-qr-code","qr-code-reader"],["gerador-de-codigo-de-barras","barcode-generator"],["gerador-de-uuid","uuid-generator"],["gerador-de-hash","hash-generator"],["base64-encoder-decoder","base64-encoder-decoder"],["jwt-decoder","jwt-decoder"],["formatador-json","json-formatter"],["formatador-xml","xml-formatter"],["validador-json","json-validator"],["testador-de-regex","regex-tester"],["json-csv","json-csv"],["gerador-de-lorem-ipsum","lorem-ipsum-generator"],["gerador-de-meta-tags","meta-tag-generator"],["gerador-de-sitemap","sitemap-generator"],["gerador-de-robots-txt","robots-txt-generator"],["analisador-de-url","url-analyzer"],["encoder-decoder-url","url-encoder-decoder"],["conversor-de-timestamp","timestamp-converter"],["formatador-html","html-formatter"],["formatador-css-minifier","css-formatter-minifier"],["formatador-js-minifier","js-formatter-minifier"],["diff-checker","diff-checker"],["conversor-de-cores","color-converter"],["gerador-de-paleta-de-cores","color-palette-generator"],["conversor-de-dados-e-bytes","data-byte-converter"],["gerador-de-api-key","api-key-generator"],["gerador-de-secret","secret-generator"]]);
const FOOTER_SCRIPT = '<script src="/assets/nexauren-footer.js?v=20260928-4" defer></script>';
const ANALYTICS_SCRIPT = '<script src="/assets/analytics.js?v=20260929-1" defer></script>';

const TEMP_MAX_BYTES = 32 * 1024 * 1024;
const TEMP_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tempJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function tempOriginAllowed(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return request.method === "GET";
  return [
    "https://nexaurenstory.com",
    "https://www.nexaurenstory.com",
    "https://nexauren-blog.nexaurenstore.workers.dev"
  ].includes(origin);
}

function safeTempFilename(value) {
  const cleaned = String(value || "nexauren-image").replace(/[\\/\\0]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  return (cleaned || "nexauren-image").slice(0, 180);
}

async function filebaseTempRoute(request, env) {
  if (!tempOriginAllowed(request)) return tempJson({ ok: false, code: "ORIGIN" }, 403);

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const idMatch = url.pathname.match(/^\/api\/filebase\/temp\/([^/]+)$/);

  if (url.pathname === "/api/filebase/temp" && method === "POST") {
    const contentType = String(request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      return tempJson({ ok: false, code: "UNSUPPORTED_MEDIA", error: "Only image results can use temporary storage." }, 415);
    }

    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > TEMP_MAX_BYTES) {
      return tempJson({ ok: false, code: "TEMP_TOO_LARGE", maxBytes: TEMP_MAX_BYTES }, 413);
    }

    let body;
    try {
      body = await request.arrayBuffer();
    } catch {
      return tempJson({ ok: false, code: "BODY_READ_FAILED" }, 400);
    }

    if (!body.byteLength) return tempJson({ ok: false, code: "EMPTY_BODY" }, 400);
    if (body.byteLength > TEMP_MAX_BYTES) {
      return tempJson({ ok: false, code: "TEMP_TOO_LARGE", maxBytes: TEMP_MAX_BYTES }, 413);
    }

    const id = crypto.randomUUID();
    const key = "tmp/image-compressor/" + id;
    const filename = safeTempFilename(request.headers.get("x-nexauren-filename"));
    const stored = await filebasePutTemp(env, {
      key,
      body,
      contentType,
      filename
    });

    if (!stored.ok) {
      return tempJson({
        ok: false,
        code: "FILEBASE_PUT_FAILED",
        status: stored.status,
        requestId: stored.requestId
      }, 502);
    }

    return tempJson({
      ok: true,
      id,
      size: body.byteLength,
      contentType,
      expiresAt: stored.expiresAt
    }, 201);
  }

  if (idMatch && (method === "GET" || method === "DELETE")) {
    const id = idMatch[1];
    if (!TEMP_ID_RE.test(id)) return tempJson({ ok: false, code: "INVALID_ID" }, 400);

    const key = "tmp/image-compressor/" + id;

    if (method === "DELETE") {
      const deleted = await filebaseDeleteTemp(env, key);
      if (!deleted.response.ok && deleted.response.status !== 404) {
        return tempJson({
          ok: false,
          code: "FILEBASE_DELETE_FAILED",
          status: deleted.response.status,
          requestId: deleted.requestId
        }, 502);
      }
      return tempJson({ ok: true, deleted: true });
    }

    const result = await filebaseGetTemp(env, key);
    if (!result.response.ok) {
      return tempJson({
        ok: false,
        code: result.response.status === 404 ? "TEMP_NOT_FOUND" : "FILEBASE_GET_FAILED",
        status: result.response.status,
        requestId: result.requestId
      }, result.response.status === 404 ? 404 : 502);
    }

    const headers = new Headers();
    for (const name of ["content-type", "content-length", "etag", "x-amz-checksum-sha256"]) {
      const value = result.response.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("cache-control", "no-store");
    headers.set("x-content-type-options", "nosniff");

    return new Response(result.response.body, {
      status: 200,
      headers
    });
  }

  return null;
}

function upsert(html, regex, tag) {
  return regex.test(html)
    ? html.replace(regex, tag)
    : html.replace(/<\/head>/i, tag + "\n</head>");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const lowerPath = url.pathname.toLowerCase();

    if (lowerPath === "/api/filebase/temp" || /^\/api\/filebase\/temp\//.test(lowerPath)) {
      const tempResponse = await filebaseTempRoute(request, env);
      if (tempResponse) return tempResponse;
    }

    const imageRedirectTarget = IMAGE_PATH_REDIRECTS.get(lowerPath);
    if (imageRedirectTarget) {
      url.pathname = imageRedirectTarget;
      return Response.redirect(url.toString(), 301);
    }
    const pdfRedirectTarget = PDF_PATH_REDIRECTS.get(lowerPath);
    if (pdfRedirectTarget) {
      url.pathname = pdfRedirectTarget;
      return Response.redirect(url.toString(), 301);
    }

    const techCategoryOld = "/tool/categories/tecnologia";
    const techCategoryNew = "/tool/categories/developer-tools/";
    if (lowerPath === techCategoryOld || lowerPath === techCategoryOld + "/") {
      url.pathname = techCategoryNew;
      return Response.redirect(url.toString(), 301);
    }

    const devPrefix = "/tool/categories/developer-tools/";
    if (lowerPath.startsWith(devPrefix)) {
      const rest = url.pathname.slice(devPrefix.length);
      const targetPath = "/tool/categories/tecnologia/" + rest;
      url.pathname = targetPath;
      return app.fetch(new Request(url.toString(), request));
    }

    if (lowerPath.startsWith(techCategoryOld + "/")) {
      const rest = url.pathname.slice((techCategoryOld + "/").length);
      const slash = rest.indexOf("/");
      const oldSlug = (slash === -1 ? rest : rest.slice(0, slash)).replace(/^\/+|\/+$/g, "");
      const targetSlug = DEV_TOOL_RENAMES.get(oldSlug.toLowerCase()) || oldSlug;
      const suffix = slash === -1 ? "/" : rest.slice(slash);
      if (!/\.[a-z0-9]{1,8}$/i.test(rest)) {
        url.pathname = devPrefix + targetSlug + (suffix || "/");
        return Response.redirect(url.toString(), 301);
      }
    }

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
    const tasks = [];
    if (typeof app.scheduled === "function") {
      tasks.push(app.scheduled(controller, env, ctx));
    }
    if (new Date().getUTCMinutes() % 30 === 0) {
      tasks.push(filebaseCleanupTemp(env));
    }
    const results = await Promise.allSettled(tasks);
    return results;
  }
};
