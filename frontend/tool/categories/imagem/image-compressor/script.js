import { auth, onAuthStateChanged, workerFetch } from "/account/account-client.js?v=20260923-tool-access-2";

const $ = (s) => document.querySelector(s);
const state = {
  files: [],
  results: new Map(),
  policy: null,
  busy: false,
  toastTimer: null
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

function setPlanUI(policy) {
  const badge = $("#plan-badge");
  const stateEl = $("#plan-state");
  const copy = $("#plan-copy");
  if (!policy) {
    badge.textContent = "CONTA";
    stateEl.textContent = "A consultar…";
    stateEl.className = "nx-plan-state";
    copy.textContent = "A consultar Firebase e D1 para determinar o limite deste lote.";
    return;
  }
  const pro = policy.plan === "pro";
  badge.textContent = pro ? "NEXAUREN PRO" : "NEXAUREN FREE";
  stateEl.textContent = pro ? "Ilimitado" : "3 imagens";
  stateEl.className = "nx-plan-state " + (pro ? "pro" : "free");
  copy.textContent = pro
    ? "Lotes sem limite de imagens. O servidor continua a validar a sua assinatura antes do processamento."
    : "Até 3 imagens por lote. Entre no Pro para desbloquear lotes ilimitados.";
}

async function queryPolicy() {
  const data = await workerFetch("/api/tools/image-compressor/query", { method: "GET", cache: "no-store" });
  state.policy = data.policy;
  setPlanUI(state.policy);
  return state.policy;
}

async function consumeBatch(count) {
  return await workerFetch("/api/tools/image-compressor/consume", {
    method: "POST",
    body: JSON.stringify({ image_count: count })
  });
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
    queue.innerHTML = '<div class="nx-empty">Adicione até <strong>' +
      (state.policy?.plan === "pro" ? "quantas imagens quiser" : "3 imagens") +
      '</strong>. As imagens ficam no dispositivo enquanto são processadas.</div>';
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
}

function addFiles(inputFiles) {
  const incoming = uniqueImages(Array.from(inputFiles || []));
  if (!incoming.length) return;

  const max = state.policy?.plan === "pro" ? Infinity : Number(state.policy?.limits?.maxFilesPerBatch || 3);
  const room = Math.max(0, max - state.files.length);
  const accepted = incoming.slice(0, room);
  state.files.push(...accepted);

  if (accepted.length < incoming.length) {
    showToast("O Free permite até 3 imagens por lote. As restantes ficaram de fora.", "error");
  }
  renderQueue();
}

function removeAt(index) {
  if (state.busy) return;
  const file = state.files[index];
  if (!file) return;
  const result = state.results.get(fileKey(file));
  if (result?.url) URL.revokeObjectURL(result.url);
  state.results.delete(fileKey(file));
  state.files.splice(index, 1);
  renderQueue();
  renderResults();
}

function clearAll() {
  if (state.busy) return;
  for (const result of state.results.values()) if (result.url) URL.revokeObjectURL(result.url);
  state.results.clear();
  state.files = [];
  renderQueue();
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
    const policy = await queryPolicy();
    const count = state.files.length;
    const max = policy.plan === "pro" ? Infinity : Number(policy.limits?.maxFilesPerBatch || 3);
    if (count > max) {
      throw Object.assign(new Error("O seu plano permite no máximo " + max + " imagens por lote."), { code: "TOOL_BATCH_LIMIT" });
    }

    await consumeBatch(count);

    const files = [...state.files];
    for (let i = 0; i < files.length; i++) {
      setStatus("A comprimir " + (i + 1) + " de " + files.length + "…", "busy");
      await compressFile(files[i]);
    }

    renderResults();
    const finished = files.filter(file => state.results.get(fileKey(file))?.status === "done").length;
    showToast(finished + " de " + files.length + " imagens processadas.", finished === files.length ? "" : "error");
  } catch (error) {
    if (error?.code === "TOOL_BATCH_LIMIT") {
      showToast(error.message, "error");
    } else {
      showToast(error?.message || "Não foi possível iniciar o lote.", "error");
    }
  } finally {
    state.busy = false;
    renderQueue();
    renderResults();
  }
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
    "Plano: " + (state.policy?.plan === "pro" ? "Pro" : "Free"),
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
    showToast("O navegador não permitiu copiar o relatório.", "error");
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

  $("#queue").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-index]");
    if (remove) removeAt(Number(remove.dataset.removeIndex));
  });

  $("#result-list").addEventListener("click", event => {
    const button = event.target.closest("[data-download-key]");
    if (button) downloadResult(button.dataset.downloadKey);
  });

  setPreset("smart");
  renderQueue();
}

wire();

onAuthStateChanged(auth, async user => {
  const app = document.querySelector(".nx-app");
  const login = $("#login");
  const mainCard = document.querySelector(".nx-card:not(.nx-login)");
  if (!user) {
    mainCard.style.display = "none";
    login.classList.add("open");
    setPlanUI(null);
    return;
  }
  login.classList.remove("open");
  mainCard.style.display = "";
  try {
    await queryPolicy();
    renderQueue();
  } catch (error) {
    setPlanUI(null);
    showToast(error?.message || "Não foi possível consultar o seu plano.", "error");
  }
});
