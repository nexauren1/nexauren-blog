const $ = (selector) => document.querySelector(selector);
const state = {
  files: [],
  results: [],
  ratio: null,
  baseName: "nexauren-resized",
  processing: false,
  currentFile: ""
};

const els = {
  file: $("#file"),
  camera: $("#camera"),
  choose: $("#choose"),
  cameraBtn: $("#cameraBtn"),
  drop: $("#drop"),
  w: $("#w"),
  h: $("#h"),
  fit: $("#fit"),
  fmt: $("#fmt"),
  quality: $("#quality"),
  qv: $("#qv"),
  bg: $("#bg"),
  lock: $("#lock"),
  upscale: $("#upscale"),
  run: $("#run"),
  download: $("#download"),
  copySummary: $("#copySummary"),
  clear: $("#clear"),
  queue: $("#queue"),
  status: $("#status"),
  spinner: $("#spinner"),
  progressWrap: $("#progressWrap"),
  progressBar: $("#progressBar"),
  resultsSection: $("#resultsSection"),
  resultGrid: $("#resultGrid"),
  count: $("#count"),
  mode: $("#mode"),
  target: $("#target"),
  done: $("#done"),
  before: $("#totalBefore"),
  after: $("#totalAfter"),
  saved: $("#saved")
};

const IMAGE_EXT = /.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i;

function bytes(value) {
  if (!Number.isFinite(value)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let number = value;
  while (number >= 1024 && index < units.length - 1) {
    number /= 1024;
    index++;
  }
  return number.toFixed(number >= 100 ? 0 : number >= 10 ? 1 : 2) + " " + units[index];
}

function setStatus(message, error = false) {
  els.status.textContent = message;
  els.status.className = "status" + (error ? " error" : "");
}

function revoke(url) {
  try { URL.revokeObjectURL(url); } catch {}
}

function setBusy(busy) {
  state.processing = busy;
  els.run.disabled = busy || state.files.length === 0;
  els.download.disabled = busy || state.results.length === 0;
  els.spinner.classList.toggle("on", busy);
  els.spinner.setAttribute("aria-hidden", busy ? "false" : "true");
  els.run.textContent = busy ? "Resizing…" : "Resize images";
  els.progressWrap.hidden = !busy;
}

function updateProgress(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  els.progressBar.style.width = percent + "%";
  els.progressWrap.setAttribute("aria-valuenow", String(percent));
}

function imageWidth(image) {
  return image.width || image.naturalWidth || 0;
}

function imageHeight(image) {
  return image.height || image.naturalHeight || 0;
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  try {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
  } catch {
    throw new Error("This browser cannot create an output canvas that large. Try smaller dimensions.");
  }
  if (!canvas.width || !canvas.height) {
    throw new Error("The selected output dimensions are not supported by this browser.");
  }
  return canvas;
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The browser could not export this image format.")),
      type,
      quality
    );
  });
}

async function loadImage(file) {
  if (!file) throw new Error("Please select an image.");

  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
        premultiplyAlpha: "default",
        colorSpaceConversion: "default"
      });
    } catch {}

    try {
      return await createImageBitmap(file);
    } catch {}
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      revoke(url);
      resolve(image);
    };

    image.onerror = () => {
      revoke(url);
      const reader = new FileReader();
      reader.onload = () => {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => reject(new Error("This browser could not decode the selected image."));
        fallback.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Could not read the image file on this device."));
      try {
        reader.readAsDataURL(file);
      } catch {
        reject(new Error("Could not load this image."));
      }
    };

    image.src = url;
  });
}

function getBaseName(name) {
  return String(name || "image").replace(/\.[^./\\]+$/, "") || "image";
}

function outputExtension(type) {
  return type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
}

function outputName(fileName, index) {
  return getBaseName(fileName) + "-resized-" + String(index + 1).padStart(2, "0") + "." + outputExtension(els.fmt.value);
}

function downloadBlob(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => revoke(url), 1400);
  }
}

function refreshTargetLabel() {
  const width = Number(els.w.value);
  const height = Number(els.h.value);
  els.target.textContent = width > 0 && height > 0 ? width + " × " + height : "Auto";
}

function refreshQualityState() {
  const lossless = els.fmt.value === "image/png";
  els.quality.disabled = lossless;
  els.qv.textContent = lossless ? "Lossless" : els.quality.value + "%";
  els.bg.value = els.fmt.value === "image/jpeg" && els.bg.value === "transparent" ? "#ffffff" : els.bg.value;
}

function refreshMode() {
  const map = { contain: "Contain", cover: "Cover", stretch: "Stretch" };
  els.mode.textContent = map[els.fit.value] || "Contain";
  refreshTargetLabel();
}

function refreshButtons() {
  els.run.disabled = state.processing || state.files.length === 0;
  els.download.disabled = state.processing || state.results.length === 0;
}

function renderQueue() {
  els.count.textContent = String(state.files.length);
  els.queue.replaceChildren();

  state.files.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "item";

    const thumb = document.createElement("img");
    thumb.className = "thumb";
    thumb.alt = "Preview of " + file.name;
    thumb.loading = "lazy";

    const previewUrl = URL.createObjectURL(file);
    thumb.src = previewUrl;
    thumb.onload = () => revoke(previewUrl);
    thumb.onerror = () => revoke(previewUrl);

    const info = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = file.name;
    const small = document.createElement("small");
    small.textContent = bytes(file.size);
    info.append(name, document.createElement("br"), small);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn ghost remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + file.name);
    remove.addEventListener("click", () => {
      state.files.splice(index, 1);
      state.results = [];
      renderQueue();
      renderResults();
      refreshButtons();
      setStatus(state.files.length ? state.files.length + " image" + (state.files.length === 1 ? "" : "s") + " in queue." : "Add images to start.");
    });

    row.append(thumb, info, remove);
    els.queue.append(row);
  });

  refreshButtons();
}

function renderResults() {
  els.resultGrid.replaceChildren();
  els.resultsSection.classList.toggle("hidden", state.results.length === 0);
  els.download.disabled = state.results.length === 0 || state.processing;

  state.results.forEach((result, index) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const title = document.createElement("h3");
    title.textContent = result.outputName;

    const compare = document.createElement("div");
    compare.className = "compare";

    const beforeFigure = document.createElement("figure");
    const beforeCaption = document.createElement("figcaption");
    beforeCaption.textContent = "Original · " + result.originalWidth + " × " + result.originalHeight;
    const beforeImage = document.createElement("img");
    beforeImage.className = "preview";
    beforeImage.alt = "Original preview of " + result.originalName;
    beforeImage.loading = "lazy";
    const sourceUrl = URL.createObjectURL(result.file);
    beforeImage.src = sourceUrl;
    beforeImage.onload = () => revoke(sourceUrl);
    beforeImage.onerror = () => revoke(sourceUrl);
    beforeFigure.append(beforeCaption, beforeImage);

    const afterFigure = document.createElement("figure");
    const afterCaption = document.createElement("figcaption");
    afterCaption.textContent = "Resized · " + result.width + " × " + result.height;
    const afterImage = document.createElement("img");
    afterImage.className = "preview";
    afterImage.alt = "Resized preview of " + result.originalName;
    afterImage.loading = "lazy";
    const outputUrl = URL.createObjectURL(result.blob);
    afterImage.src = outputUrl;
    afterImage.onload = () => revoke(outputUrl);
    afterImage.onerror = () => revoke(outputUrl);
    afterFigure.append(afterCaption, afterImage);

    compare.append(beforeFigure, afterFigure);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    const size = document.createElement("span");
    size.textContent = bytes(result.blob.size);
    const delta = document.createElement("strong");
    delta.textContent = result.originalSize
      ? Math.round((1 - result.blob.size / result.originalSize) * 100) + "% size change"
      : "Ready";
    meta.append(size, delta);

    const actions = document.createElement("div");
    actions.className = "result-actions";
    const download = document.createElement("button");
    download.type = "button";
    download.className = "btn primary";
    download.textContent = "Download";
    download.addEventListener("click", () => {
      downloadBlob(result.blob, result.outputName);
      setStatus("Downloaded " + result.outputName + ".");
    });

    actions.append(download);
    card.append(title, compare, meta, actions);
    els.resultGrid.append(card);
  });
}

function clearResults() {
  state.results = [];
  els.done.textContent = "0";
  els.before.textContent = "—";
  els.after.textContent = "—";
  els.saved.textContent = "—";
  els.progressBar.style.width = "0%";
  els.progressWrap.setAttribute("aria-valuenow", "0");
  renderResults();
}

async function addFiles(list) {
  const incoming = [...list].filter((file) => {
    if (!file) return false;
    return (file.type && file.type.startsWith("image/")) || IMAGE_EXT.test(file.name || "");
  });

  if (!incoming.length) {
    setStatus("Please choose valid image files.", true);
    return;
  }

  const existingKeys = new Set(state.files.map((file) => file.name + ":" + file.size + ":" + file.lastModified));
  const unique = incoming.filter((file) => {
    const key = file.name + ":" + file.size + ":" + file.lastModified;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });

  state.files.push(...unique);
  clearResults();
  renderQueue();

  if (!unique.length) {
    setStatus("Those images are already in the queue.");
    return;
  }

  setStatus(state.files.length + " image" + (state.files.length === 1 ? "" : "s") + " in queue.");

  if (!Number(els.w.value) || !Number(els.h.value)) {
    try {
      const image = await loadImage(state.files[0]);
      const width = imageWidth(image);
      const height = imageHeight(image);
      state.ratio = width && height ? width / height : null;
      els.w.value = String(width || "");
      els.h.value = String(height || "");
      image.close?.();
      refreshTargetLabel();
    } catch (error) {
      setStatus(error?.message || "Could not read the selected image.", true);
    }
  }
}

function applyDimensions(width, height, updateRatio = true) {
  els.w.value = String(width);
  els.h.value = String(height);
  if (updateRatio && width > 0 && height > 0) state.ratio = width / height;
  refreshTargetLabel();
}

function updateLockedDimension(changed) {
  if (!els.lock.checked || !state.ratio) return;

  if (changed === "width") {
    const width = Number(els.w.value);
    if (width > 0) els.h.value = String(Math.max(1, Math.round(width / state.ratio)));
  } else {
    const height = Number(els.h.value);
    if (height > 0) els.w.value = String(Math.max(1, Math.round(height * state.ratio)));
  }

  refreshTargetLabel();
}

function drawResized(image, width, height) {
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("The browser could not start image processing.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const type = els.fmt.value;
  const background = els.bg.value;
  if (type === "image/jpeg" || background !== "transparent") {
    context.fillStyle = type === "image/jpeg" && background === "transparent" ? "#ffffff" : background;
    context.fillRect(0, 0, width, height);
  }

  const iw = imageWidth(image);
  const ih = imageHeight(image);
  const fit = els.fit.value;

  let dx = 0;
  let dy = 0;
  let dw = width;
  let dh = height;

  if (fit !== "stretch") {
    let scale = fit === "cover"
      ? Math.max(width / iw, height / ih)
      : Math.min(width / iw, height / ih);

    if (!els.upscale.checked) scale = Math.min(scale, 1);

    dw = Math.max(1, Math.round(iw * scale));
    dh = Math.max(1, Math.round(ih * scale));
    dx = Math.round((width - dw) / 2);
    dy = Math.round((height - dh) / 2);
  }

  context.drawImage(image, dx, dy, dw, dh);
  const quality = type === "image/png" ? undefined : Number(els.quality.value) / 100;
  return toBlob(canvas, type, quality).then((blob) => ({ blob, width, height }));
}

async function resizeOne(file) {
  const image = await loadImage(file);
  try {
    const originalWidth = imageWidth(image);
    const originalHeight = imageHeight(image);
    if (!originalWidth || !originalHeight) throw new Error("Could not determine the image dimensions.");

    let width = Number(els.w.value) || originalWidth;
    let height = Number(els.h.value) || originalHeight;

    if (els.lock.checked && state.ratio) {
      if (Number(els.w.value) && !Number(els.h.value)) height = Math.round(width / state.ratio);
      else if (Number(els.h.value) && !Number(els.w.value)) width = Math.round(height * state.ratio);
    }

    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));

    const result = await drawResized(image, width, height);
    return {
      file,
      originalName: file.name,
      originalSize: file.size,
      originalWidth,
      originalHeight,
      width: result.width,
      height: result.height,
      blob: result.blob
    };
  } finally {
    image.close?.();
  }
}

async function run() {
  if (state.processing) return;
  if (!state.files.length) {
    setStatus("Add at least one image.", true);
    return;
  }

  clearResults();
  setBusy(true);
  updateProgress(0, state.files.length);
  setStatus("Preparing 0/" + state.files.length + "…");

  let before = 0;
  let after = 0;
  let done = 0;

  try {
    for (const file of state.files) {
      state.currentFile = file.name;
      setStatus("Resizing " + (done + 1) + "/" + state.files.length + " · " + file.name);
      const result = await resizeOne(file);
      result.outputName = outputName(file.name, done);
      state.results.push(result);
      before += result.originalSize;
      after += result.blob.size;
      done++;

      els.done.textContent = String(done);
      els.before.textContent = bytes(before);
      els.after.textContent = bytes(after);
      els.saved.textContent = before ? Math.round((1 - after / before) * 100) + "%" : "—";

      renderResults();
      updateProgress(done, state.files.length);

      if (done < state.files.length) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    setStatus(done + " image" + (done === 1 ? "" : "s") + " resized successfully.");
  } catch (error) {
    setStatus(error?.message || "Could not resize the images.", true);
  } finally {
    state.currentFile = "";
    setBusy(false);
    refreshButtons();
  }
}

function summaryText() {
  return [
    "NEXAUREN IMAGE RESIZER",
    "Processed: " + els.done.textContent,
    "Original size: " + els.before.textContent,
    "Output size: " + els.after.textContent,
    "Size change: " + els.saved.textContent,
    "Dimensions: " + (els.w.value || "original") + " × " + (els.h.value || "original"),
    "Fit: " + els.mode.textContent,
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
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      setStatus(ok ? "Summary copied." : "Could not copy the summary.", !ok);
    } catch {
      setStatus("Could not copy the summary.", true);
    }
  }
}

async function downloadAll() {
  if (!state.results.length) {
    setStatus("Resize at least one image first.", true);
    return;
  }

  state.results.forEach((result, index) => {
    setTimeout(() => downloadBlob(result.blob, result.outputName), index * 160);
  });
  setStatus(state.results.length + " result" + (state.results.length === 1 ? "" : "s") + " sent to download.");
}

function resetTool() {
  state.files = [];
  state.results = [];
  state.ratio = null;
  state.baseName = "nexauren-resized";
  els.file.value = "";
  els.camera.value = "";
  els.w.value = "";
  els.h.value = "";
  els.lock.checked = true;
  els.fit.value = "contain";
  els.fmt.value = "image/webp";
  els.quality.value = "88";
  els.bg.value = "transparent";
  els.upscale.checked = false;
  els.done.textContent = "0";
  els.before.textContent = "—";
  els.after.textContent = "—";
  els.saved.textContent = "—";
  els.target.textContent = "Auto";
  refreshQualityState();
  refreshMode();
  renderQueue();
  clearResults();
  updateProgress(0, 1);
  setStatus("Add images to start.");
}

els.choose.addEventListener("click", (event) => {
  event.preventDefault();
  els.file.click();
});

els.cameraBtn.addEventListener("click", (event) => {
  event.preventDefault();
  els.camera.click();
});

els.file.addEventListener("change", async (event) => {
  await addFiles(event.target.files);
  event.target.value = "";
});

els.camera.addEventListener("change", async (event) => {
  await addFiles(event.target.files);
  event.target.value = "";
});

["dragenter", "dragover"].forEach((type) => {
  els.drop.addEventListener(type, (event) => {
    event.preventDefault();
    els.drop.classList.add("drag");
  });
});

["dragleave", "drop"].forEach((type) => {
  els.drop.addEventListener(type, (event) => {
    event.preventDefault();
    els.drop.classList.remove("drag");
  });
});

els.drop.addEventListener("drop", (event) => {
  void addFiles(event.dataTransfer.files);
});

els.drop.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    els.file.click();
  }
});

els.quality.addEventListener("input", () => {
  els.qv.textContent = els.quality.disabled ? "Lossless" : els.quality.value + "%";
});

els.fit.addEventListener("change", refreshMode);
els.fmt.addEventListener("change", refreshQualityState);

els.w.addEventListener("input", () => updateLockedDimension("width"));
els.h.addEventListener("input", () => updateLockedDimension("height"));

document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    if (button.dataset.auto === "1") {
      if (!state.files.length) {
        setStatus("Choose an image first so its original dimensions can be detected.", true);
        return;
      }

      void loadImage(state.files[0]).then((image) => {
        applyDimensions(imageWidth(image), imageHeight(image));
        image.close?.();
        els.lock.checked = true;
        setStatus("Original dimensions restored.");
      }).catch((error) => setStatus(error?.message || "Could not read the original dimensions.", true));

      return;
    }

    const width = Number(button.dataset.w);
    const height = Number(button.dataset.h);
    applyDimensions(width, height, false);
    els.lock.checked = false;
    setStatus("Preset applied: " + width + " × " + height + ".");
  });
});

els.download.addEventListener("click", (event) => {
  event.preventDefault();
  void downloadAll();
});

els.copySummary.addEventListener("click", (event) => {
  event.preventDefault();
  void copySummary();
});

els.clear.addEventListener("click", (event) => {
  event.preventDefault();
  resetTool();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    if (state.files.length) void run();
  }
});

els.run.addEventListener("click", (event) => {
  event.preventDefault();
  void run();
});

els.bg.addEventListener("change", () => {
  if (els.fmt.value === "image/jpeg" && els.bg.value === "transparent") {
    els.bg.value = "#ffffff";
    setStatus("JPG does not support transparency, so a white background was selected.");
  }
});

refreshQualityState();
refreshMode();
refreshButtons();
setStatus("Ready. Add images to start.");
