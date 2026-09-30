const encoder = new TextEncoder();

function toHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data) {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes));
}

async function signingKey(secret, dateStamp, region, service) {
  const kDate = await hmacSha256(
    encoder.encode("AWS4" + secret),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function safeEndpoint(value) {
  const endpoint = String(value || "https://s3.filebase.io").trim();
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function responseCode(status) {
  if (status === 401 || status === 403) return "FILEBASE_AUTH_FAILED";
  if (status === 404) return "FILEBASE_BUCKET_NOT_FOUND";
  if (status === 429 || status === 503) return "FILEBASE_RATE_LIMITED";
  return "FILEBASE_REQUEST_FAILED";
}

export async function filebaseTest(env) {
  const required = [
    "FILEBASE_ACCESS_KEY",
    "FILEBASE_SECRET_KEY",
    "FILEBASE_BUCKET"
  ];

  const missing = required.filter((key) => !String(env[key] || "").trim());
  if (missing.length) {
    return new Response(
      JSON.stringify({
        ok: false,
        connected: false,
        error: "Filebase is not fully configured.",
        code: "FILEBASE_NOT_CONFIGURED",
        missing
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      }
    );
  }

  const endpoint = safeEndpoint(env.FILEBASE_ENDPOINT);
  if (!endpoint) {
    return new Response(
      JSON.stringify({
        ok: false,
        connected: false,
        error: "FILEBASE_ENDPOINT is invalid.",
        code: "FILEBASE_ENDPOINT_INVALID"
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      }
    );
  }

  const bucket = String(env.FILEBASE_BUCKET).trim();
  endpoint.pathname = "/" + encodeURIComponent(bucket);
  endpoint.search = "";

  const method = "HEAD";
  const region = "auto";
  const service = "s3";
  const payloadHash = await sha256Hex(new Uint8Array());
  const now = new Date();
  const amzDate = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders =
    "host:" + endpoint.host + "\n" +
    "x-amz-content-sha256:" + payloadHash + "\n" +
    "x-amz-date:" + amzDate + "\n";

  const signedHeaders =
    "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest =
    method + "\n" +
    endpoint.pathname + "\n" +
    "\n" +
    canonicalHeaders + "\n" +
    signedHeaders + "\n" +
    payloadHash;

  const canonicalRequestHash =
    await sha256Hex(canonicalRequest);

  const credentialScope =
    dateStamp + "/" + region + "/" + service + "/aws4_request";

  const stringToSign =
    "AWS4-HMAC-SHA256\n" +
    amzDate + "\n" +
    credentialScope + "\n" +
    canonicalRequestHash;

  const key = await signingKey(
    String(env.FILEBASE_SECRET_KEY),
    dateStamp,
    region,
    service
  );

  const signature = toHex(
    await hmacSha256(key, stringToSign)
  );

  const authorization =
    "AWS4-HMAC-SHA256 " +
    "Credential=" + String(env.FILEBASE_ACCESS_KEY) + "/" + credentialScope + ", " +
    "SignedHeaders=" + signedHeaders + ", " +
    "Signature=" + signature;

  const started = Date.now();

  let response;
  try {
    response = await fetch(endpoint.toString(), {
      method,
      headers: {
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        connected: false,
        error: "Could not reach the Filebase S3 endpoint.",
        code: "FILEBASE_NETWORK_ERROR",
        details: String(error?.message || error).slice(0, 180)
      }),
      {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      }
    );
  }

  const latencyMs = Date.now() - started;

  return new Response(
    JSON.stringify({
      ok: response.ok,
      connected: response.ok,
      filebaseStatus: response.status,
      code: response.ok ? "FILEBASE_CONNECTED" : responseCode(response.status),
      bucket,
      endpoint: endpoint.origin,
      region,
      latencyMs,
      requestId: response.headers.get("x-amz-request-id") || null
    }),
    {
      status: response.ok ? 200 : 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}


const FILEBASE_REGION = "auto";
const FILEBASE_SERVICE = "s3";

function encodedObjectPath(bucket, key) {
  return (
    "/" +
    encodeURIComponent(String(bucket)) +
    "/" +
    String(key)
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")
  );
}

function tempHeaders() {
  const now = new Date();
  const amzDate = now.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return {
    amzDate,
    dateStamp: amzDate.slice(0, 8)
  };
}

function canonicalHeaderValue(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

async function filebaseRequest(env, options = {}) {
  const endpoint = safeEndpoint(env.FILEBASE_ENDPOINT);
  if (!endpoint) throw new Error("Invalid Filebase endpoint.");

  const bucket = String(env.FILEBASE_BUCKET || "").trim();
  const key = String(options.key || "").trim();
  if (!bucket) throw new Error("Filebase bucket is missing.");

  endpoint.pathname = key ? encodedObjectPath(bucket, key) : "/" + encodeURIComponent(bucket);

  const query = options.query || {};
  const queryPairs = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => [
      encodeURIComponent(String(name)),
      encodeURIComponent(String(value))
    ])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
    .map(([name, value]) => name + "=" + value);
  endpoint.search = queryPairs.length ? "?" + queryPairs.join("&") : "";

  const method = String(options.method || "GET").toUpperCase();
  const body = options.body ?? null;
  const payloadBytes =
    body == null
      ? new Uint8Array()
      : body instanceof ArrayBuffer
        ? new Uint8Array(body)
        : body instanceof Uint8Array
          ? body
          : new Uint8Array(body);

  const payloadHash = await sha256Hex(payloadBytes);
  const { amzDate, dateStamp } = tempHeaders();

  const extra = {};
  if (options.contentType) extra["content-type"] = canonicalHeaderValue(options.contentType);
  for (const [name, value] of Object.entries(options.headers || {})) {
    extra[String(name).toLowerCase()] = canonicalHeaderValue(value);
  }

  const signedHeaderNames = ["host", "x-amz-content-sha256", "x-amz-date", ...Object.keys(extra)]
    .map((name) => name.toLowerCase())
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .sort();

  const headerMap = {
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extra
  };

  const canonicalHeaders = signedHeaderNames
    .map((name) => name + ":" + canonicalHeaderValue(headerMap[name]) + "\n")
    .join("");

  const signedHeaders = signedHeaderNames.join(";");

  const canonicalRequest = [
    method,
    endpoint.pathname,
    endpoint.search ? endpoint.search.slice(1) : "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const credentialScope =
    dateStamp + "/" + FILEBASE_REGION + "/" + FILEBASE_SERVICE + "/aws4_request";

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join("\n");

  const keyBytes = await signingKey(
    String(env.FILEBASE_SECRET_KEY),
    dateStamp,
    FILEBASE_REGION,
    FILEBASE_SERVICE
  );

  const signature = toHex(await hmacSha256(keyBytes, stringToSign));
  const authorization =
    "AWS4-HMAC-SHA256 " +
    "Credential=" + String(env.FILEBASE_ACCESS_KEY) + "/" + credentialScope + ", " +
    "SignedHeaders=" + signedHeaders + ", " +
    "Signature=" + signature;

  const headers = new Headers();
  for (const name of signedHeaderNames) {
    if (name !== "host") headers.set(name, headerMap[name]);
  }
  headers.set("authorization", authorization);

  let response;
  try {
    response = await fetch(endpoint.toString(), {
      method,
      headers,
      body: body == null ? undefined : payloadBytes
    });
  } catch (error) {
    throw Object.assign(new Error("Could not reach Filebase."), {
      code: "FILEBASE_NETWORK_ERROR",
      details: String(error?.message || error).slice(0, 180)
    });
  }

  return {
    response,
    requestId: response.headers.get("x-amz-request-id") || null
  };
}

export async function filebasePutTemp(env, { key, body, contentType, filename }) {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);

  const headers = {
    "x-amz-meta-purpose": "nexauren-temp",
    "x-amz-meta-created-at": createdAt.toISOString(),
    "x-amz-meta-expires-at": expiresAt.toISOString(),
    "x-amz-meta-filename": String(filename || "download").slice(0, 180)
  };

  const result = await filebaseRequest(env, {
    method: "PUT",
    key,
    body,
    contentType: contentType || "application/octet-stream",
    headers
  });

  const response = result.response;
  return {
    ok: response.ok,
    status: response.status,
    requestId: result.requestId,
    expiresAt: expiresAt.toISOString(),
    etag: response.headers.get("etag") || null
  };
}

export async function filebaseGetTemp(env, key) {
  return filebaseRequest(env, {
    method: "GET",
    key
  });
}

export async function filebaseDeleteTemp(env, key) {
  return filebaseRequest(env, {
    method: "DELETE",
    key
  });
}


export async function filebaseCleanupTemp(env, maxAgeMs = 6 * 60 * 60 * 1000) {
  const prefix = "tmp/image-compressor/";
  const result = await filebaseRequest(env, {
    method: "GET",
    key: "",
    query: {
      "list-type": "2",
      prefix
    }
  });

  if (!result.response.ok) {
    return {
      ok: false,
      status: result.response.status,
      deleted: 0,
      requestId: result.requestId
    };
  }

  const xml = await result.response.text();
  const now = Date.now();
  const matches = [...xml.matchAll(
    /<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<LastModified>([^<]+)<\/LastModified>[\s\S]*?<\/Contents>/g
  )];

  let deleted = 0;
  for (const match of matches.slice(0, 100)) {
    const key = match[1];
    const lastModified = Date.parse(match[2]);
    if (!key.startsWith(prefix) || !Number.isFinite(lastModified)) continue;
    if (now - lastModified < maxAgeMs) continue;

    try {
      const removed = await filebaseDeleteTemp(env, key);
      if (removed.response.ok || removed.response.status === 404) deleted++;
    } catch {}
  }

  return {
    ok: true,
    deleted,
    scanned: matches.length,
    requestId: result.requestId
  };
}
