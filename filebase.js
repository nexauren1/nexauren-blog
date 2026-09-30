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
