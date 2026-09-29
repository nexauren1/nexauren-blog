
const $ = (s) => document.querySelector(s);
const state = {
  files: [],
  results: new Map(),
  policy: null,
  busy: false,
  toastTimer: null,
  previewUrls: new Map(),
  comparePosition: 0
};

const PRESETS = {
  web: { format: "webp", quality: 78, max: 1920 },
  smart: { format: "webp", quality: 84, max: 2560 },
  small: { format: "webp", quality: 68, max: 1600 },
  quality: { format: "webp", quality: 92, max: 3200 }
};

function esc(value) {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function bytes(value) {
  if (!Number.isFinite(value)) return "—";
  const units = ["B","KB","MB","GB"];
  let n = value, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2) + " " + units[i];
}

function extension(format) {
  return format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : "webp";
}

function showToast(message, type = "") {
  const el = $("#toast");
  el.textContent = message;
  el.className = "nx-toast show " + type;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { el.className = "nx-toast"; }, 2800);
}

function setStatus(message, type = "ready") {
  const meta = $("#queue-meta");
  meta.textContent = message;
  meta.dataset.state = type;
}

function setPlanUI() {
  const badge = $("#plan-badge");
  const stateEl = $("#plan-state");
  const copy = $("#plan-copy");
  if (badge) badge.textContent = "PROCESSAMENTO LOCAL";
  if (stateEl) {
    stateEl.textContent = "SEM BLOQUEIO";
    stateEl.className = "nx-plan-state pro";
  }
  if (copy) copy.textContent = "Lotes sem limite artificial. Os ficheiros são processados diretamente no seu dispositivo.";
}

async function queryPolicy() {
  state.policy = { plan: "free", limits: { maxFilesPerBatch: Infinity }, usage: null };
  setPlanUI();
  return state.policy;
}

function fileKey(file) {
  return [file.name, file.size, file.lastModified].join("::");
}

function uniqueImages(files) {
  const seen = new Set(state.files.map(fileKey));
  return files.filter(file => {
    if (!file.type.startsWith("image/")) return false;
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderQueue() {
  const queue = $("#queue");
  if (!state.files.length) {
    queue.innerHTML = '<div class="nx-empty"><strong>Adicione quantas imagens quiser.</strong><br>Sem limite artificial por plano; a capacidade real depende do seu dispositivo.</div>';
    $("#compress").disabled = true;
    $("#clear").disabled = true;
    setStatus("Nenhuma imagem selecionada.");
    return;
  }

  $("#clear").disabled = state.busy;
  $("#compress").disabled = state.busy;
  $("#compress").textContent = state.busy ? "A comprimir…" : "Comprimir lote";

  queue.innerHTML = state.files.map((file, index) => {
    const result = state.results.get(fileKey(file));
    const status = result ? result.status : "ready";
    const statusText = result ? result.statusText : "Pronto para processar";
    const preview = result?.url || URL.createObjectURL(file);
    return '<article class="nx-item" data-key="' + esc(fileKey(file)) + '">' +
      '<div class="nx-thumb"><img src="' + esc(preview) + '" alt="" loading="lazy"></div>' +
      '<div class="nx-item-main">' +
        '<div class="nx-item-name" title="' + esc(file.name) + '">' + esc(file.name) + '</div>' +
        '<div class="nx-item-meta"><span>' + bytes(file.size) + '</span><span>' + file.type.replace("image/","").toUpperCase() + '</span></div>' +
        '<div class="nx-item-status ' + status + '">' + esc(statusText) + '</div>' +
      '</div>' +
      '<button class="nx-item-remove" type="button" data-remove-index="' + index + '" aria-label="Remover ' + esc(file.name) + '" ' + (state.busy ? "disabled" : "") + '>×</button>' +
    '</article>';
  }).join("");

  setStatus(state.files.length + (state.files.length === 1 ? " imagem" : " imagens") + " na fila.");
  renderCompare();
}

function addFiles(inputFiles) {
  const incoming = uniqueImages(Array.from(inputFiles || []));
  if (!incoming.length) return;

  state.files.push(...incoming);
  state.comparePosition = Math.max(0, state.files.length - incoming.length);
  renderQueue();
  renderCompare();
}

function removeAt(index) {
  if (state.busy) return;
  const file = state.files[index];
  if (!file) return;
  const result = state.results.get(fileKey(file));
  if (result?.url) URL.revokeObjectURL(result.url);
  clearPreviewUrl(fileKey(file));
  state.results.delete(fileKey(file));
  state.files.splice(index, 1);
  state.comparePosition = Math.min(state.comparePosition, Math.max(0, state.files.length - 1));
  renderQueue();
  renderCompare();
  renderResults();
}

function clearAll() {
  if (state.busy) return;
  for (const result of state.results.values()) if (result.url) URL.revokeObjectURL(result.url);
  for (const url of state.previewUrls.values()) URL.revokeObjectURL(url);
  state.previewUrls.clear();
  state.results.clear();
  state.files = [];
  state.comparePosition = 0;
  renderQueue();
  renderCompare();
  renderResults();
}

function readSettings() {
  const maxWidth = Math.min(12000, Math.max(256, Number($("#max-width").value) || 2560));
  const maxHeight = Math.min(12000, Math.max(256, Number($("#max-height").value) || 2560));
  return {
    format: $("#format").value,
    quality: Number($("#quality").value) / 100,
    maxWidth,
    maxHeight,
    targetEnabled: $("#target-enabled").checked,
    targetBytes: Math.min(20 * 1024 * 1024, Math.max(10 * 1024, (Number($("#target-kb").value) || 500) * 1024)),
    background: $("#background").value,
    suffix: sanitizeSuffix($("#suffix").value)
  };
}

function sanitizeSuffix(value) {
  const v = String(value || "-nexauren").trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 40);
  return v || "-nexauren";
}

function chooseFormat(file, requested) {
  if (requested === "jpeg") return "image/jpeg";
  if (requested === "png") return "image/png";
  if (requested === "webp") return "image/webp";
  return "image/webp";
}

function sizeWithin(sourceWidth, sourceHeight, maxWidth, maxHeight) {
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
}

async function decode(file) {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.()
      };
    } catch {}
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Não foi possível abrir " + file.name));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url)
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function exportCanvas(canvas, mime, quality) {
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("O navegador não conseguiu gerar o ficheiro.")), mime, quality);
  });
}

async function renderCanvas(decoded, settings, mime) {
  const dims = sizeWithin(decoded.width, decoded.height, settings.maxWidth, settings.maxHeight);
  const pixels = dims.width * dims.height;
  if (pixels > 36000000) throw new Error("A dimensão escolhida é demasiado pesada para este dispositivo.");

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });
  if (!ctx) throw new Error("O navegador não disponibilizou o Canvas.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (mime === "image/jpeg") {
    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, dims.width, dims.height);
  }
  ctx.drawImage(decoded.source, 0, 0, dims.width, dims.height);
  return { canvas, width: dims.width, height: dims.height };
}

async function compressOne(file, settings) {
  const decoded = await decode(file);
  try {
    const mime = chooseFormat(file, settings.format);
    const rendered = await renderCanvas(decoded, settings, mime);
    const { canvas } = rendered;

    let blob;
    let finalQuality = mime === "image/png" ? 1 : settings.quality;

    if (settings.targetEnabled && mime !== "image/png") {
      let low = 0.35, high = Math.max(0.36, settings.quality);
      let best = null;
      for (let i = 0; i < 8; i++) {
        const mid = (low + high) / 2;
        const candidate = await exportCanvas(canvas, mime, mid);
        if (candidate.size <= settings.targetBytes) {
          best = candidate;
          low = mid;
        } else {
          high = mid;
        }
      }
      const fallback = await exportCanvas(canvas, mime, low);
      blob = best || fallback;
      finalQuality = low;
    } else {
      blob = await exportCanvas(canvas, mime, finalQuality);
    }

    return {
      blob,
      mime,
      width: rendered.width,
      height: rendered.height,
      quality: Math.round(finalQuality * 100)
    };
  } finally {
    decoded.close();
  }
}

async function compressFile(file) {
  const key = fileKey(file);
  state.results.set(key, { status: "busy", statusText: "A preparar…" });
  renderQueue();

  try {
    const output = await compressOne(file, readSettings());
    const oldResult = state.results.get(key);
    if (oldResult?.url) URL.revokeObjectURL(oldResult.url);

    const url = URL.createObjectURL(output.blob);
    const saving = Math.round((1 - output.blob.size / file.size) * 100);
    state.results.set(key, {
      status: "done",
      statusText: "Concluído · " + (saving >= 0 ? saving + "% menor" : Math.abs(saving) + "% maior"),
      blob: output.blob,
      url,
      mime: output.mime,
      width: output.width,
      height: output.height,
      quality: output.quality,
      saving
    });
  } catch (error) {
    state.results.set(key, { status: "error", statusText: error?.message || "Falha ao comprimir." });
  }
  renderQueue();
}

async function compressAll() {
  if (state.busy || !state.files.length) return;
  state.busy = true;
  renderQueue();

  try {
    const files = [...state.files];
    for (let i = 0; i < files.length; i++) {
      setStatus("A comprimir " + (i + 1) + " de " + files.length + "…", "busy");
      await compressFile(files[i]);
    }

    renderResults();
    const finished = files.filter(file => state.results.get(fileKey(file))?.status === "done").length;
    showToast(finished + " de " + files.length + " imagens processadas.", finished === files.length ? "" : "error");
  } catch (error) {
    showToast(error?.message || "Não foi possível iniciar o lote.", "error");
  } finally {
    state.busy = false;
    renderQueue();
    renderResults();
  }
}

function getPreviewUrl(file) {
  const key = fileKey(file);
  if (!state.previewUrls.has(key)) state.previewUrls.set(key, URL.createObjectURL(file));
  return state.previewUrls.get(key);
}

function clearPreviewUrl(key) {
  const url = state.previewUrls.get(key);
  if (url) URL.revokeObjectURL(url);
  state.previewUrls.delete(key);
}

function currentCompareFile() {
  return state.files[Math.max(0, Math.min(state.comparePosition, state.files.length - 1))] || null;
}

function renderCompare() {
  const panel = $("#compare");
  if (!panel) return;
  const file = currentCompareFile();
  if (!file) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  $("#compare-index").textContent = (state.comparePosition + 1) + " / " + state.files.length;

  const key = fileKey(file);
  const result = state.results.get(key);
  const originalUrl = getPreviewUrl(file);
  const original = $("#compare-original");
  const output = $("#compare-result");
  const placeholder = $("#compare-placeholder");

  original.src = originalUrl;
  output.hidden = !result?.blob;
  placeholder.hidden = !!result?.blob;

  $("#compare-original-size").textContent = bytes(file.size);
  $("#compare-original-meta").textContent = file.type.replace("image/","").toUpperCase();
  $("#compare-caption").textContent = result?.blob
    ? "Compare visualmente o original com a versão otimizada."
    : "A imagem original já está pronta. O resultado aparecerá aqui após a compressão.";

  if (!result?.blob) {
    $("#compare-result-meta").textContent = "Aguardando compressão";
    $("#compare-result-size").textContent = "—";
    $("#compare-saving").textContent = "—";
    $("#compare-dimensions").textContent = "—";
    $("#compare-format").textContent = "—";
    $("#compare-quality").textContent = "—";
    $("#download-preview").disabled = true;
    return;
  }

  output.src = result.url;
  $("#compare-result-meta").textContent = extension(result.mime).toUpperCase();
  $("#compare-result-size").textContent = bytes(result.blob.size);
  $("#compare-saving").textContent = result.saving >= 0 ? result.saving + "%" : "↑ " + Math.abs(result.saving) + "%";
  $("#compare-dimensions").textContent = result.width + "×" + result.height;
  $("#compare-format").textContent = extension(result.mime).toUpperCase();
  $("#compare-quality").textContent = "Q" + result.quality;
  $("#download-preview").disabled = false;
}

function downloadPreview() {
  const file = currentCompareFile();
  if (!file) return;
  const result = state.results.get(fileKey(file));
  if (result?.blob) downloadResult(fileKey(file));
}

function openCurrentPreview(original = false) {
  const file = currentCompareFile();
  if (!file) return;
  const result = state.results.get(fileKey(file));
  const url = original ? getPreviewUrl(file) : result?.url;
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
}

function moveCompare(step) {
  if (!state.files.length) return;
  state.comparePosition = (state.comparePosition + step + state.files.length) % state.files.length;
  renderCompare();
  const panel = $("#compare");
  panel?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderResults() {
  const done = state.files.map(file => ({ file, result: state.results.get(fileKey(file)) })).filter(x => x.result?.status === "done");
  const panel = $("#results");
  if (!done.length) {
    panel.classList.remove("open");
    $("#download-all").disabled = true;
    $("#copy-report").disabled = true;
    return;
  }

  panel.classList.add("open");
  const original = done.reduce((sum, x) => sum + x.file.size, 0);
  const output = done.reduce((sum, x) => sum + x.result.blob.size, 0);
  const saved = original ? Math.round((1 - output / original) * 100) : 0;

  $("#stat-count").textContent = done.length;
  $("#stat-original").textContent = bytes(original);
  $("#stat-output").textContent = bytes(output);
  $("#stat-saved").textContent = (saved >= 0 ? saved : "−" + Math.abs(saved)) + "%";

  $("#result-list").innerHTML = done.map(({ file, result }) =>
    '<div class="nx-result">' +
      '<div class="nx-result-thumb"><img src="' + esc(result.url) + '" alt="" loading="lazy"></div>' +
      '<div class="nx-result-name"><strong>' + esc(file.name) + '</strong><span>' + result.width + " × " + result.height + " · " + extension(result.mime).toUpperCase() + " · Q" + result.quality + '</span></div>' +
      '<div class="nx-saving">' + (result.saving >= 0 ? result.saving + "% menor" : Math.abs(result.saving) + "% maior") + '</div>' +
      '<button class="nx-btn" type="button" data-download-key="' + esc(fileKey(file)) + '">Baixar</button>' +
    '</div>'
  ).join("");

  $("#download-all").disabled = false;
  $("#copy-report").disabled = false;
  renderCompare();
}

function outputName(file, result) {
  const original = file.name.replace(/.[^.]+$/, "");
  return original + readSettings().suffix + "." + extension(result.mime);
}

function downloadResult(key) {
  const file = state.files.find(f => fileKey(f) === key);
  const result = state.results.get(key);
  if (!file || !result?.blob) return;
  const link = document.createElement("a");
  link.href = result.url;
  link.download = outputName(file, result);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadAll() {
  const items = state.files.map(file => ({ file, result: state.results.get(fileKey(file)) })).filter(x => x.result?.blob);
  for (const { file, result } of items) {
    downloadResult(fileKey(file));
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  showToast(items.length + " ficheiros enviados para download.");
}

function reportText() {
  const items = state.files.map(file => ({ file, result: state.results.get(fileKey(file)) })).filter(x => x.result?.status === "done");
  if (!items.length) return "";
  const lines = [
    "NEXAUREN IMAGE LAB — COMPRESSOR",
    "Processamento: local · sem limite artificial por plano",
    "Imagens: " + items.length,
    ""
  ];
  for (const { file, result } of items) {
    const saving = result.saving >= 0 ? result.saving + "% menor" : Math.abs(result.saving) + "% maior";
    lines.push(file.name + " — " + bytes(file.size) + " → " + bytes(result.blob.size) + " — " + saving + " — " + result.width + "×" + result.height + " — " + extension(result.mime).toUpperCase());
  }
  return lines.join("\n");
}

async function copyReport() {
  const text = reportText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Relatório copiado.");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove();
      showToast(ok ? "Relatório copiado." : "Não foi possível copiar o relatório.", ok ? "" : "error");
    } catch { showToast("Não foi possível copiar o relatório.", "error"); }
  }
}

function setPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  $("#format").value = preset.format;
  $("#quality").value = preset.quality;
  $("#quality-value").textContent = preset.quality + "%";
  $("#max-width").value = preset.max;
  $("#max-height").value = preset.max;
  document.querySelectorAll("[data-preset]").forEach(btn => btn.classList.toggle("active", btn.dataset.preset === name));
}

function wire() {
  $("#year").textContent = new Date().getFullYear();
  const input = $("#file-input");
  $("#pick").addEventListener("click", () => input.click());
  input.addEventListener("change", event => {
    addFiles(event.target.files);
    input.value = "";
  });

  const drop = $("#dropzone");
  ["dragenter","dragover"].forEach(type => drop.addEventListener(type, event => {
    event.preventDefault();
    drop.classList.add("is-over");
  }));
  ["dragleave","drop"].forEach(type => drop.addEventListener(type, event => {
    event.preventDefault();
    drop.classList.remove("is-over");
  }));
  drop.addEventListener("drop", event => addFiles(event.dataTransfer?.files));

  window.addEventListener("paste", event => {
    const images = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith("image/"));
    if (images.length) {
      addFiles(images);
      showToast(images.length === 1 ? "Imagem colada na fila." : images.length + " imagens coladas na fila.");
    }
  });

  $("#quality").addEventListener("input", e => $("#quality-value").textContent = e.target.value + "%");
  $("#target-enabled").addEventListener("change", e => $("#target-field").hidden = !e.target.checked);
  document.querySelectorAll("[data-preset]").forEach(btn => btn.addEventListener("click", () => setPreset(btn.dataset.preset)));
  $("#compress").addEventListener("click", compressAll);
  $("#clear").addEventListener("click", clearAll);
  $("#download-all").addEventListener("click", downloadAll);
  $("#copy-report").addEventListener("click", copyReport);
  $("#download-preview").addEventListener("click", downloadPreview);
  $("#open-original").addEventListener("click", () => openCurrentPreview(true));
  $("#compare-prev").addEventListener("click", () => moveCompare(-1));
  $("#compare-next").addEventListener("click", () => moveCompare(1));

  $("#queue").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-index]");
    if (remove) removeAt(Number(remove.dataset.removeIndex));
  });

  $("#result-list").addEventListener("click", event => {
    const button = event.target.closest("[data-download-key]");
    if (button) downloadResult(button.dataset.downloadKey);
  });

  setPreset("smart");
  setPlanUI();
  renderQueue();
  renderCompare();
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      compressAll();
    }
  });
}

wire();
