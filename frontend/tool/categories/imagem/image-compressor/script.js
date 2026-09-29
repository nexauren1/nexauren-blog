
const $ = (s) => document.querySelector(s);
const state = {
  files: [],
  results: new Map(),
  policy: null,
  busy: false,
  toastTimer: null,
  previewUrls: new Map(),
  comparePosition: 0,
  zoom: 1,
  slider: 50,
  history: [],
  analysis: new Map(),
  processing: { done: 0, total: 0, concurrency: 1 }
};

const PRESETS = {
  web: { format: "webp", quality: 78, max: 1920 },
  smart: { format: "webp", quality: 84, max: 2560 },
  small: { format: "webp", quality: 68, max: 1600 },
  quality: { format: "webp", quality: 92, max: 3200 }
};
const HISTORY_KEY = "nexauren-image-compressor-history-v1";

function esc(value) {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function formatMs(value) {
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return Math.max(1, Math.round(value)) + " ms";
  return (value / 1000).toFixed(value < 10000 ? 2 : 1) + " s";
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
  analyzeAll(state.files).catch(() => {});
}

function removeAt(index) {
  if (state.busy) return;
  const file = state.files[index];
  if (!file) return;
  const result = state.results.get(fileKey(file));
  if (result?.url) URL.revokeObjectURL(result.url);
  clearPreviewUrl(fileKey(file));
  state.results.delete(fileKey(file));
  state.analysis.delete(fileKey(file));
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
  state.analysis.clear();
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
    suffix: sanitizeSuffix($("#suffix").value),
    smart: $("#smart-enabled")?.checked !== false,
    parallel: $("#parallel-enabled")?.checked !== false
  };
}

function sanitizeSuffix(value) {
  const v = String(value || "-nexauren").trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 40);
  return v || "-nexauren";
}

async function analyzeImage(file) {
  const cached = state.analysis.get(fileKey(file));
  if (cached) return cached;

  const started = performance.now();
  let decoded = null;
  let alphaRatio = 0;
  let colorVariance = 0;
  let samplePixels = 0;

  try {
    decoded = await decode(file);
    const sampleMax = 96;
    const scale = Math.min(1, sampleMax / decoded.width, sampleMax / decoded.height);
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(decoded.source, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      const values = [];
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        if (a < 0.98) alphaRatio += 1;
        const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        values.push(y);
      }
      samplePixels = values.length;
      if (values.length) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        colorVariance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      }
    }
  } catch {
    // Metadata-only fallback below.
  } finally {
    decoded?.close?.();
  }

  alphaRatio = samplePixels ? alphaRatio / samplePixels : 0;
  const mp = (file.size && Number.isFinite(file.size)) ? (decoded?.width * decoded?.height || 0) / 1000000 : 0;
  const isPng = file.type === "image/png";
  const isJpeg = file.type === "image/jpeg";
  const isWebp = file.type === "image/webp";
  const transparent = alphaRatio > 0.015;
  const graphic = transparent || (isPng && colorVariance < 850);
  const photo = isJpeg || isWebp || (!graphic && colorVariance > 900);

  const analysis = {
    type: transparent ? "transparência" : graphic ? "gráfico / UI" : photo ? "fotografia" : "imagem",
    transparent,
    photo,
    graphic,
    width: decoded?.width || 0,
    height: decoded?.height || 0,
    megapixels: mp,
    alphaRatio,
    colorVariance,
    ms: performance.now() - started
  };

  state.analysis.set(fileKey(file), analysis);
  return analysis;
}

function deviceConcurrency() {
  const cores = Number(navigator.hardwareConcurrency || 4);
  const memory = Number(navigator.deviceMemory || 4);
  if (cores <= 2 || memory <= 2) return 1;
  if (cores <= 4 || memory <= 4) return 2;
  return 3;
}

function smartSettings(file, base, analysis) {
  if (!base.smart) return { ...base, profile: "manual" };

  const output = { ...base };
  const mp = Math.max(0, analysis?.megapixels || 0);
  const large = mp >= 12 || Math.max(analysis?.width || 0, analysis?.height || 0) >= 5000;
  const tiny = file.size < 180 * 1024;
  const photo = !!analysis?.photo;
  const graphic = !!analysis?.graphic;

  if (output.format === "auto") output.format = "webp";

  if (graphic && output.format === "webp") {
    output.quality = tiny ? 0.92 : 0.88;
    output.profile = analysis?.transparent ? "Smart · transparência" : "Smart · gráfico";
  } else if (photo) {
    output.quality = tiny ? 0.90 : (large ? 0.80 : 0.84);
    output.profile = large ? "Smart · foto grande" : "Smart · fotografia";
  } else {
    output.quality = tiny ? 0.92 : 0.86;
    output.profile = "Smart · equilibrado";
  }

  const deviceCores = Number(navigator.hardwareConcurrency || 4);
  const maxForDevice = deviceCores <= 2 ? 1920 : deviceCores <= 4 ? 2560 : 3200;
  if (large && output.maxWidth >= maxForDevice) {
    output.maxWidth = Math.min(output.maxWidth, maxForDevice);
    output.maxHeight = Math.min(output.maxHeight, maxForDevice);
  }

  if (analysis?.transparent && output.format === "jpeg") {
    output.format = "webp";
    output.profile = "Smart · transparência preservada";
  }

  return output;
}

async function analyzeAll(files) {
  const analyses = [];
  for (const file of files) {
    try { analyses.push(await analyzeImage(file)); }
    catch { analyses.push(null); }
  }
  renderSmartPanel(analyses, files);
  return analyses;
}

function renderSmartPanel(analyses, files) {
  const panel = $("#smart-analysis");
  if (!panel) return;
  if (!files.length) {
    $("#smart-title").textContent = "Análise automática pronta";
    $("#smart-description").textContent = "O Nexauren pode adaptar formato, qualidade e dimensão a cada imagem antes de processar o lote.";
    $("#smart-badge").textContent = "AUTO";
    $("#smart-capacity").textContent = "Processamento adaptativo";
    return;
  }
  const valid = analyses.filter(Boolean);
  const smart = valid.filter(a => a.photo || a.graphic || a.transparent).length;
  const maxMp = valid.reduce((m, a) => Math.max(m, a.megapixels || 0), 0);
  const labels = [...new Set(valid.map(a => a.type))];
  $("#smart-title").textContent = "Motor Smart analisou " + valid.length + " de " + files.length + " imagem" + (files.length === 1 ? "" : "ns");
  $("#smart-description").textContent = smart
    ? labels.join(" · ") + " detectado" + (labels.length > 1 ? "s" : "") + ". O compressor ajustará a estratégia por ficheiro."
    : "Será aplicado um perfil equilibrado para cada ficheiro.";
  $("#smart-badge").textContent = "SMART";
  $("#smart-capacity").textContent = maxMp ? maxMp.toFixed(1) + " MP máx. · local" : "Processamento local";
}

function chooseFormat(file, requested) {
  if (requested === "jpeg") return "image/jpeg";
  if (requested === "png") return "image/png";
  if (requested === "webp") return "image/webp";
  if (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp") return "image/webp";
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

    let effectiveBlob = blob;
    let effectiveMime = mime;
    let effectiveQuality = Math.round(finalQuality * 100);
    let noGain = false;

    if (!settings.targetEnabled && blob.size >= file.size && file.type.startsWith("image/")) {
      const fallbackQuality = Math.max(0.55, Math.min(finalQuality - 0.08, 0.72));
      if (mime !== "image/png" && fallbackQuality < finalQuality) {
        const fallback = await exportCanvas(canvas, mime, fallbackQuality);
        if (fallback.size < blob.size) {
          effectiveBlob = fallback;
          effectiveQuality = Math.round(fallbackQuality * 100);
        }
      }

      if (effectiveBlob.size >= file.size) {
        effectiveBlob = file;
        effectiveMime = file.type || mime;
        effectiveQuality = 100;
        noGain = true;
      }
    }

    return {
      blob: effectiveBlob,
      mime: effectiveMime,
      width: rendered.width,
      height: rendered.height,
      quality: effectiveQuality,
      noGain,
      profile: settings.profile || "Manual"
    };
  } finally {
    decoded.close();
  }
}

async function compressFile(file) {
  const key = fileKey(file);
  state.results.set(key, { status: "busy", statusText: "A analisar…" });
  renderQueue();

  try {
    const started = performance.now();
    const baseSettings = readSettings();
    const analysis = baseSettings.smart ? await analyzeImage(file) : null;
    const settings = smartSettings(file, baseSettings, analysis);
    state.results.set(key, { status: "busy", statusText: (settings.profile || "A preparar…") + " · a comprimir…" });
    renderQueue();
    const output = await compressOne(file, settings);
    output.ms = performance.now() - started;
    const oldResult = state.results.get(key);
    if (oldResult?.url) URL.revokeObjectURL(oldResult.url);

    const url = URL.createObjectURL(output.blob);
    const saving = Math.round((1 - output.blob.size / file.size) * 100);
    state.results.set(key, {
      status: "done",
      statusText: output.noGain
        ? "Concluído · sem ganho adicional"
        : "Concluído · " + (saving >= 0 ? saving + "% menor" : Math.abs(saving) + "% maior"),
      blob: output.blob,
      url,
      mime: output.mime,
      width: output.width,
      height: output.height,
      quality: output.quality,
      saving,
      ms: output.ms,
      profile: output.profile,
      noGain: output.noGain,
      analysis
    });
    saveHistoryEntry(file, state.results.get(key));
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
    const base = readSettings();
    const concurrency = base.parallel ? Math.min(deviceConcurrency(), files.length) : 1;
    state.processing = { done: 0, total: files.length, concurrency };

    const queue = [...files];
    const worker = async () => {
      while (queue.length) {
        const file = queue.shift();
        if (!file) return;
        const index = files.indexOf(file) + 1;
        setStatus("A processar " + index + " de " + files.length + " · " + concurrency + " em paralelo…", "busy");
        await compressFile(file);
        state.processing.done += 1;
        setStatus("Processadas " + state.processing.done + " de " + files.length + " · " + concurrency + " em paralelo.", "busy");
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    renderResults();
    const finished = files.filter(file => state.results.get(fileKey(file))?.status === "done").length;
    const failed = files.length - finished;
    showToast(failed
      ? finished + " concluídas · " + failed + " com erro."
      : finished + " imagens processadas com o modo " + (concurrency > 1 ? "paralelo" : "sequencial") + ".");
  } catch (error) {
    showToast(error?.message || "Não foi possível iniciar o lote.", "error");
  } finally {
    state.busy = false;
    state.processing = { done: 0, total: 0, concurrency: 1 };
    renderQueue();
    renderResults();
    analyzeAll(state.files).catch(() => {});
  }
}

function saveHistoryEntry(file, result) {
  const entry = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    name: file.name,
    original: file.size,
    output: result.blob.size,
    saving: result.saving,
    width: result.width,
    height: result.height,
    format: extension(result.mime).toUpperCase(),
    quality: result.quality,
    profile: result.profile,
    ms: result.ms,
    noGain: result.noGain,
    at: new Date().toISOString()
  };
  state.history.unshift(entry);
  state.history = state.history.slice(0, 12);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history)); } catch {}
  renderHistory();
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    state.history = Array.isArray(saved) ? saved.slice(0, 12) : [];
  } catch {
    state.history = [];
  }
  renderHistory();
}

function clearHistory() {
  state.history = [];
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
  renderHistory();
  showToast("Histórico local limpo.");
}

function renderHistory() {
  const list = $("#history-list");
  if (!list) return;
  if (!state.history.length) {
    list.innerHTML = '<div class="nx-history-empty">Ainda não há compressões nesta sessão.</div>';
    return;
  }
  list.innerHTML = state.history.map(item => {
    const when = new Date(item.at);
    const label = Number.isNaN(when.getTime()) ? "" : when.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
    return '<article class="nx-history-item">' +
      '<div class="nx-history-icon">✦</div>' +
      '<div class="nx-history-main"><strong title="' + esc(item.name) + '">' + esc(item.name) + '</strong>' +
      '<span>' + bytes(item.original) + ' → ' + bytes(item.output) + ' · ' + (item.noGain ? 'sem ganho adicional' : (item.saving >= 0 ? item.saving + '% menor' : '↑ ' + Math.abs(item.saving) + '%')) + ' · ' + esc(item.format) + ' · ' + esc(item.profile || 'Manual') + '</span></div>' +
      '<div class="nx-history-meta"><strong>' + esc(formatMs(item.ms)) + '</strong><small>' + esc(label) + '</small></div>' +
      '</article>';
  }).join("");
}

function applyZoom() {
  const value = state.zoom;
  const text = Math.round(value * 100) + "%";
  $("#zoom-value").textContent = text;
  ["#slider-original","#slider-result","#compare-original","#compare-result"].forEach(sel => {
    const el = $(sel);
    if (el) {
      el.style.transform = "scale(" + value + ")";
      el.style.transformOrigin = "center";
      el.style.transition = "transform .18s ease";
    }
  });
}

function setZoom(next) {
  state.zoom = Math.min(2, Math.max(0.5, Number(next) || 1));
  applyZoom();
}

function renderSlider() {
  const stage = $("#compare-slider-stage");
  const layer = $("#slider-result-layer");
  const divider = $("#slider-divider");
  const range = $("#compare-slider");
  const result = $("#slider-result");
  const placeholder = $("#slider-placeholder");
  const file = currentCompareFile();
  const output = file ? state.results.get(fileKey(file)) : null;

  if (!stage || !layer || !divider || !range || !result || !placeholder) return;
  state.slider = Number(range.value || 50);
  layer.style.width = state.slider + "%";
  divider.style.left = state.slider + "%";
  const ready = !!output?.blob;
  placeholder.hidden = ready;
  result.hidden = !ready;
  $("#slider-status").textContent = ready
    ? "Arraste o divisor. O original fica à esquerda; o resultado, à direita."
    : "Comprima uma imagem para ativar a comparação interativa.";
  if (ready) {
    $("#slider-original").style.opacity = "1";
    result.src = output.url;
    $("#lightbox-result").src = output.url;
  }
  applyZoom();
}

function openLightbox() {
  const file = currentCompareFile();
  if (!file) return;
  const result = state.results.get(fileKey(file));
  if (!result?.blob) {
    showToast("Comprima a imagem antes de abrir a tela cheia.", "error");
    return;
  }
  const box = $("#preview-lightbox");
  box.hidden = false;
  document.body.classList.add("nx-modal-open");
  $("#lightbox-title").textContent = file.name;
  $("#lightbox-original").src = getPreviewUrl(file);
  $("#lightbox-result").src = result.url;
  $("#lightbox-meta").textContent = bytes(file.size) + " → " + bytes(result.blob.size) + " · " + (result.saving >= 0 ? result.saving + "% menor" : "↑ " + Math.abs(result.saving) + "%") + " · " + extension(result.mime).toUpperCase();
}

function closeLightbox() {
  const box = $("#preview-lightbox");
  box.hidden = true;
  document.body.classList.remove("nx-modal-open");
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
    ? (result.profile ? result.profile + " · compare visualmente o original com o resultado." : "Compare visualmente o original com a versão otimizada.")
    : "A imagem original já está pronta. O resultado aparecerá aqui após a compressão.";

  if (!result?.blob) {
    $("#compare-result-meta").textContent = "Aguardando compressão";
    $("#compare-result-size").textContent = "—";
    $("#compare-saving").textContent = "—";
    $("#compare-dimensions").textContent = "—";
    $("#compare-format").textContent = "—";
    $("#compare-quality").textContent = "—";
    $("#compare-time").textContent = "—";
    $("#download-preview").disabled = true;
    renderSlider();
    return;
  }

  output.src = result.url;
  $("#compare-result-meta").textContent = extension(result.mime).toUpperCase();
  $("#compare-result-size").textContent = bytes(result.blob.size);
  $("#compare-saving").textContent = result.noGain ? "0%" : (result.saving >= 0 ? result.saving + "%" : "↑ " + Math.abs(result.saving) + "%");
  $("#compare-dimensions").textContent = result.width + "×" + result.height;
  $("#compare-format").textContent = extension(result.mime).toUpperCase();
  $("#compare-quality").textContent = result.noGain ? "Original" : "Q" + result.quality;
  $("#compare-time").textContent = formatMs(result.ms);
  $("#download-preview").disabled = false;
  renderSlider();
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
      '<div class="nx-result-name"><strong>' + esc(file.name) + '</strong><span>' + result.width + " × " + result.height + " · " + extension(result.mime).toUpperCase() + " · " + esc(result.noGain ? "Original preservado" : ("Q" + result.quality)) + " · " + esc(result.profile || "Manual") + '</span></div>' +
      '<div class="nx-saving">' + (result.noGain ? "sem ganho" : (result.saving >= 0 ? result.saving + "% menor" : Math.abs(result.saving) + "% maior")) + '</div>' +
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
  $("#compare-slider").addEventListener("input", event => {
    state.slider = Number(event.target.value);
    renderSlider();
  });
  $("#zoom-in").addEventListener("click", () => setZoom(state.zoom + 0.1));
  $("#zoom-out").addEventListener("click", () => setZoom(state.zoom - 0.1));
  $("#zoom-reset").addEventListener("click", () => setZoom(1));
  $("#fullscreen-preview").addEventListener("click", openLightbox);
  $("#close-lightbox").addEventListener("click", closeLightbox);
  document.querySelector("[data-close-lightbox]")?.addEventListener("click", closeLightbox);
  $("#lightbox-download").addEventListener("click", downloadPreview);
  $("#clear-history").addEventListener("click", clearHistory);
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
  renderSmartPanel([], []);
  loadHistory();
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#preview-lightbox").hidden) {
      closeLightbox();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      setZoom(1);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      compressAll();
    }
  });
}

wire();
