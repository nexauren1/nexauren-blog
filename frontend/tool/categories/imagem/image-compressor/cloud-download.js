const TEMP_ENDPOINT = "/api/filebase/temp";

function cleanBaseName(name) {
  const base = String(name || "image").replace(/\\.[^.]+$/, "");
  return (base || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function extensionForMime(mime) {
  const type = String(mime || "").toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  if (type === "image/gif") return "gif";
  if (type === "image/bmp") return "bmp";
  return "img";
}

function setDownloadState(button, label, disabled) {
  if (!button) return;
  button.textContent = label;
  button.disabled = disabled;
}

async function uploadTemporaryResult(blob, filename) {
  const response = await fetch(TEMP_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": blob.type || "application/octet-stream",
      "x-nexauren-filename": filename
    },
    body: blob,
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok || !data?.id) {
    throw new Error(data?.code || "TEMP_UPLOAD_FAILED");
  }
  return data;
}

async function fetchTemporaryResult(id) {
  const response = await fetch(TEMP_ENDPOINT + "/" + encodeURIComponent(id), {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("TEMP_DOWNLOAD_FAILED");
  }
  return response.blob();
}

async function deleteTemporaryResult(id) {
  try {
    await fetch(TEMP_ENDPOINT + "/" + encodeURIComponent(id), {
      method: "DELETE",
      cache: "no-store",
      keepalive: true
    });
  } catch {}
}

function downloadBlobLocally(blob, originalName) {
  const localUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = localUrl;
  link.download = cleanBaseName(originalName) + "-nexauren." + extensionForMime(blob.type);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(localUrl), 2000);
}

async function secureDownload(button) {
  const image = document.querySelector("#result-image");
  const filename = document.querySelector("#file-name")?.textContent || "image";
  if (!image?.src) return;

  const originalMeta = document.querySelector("#result-meta")?.textContent || "";
  let tempId = "";
  setDownloadState(button, "Preparing…", true);

  try {
    const resultBlob = await fetch(image.src, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error("RESULT_READ_FAILED");
      return response.blob();
    });

    if (!resultBlob.size) throw new Error("EMPTY_RESULT");

    if (!navigator.onLine) throw new Error("OFFLINE");

    const uploaded = await uploadTemporaryResult(
      resultBlob,
      cleanBaseName(filename) + "." + extensionForMime(resultBlob.type)
    );
    tempId = uploaded.id;

    const result = await fetchTemporaryResult(uploaded.id);
    downloadBlobLocally(result, filename);

    const meta = document.querySelector("#result-meta");
    if (meta) meta.textContent = originalMeta + " · Secure temporary download";
  } catch {
    try {
      const fallbackBlob = await fetch(image.src, { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error("LOCAL_READ_FAILED");
        return response.blob();
      });
      downloadBlobLocally(fallbackBlob, filename);
    } catch {
      const link = document.createElement("a");
      link.href = image.src;
      link.download = cleanBaseName(filename) + "-nexauren." + extensionForMime(image.currentSrc || "");
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } finally {
    if (tempId) await deleteTemporaryResult(tempId);
    setDownloadState(button, "Download", false);
  }
}

function initSecureDownload() {
  const button = document.querySelector("#download");
  if (!button) return;

  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    secureDownload(button);
  }, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSecureDownload, { once: true });
} else {
  initSecureDownload();
}
