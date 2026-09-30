import { getPlanState } from "/tool/frontend/tool-access.js?v=20260925-resize-auth5";

const $ = (s) => document.querySelector(s);
const state = { files: [], results: [], pro: false, limit: 10, ratio: null, planReady: false };
const els = {
  file: $("#file"), camera: $("#camera"), choose: $("#choose"), cameraBtn: $("#cameraBtn"), drop: $("#drop"),
  w: $("#w"), h: $("#h"), fit: $("#fit"), fmt: $("#fmt"), quality: $("#quality"), qv: $("#qv"),
  bg: $("#bg"), lock: $("#lock"), upscale: $("#upscale"), run: $("#run"), download: $("#download"),
  copySummary: $("#copySummary"), clear: $("#clear"), queue: $("#queue"), status: $("#status"), plan: $("#plan"),
  limit: $("#limit"), count: $("#count"), mode: $("#mode"), done: $("#done"), before: $("#totalBefore"),
  after: $("#totalAfter"), saved: $("#saved")
};

function bytes(n) {
  if (!Number.isFinite(n)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, value = n;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2) + " " + units[i];
}
function setStatus(message, error = false) {
  els.status.textContent = message;
  els.status.className = "status" + (error ? " error" : "");
}
function canRun() { return state.planReady && state.files.length > 0; }
function refreshButtons() {
  els.run.disabled = !canRun();
  els.download.disabled = state.results.length === 0;
}
function revoke(url) { try { URL.revokeObjectURL(url); } catch {} }

async function loadImage(file) {
  if (!file) throw new Error("Please select an image.");
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image", premultiplyAlpha: "default", colorSpaceConversion: "default" }); } catch {}
    try { return await createImageBitmap(file); } catch {}
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { revoke(url); resolve(img); };
    img.onerror = () => {
      revoke(url);
      const reader = new FileReader();
      reader.onload = () => {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => reject(new Error("This browser could not decode the selected image."));
        fallback.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Could not read the image file on this device."));
      try { reader.readAsDataURL(file); } catch { reject(new Error("Could not load this image.")); }
    };
    img.src = url;
  });
}
function imageWidth(image) { return image.width || image.naturalWidth || 0; }
function imageHeight(image) { return image.height || image.naturalHeight || 0; }
function makeCanvas(width, height) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}
function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not export this image format.")), type, quality);
  });
}
function downloadBlob(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a);
  try { a.click(); } finally {
    a.remove();
    setTimeout(() => revoke(url), 1500);
  }
}

function renderQueue() {
  els.count.textContent = String(state.files.length);
  els.queue.replaceChildren();
  state.files.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "item";

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "Selected image preview";
    const thumbUrl = URL.createObjectURL(file);
    img.src = thumbUrl;
    img.onload = () => revoke(thumbUrl);
    img.onerror = () => revoke(thumbUrl);

    const info = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = file.name;
    const br = document.createElement("br");
    const small = document.createElement("small");
    small.textContent = bytes(file.size);
    info.append(name, br, small);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset remove";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => {
      state.files.splice(index, 1);
      renderQueue();
      refreshButtons();
      if (!state.files.length) setStatus("Add images to start.");
    });

    row.append(img, info, btn);
    els.queue.append(row);
  });
}

function setPlanUI() {
  els.plan.textContent = state.pro ? "NEXAUREN PRO · 50/BATCH" : "NEXAUREN FREE · 10/BATCH";
  els.limit.textContent = String(state.limit);
}
async function loadPlan() {
  state.pro = false;
  state.limit = 10;
  try {
    const plan = await getPlanState({ force: true });
    if (plan?.authenticated && plan.pro === true && String(plan.plan || "").toLowerCase() === "pro" && String(plan.status || "").toUpperCase() === "ACTIVE") {
      state.pro = true;
      state.limit = 50;
    }
  } catch {}
  state.planReady = true;
  setPlanUI();
  refreshButtons();
}

async function addFiles(list) {
  const incoming = [...list].filter((file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(file.name || "");
  });
  if (!incoming.length) return setStatus("Please choose valid image files.", true);

  const maxSizeMB = state.pro ? 50 : 20;
  const room = Math.max(0, state.limit - state.files.length);
  if (!room) return setStatus("Your current plan has reached the batch limit.", true);

  const accepted = incoming.slice(0, room).filter((file) => file.size <= maxSizeMB * 1024 * 1024);
  const sizeRejected = incoming.filter((file) => file.size > maxSizeMB * 1024 * 1024).length;
  const countRejected = Math.max(0, incoming.length - Math.min(incoming.length, room));
  state.files.push(...accepted);
  renderQueue();
  refreshButtons();

  if (sizeRejected || countRejected) {
    const parts = [];
    if (countRejected) parts.push(countRejected + " exceeded the batch limit");
    if (sizeRejected) parts.push(sizeRejected + " exceeded " + maxSizeMB + " MB");
    setStatus(parts.join(" · ") + ".", true);
  } else {
    setStatus(state.files.length + " image" + (state.files.length === 1 ? "" : "s") + " in queue.");
  }
  if (state.files.length === 1) {
    try {
      const image = await loadImage(state.files[0]);
      state.ratio = imageWidth(image) / imageHeight(image);
      els.w.value = imageWidth(image);
      els.h.value = imageHeight(image);
      image.close?.();
    } catch (error) {
      setStatus(error?.message || "Could not read the first image.", true);
    }
  }
}

els.choose.addEventListener("click", (e) => { e.preventDefault(); els.file.click(); });
els.cameraBtn.addEventListener("click", (e) => { e.preventDefault(); els.camera.click(); });
els.file.addEventListener("change", async (e) => { await addFiles(e.target.files); e.target.value = ""; });
els.camera.addEventListener("change", async (e) => { await addFiles(e.target.files); e.target.value = ""; });

["dragenter", "dragover"].forEach((type) => els.drop.addEventListener(type, (e) => {
  e.preventDefault();
  els.drop.classList.add("drag");
}));
["dragleave", "drop"].forEach((type) => els.drop.addEventListener(type, (e) => {
  e.preventDefault();
  els.drop.classList.remove("drag");
}));
els.drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

els.quality.addEventListener("input", () => { els.qv.textContent = els.quality.value + "%"; });
els.fit.addEventListener("change", () => {
  els.mode.textContent = els.fit.value === "cover" ? "Cover" : els.fit.value === "stretch" ? "Stretch" : "Contain";
});
els.w.addEventListener("input", () => {
  if (els.lock.checked && state.ratio && Number(els.w.value) > 0) els.h.value = Math.max(1, Math.round(Number(els.w.value) / state.ratio));
});
els.h.addEventListener("input", () => {
  if (els.lock.checked && state.ratio && Number(els.h.value) > 0) els.w.value = Math.max(1, Math.round(Number(els.h.value) * state.ratio));
});
document.querySelectorAll(".preset").forEach((button) => {
  if (!button.dataset.w) return;
  button.addEventListener("click", (e) => {
    e.preventDefault();
    els.w.value = button.dataset.w;
    els.h.value = button.dataset.h;
    els.lock.checked = false;
  });
});

async function resizeOne(file) {
  const image = await loadImage(file);
  const iw = imageWidth(image), ih = imageHeight(image);
  let W = Math.max(1, Number(els.w.value) || 1);
  let H = Math.max(1, Number(els.h.value) || 1);
  const max = state.pro ? 12000 : 6000;
  if (!iw || !ih) {
    image.close?.();
    throw new Error("Could not determine the image dimensions.");
  }
  if (W > max || H > max) {
    image.close?.();
    throw new Error("The maximum output dimension is " + max + "px.");
  }

  if (!els.upscale.checked && (iw < W || ih < H)) {
    W = Math.min(W, iw);
    H = Math.min(H, ih);
  }
  const blob = await draw(image, W, H);
  image.close?.();
  return blob;
}

async function draw(image, W, H) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("The browser could not start image processing.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const fit = els.fit.value, iw = imageWidth(image), ih = imageHeight(image);
  if (els.fmt.value === "image/jpeg" || els.bg.value !== "transparent") {
    ctx.fillStyle = els.bg.value === "transparent" ? "#fff" : els.bg.value;
    ctx.fillRect(0, 0, W, H);
  }

  let dx = 0, dy = 0, dw = W, dh = H;
  if (fit !== "stretch") {
    const scale = fit === "cover" ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
    dw = Math.max(1, Math.round(iw * scale));
    dh = Math.max(1, Math.round(ih * scale));
    dx = Math.round((W - dw) / 2);
    dy = Math.round((H - dh) / 2);
  }
  ctx.drawImage(image, dx, dy, dw, dh);
  return toBlob(c, els.fmt.value, Number(els.quality.value) / 100);
}

async function run() {
  if (!state.planReady) return setStatus("Preparing the tool resources.", true);
  if (!state.files.length) return setStatus("Add at least one image.", true);
  if (state.files.length > state.limit) return setStatus("Your current plan has reached the batch limit.", true);

  els.run.disabled = true;
  els.download.disabled = true;
  state.results = [];
  els.done.textContent = "0";
  els.before.textContent = "—";
  els.after.textContent = "—";
  els.saved.textContent = "—";
  setStatus("Processing 0/" + state.files.length + "…");

  let before = 0, after = 0, done = 0;
  try {
    for (const file of state.files) {
      before += file.size;
      const blob = await resizeOne(file);
      after += blob.size;
      state.results.push({ name: file.name, blob });
      done++;
      els.done.textContent = String(done);
      els.before.textContent = bytes(before);
      els.after.textContent = bytes(after);
      els.saved.textContent = before ? Math.max(0, Math.round((1 - after / before) * 100)) + "%" : "—";
      setStatus("Processing " + done + "/" + state.files.length + "…");
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    setStatus(done + " image" + (done === 1 ? "" : "s") + " resized successfully. You can download the results.");
  } catch (error) {
    setStatus(error?.message || "Could not resize the images.", true);
  } finally {
    els.run.disabled = !canRun();
    els.download.disabled = state.results.length === 0;
  }
}

els.run.addEventListener("click", (e) => { e.preventDefault(); void run(); });
els.download.addEventListener("click", (e) => {
  e.preventDefault();
  if (!state.results.length) return setStatus("Resize at least one image first.", true);
  state.results.forEach((result, index) => setTimeout(() => {
    const ext = result.blob.type === "image/jpeg" ? ".jpg" : result.blob.type === "image/png" ? ".png" : ".webp";
    downloadBlob(result.blob, "nexauren-resize-" + String(index + 1).padStart(2, "0") + ext);
  }, index * 180));
  setStatus(state.results.length + " result" + (state.results.length === 1 ? "" : "s") + " sent to download.");
});
els.clear.addEventListener("click", (e) => {
  e.preventDefault();
  state.files = [];
  state.results = [];
  state.ratio = null;
  els.file.value = "";
  els.camera.value = "";
  els.queue.replaceChildren();
  els.count.textContent = "0";
  els.done.textContent = "0";
  els.before.textContent = "—";
  els.after.textContent = "—";
  els.saved.textContent = "—";
  els.download.disabled = true;
  refreshButtons();
  setStatus("Add images to start.");
});

function summaryText() {
  return [
    "NEXAUREN IMAGE RESIZER",
    "Plan: " + (state.pro ? "Pro" : "Free"),
    "Processed: " + els.done.textContent,
    "Original size: " + els.before.textContent,
    "Output size: " + els.after.textContent,
    "Reduction: " + els.saved.textContent,
    "Dimensions: " + els.w.value + " × " + els.h.value,
    "Format: " + els.fmt.options[els.fmt.selectedIndex].text
  ].join("\n");
}
async function copySummary() {
  const text = summaryText();
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Summary copied.");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      setStatus(ok ? "Summary copied." : "Could not copy the summary.", !ok);
    } catch {
      setStatus("Could not copy the summary.", true);
    }
  }
}
els.copySummary.addEventListener("click", (e) => { e.preventDefault(); void copySummary(); });
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (state.files.length) void run();
  }
});

setStatus("Preparing the tool…");
void loadPlan().then(() => setStatus(state.pro ? "Pro is active. You can resize up to 50 images per batch." : "Ready. You can resize up to 10 images per batch."));
