const $ = (selector) => document.querySelector(selector);

const state = {
  file: null,
  originalUrl: "",
  result: null,
  token: 0,
  timer: null,
  settingsOpen: false,
  busy: false
};

const DEFAULTS = {
  format: "auto",
  quality: 84,
  maxWidth: 2560,
  maxHeight: 2560,
  mode: "smart",
  autoApply: true,
  background: "#ffffff"
};

function bytes(value){
  if(!Number.isFinite(value)) return "—";
  const units=["B","KB","MB","GB"];
  let n=value,i=0;
  while(n>=1024 && i<units.length-1){n/=1024;i++;}
  return n.toFixed(n>=100?0:n>=10?1:2)+" "+units[i];
}

function timeLabel(ms){
  if(!Number.isFinite(ms)) return "—";
  return ms<1000 ? Math.max(1,Math.round(ms))+" ms" : (ms/1000).toFixed(ms<10000?2:1)+" s";
}

function extension(mime){
  if(mime==="image/jpeg") return "JPG";
  if(mime==="image/png") return "PNG";
  return "WEBP";
}

function outputMime(file, format){
  if(format==="jpeg") return "image/jpeg";
  if(format==="png") return "image/png";
  if(format==="webp") return "image/webp";
  return file?.type==="image/png" ? "image/webp" : "image/webp";
}

function sanitizeDimensions(){
  const w=Math.min(12000,Math.max(256,Number($("#max-width").value)||DEFAULTS.maxWidth));
  const h=Math.min(12000,Math.max(256,Number($("#max-height").value)||DEFAULTS.maxHeight));
  $("#max-width").value=w;
  $("#max-height").value=h;
  return {w,h};
}

function getSettings(){
  const d=sanitizeDimensions();
  return {
    format:$("#format").value,
    quality:Number($("#quality").value)/100,
    maxWidth:d.w,
    maxHeight:d.h,
    mode:$("#mode").value,
    autoApply:$("#auto-apply").checked,
    background:$("#background").value
  };
}

function modeSettings(settings,file,source){
  const out={...settings};

  if(out.mode==="small") out.quality=Math.min(out.quality,0.68);
  if(out.mode==="quality") out.quality=Math.max(out.quality,0.92);

  if(out.mode==="smart"){
    const large=Math.max(source.width,source.height)>=4500 || (source.width*source.height)>=12000000;
    const png=file.type==="image/png";
    out.format=out.format==="auto" ? "webp" : out.format;
    out.quality=png ? Math.max(out.quality,0.88) : (large ? Math.min(out.quality,0.82) : out.quality);
    if(large){
      out.maxWidth=Math.min(out.maxWidth,3200);
      out.maxHeight=Math.min(out.maxHeight,3200);
    }
  }

  if(out.format==="auto") out.format="webp";
  return out;
}

function showToast(message,type=""){
  const el=$("#toast");
  el.textContent=message;
  el.className="nx-toast show "+type;
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>{el.className="nx-toast";},2800);
}

function setStatus(status){
  const dot=$("#status-dot");
  dot.className="nx-status-dot "+status;
}

function resetResult(){
  if(state.result?.url) URL.revokeObjectURL(state.result.url);
  state.result=null;
  $("#result-image").hidden=true;
  $("#result-empty").hidden=false;
  $("#result-loading").hidden=true;
  $("#result-size").textContent="Aguardando";
  $("#result-meta").textContent="—";
  $("#saving").textContent="—";
  $("#dimensions").textContent="—";
  $("#format-label").textContent="—";
  $("#time-label").textContent="—";
  $("#download").disabled=true;
}

function setWorkspaceFile(file){
  if(state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  resetResult();

  state.file=file;
  state.originalUrl=URL.createObjectURL(file);

  const img=$("#original-image");
  img.src=state.originalUrl;

  $("#file-name").textContent=file.name;
  $("#file-info").textContent=file.type.replace("image/","").toUpperCase()+" · "+bytes(file.size);
  $("#original-size").textContent=bytes(file.size);
  $("#original-loading").hidden=false;
  setStatus("busy");

  img.onload=()=>{
    $("#original-loading").hidden=true;
    $("#original-dimensions").textContent=img.naturalWidth+" × "+img.naturalHeight;
    setStatus("ready");
    scheduleApply(120);
  };
  img.onerror=()=>{
    $("#original-loading").hidden=true;
    setStatus("error");
    showToast("Não foi possível abrir esta imagem neste navegador.", "error");
  };
}

async function decode(file){
  if(!file) throw new Error("Nenhuma imagem selecionada.");

  if("createImageBitmap" in window){
    try{
      const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
      return {
        source:bitmap,
        width:bitmap.width,
        height:bitmap.height,
        close:()=>bitmap.close?.()
      };
    }catch{}

    try{
      const bitmap=await createImageBitmap(file);
      return {
        source:bitmap,
        width:bitmap.width,
        height:bitmap.height,
        close:()=>bitmap.close?.()
      };
    }catch{}
  }

  const loadFromSrc=(src,revoke=false)=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      resolve({
        source:img,
        width:img.naturalWidth,
        height:img.naturalHeight,
        close:()=>{if(revoke) URL.revokeObjectURL(src);}
      });
    };
    img.onerror=()=>{
      if(revoke) URL.revokeObjectURL(src);
      reject(new Error("Não foi possível abrir "+file.name));
    };
    img.src=src;
  });

  try{
    const url=URL.createObjectURL(file);
    return await loadFromSrc(url,true);
  }catch{
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error("Não foi possível ler "+file.name));
      reader.readAsDataURL(file);
    });
    return await loadFromSrc(String(dataUrl),false);
  }
}

function canvasSize(width,height,maxWidth,maxHeight){
  const scale=Math.min(1,maxWidth/width,maxHeight/height);
  return {
    width:Math.max(1,Math.round(width*scale)),
    height:Math.max(1,Math.round(height*scale))
  };
}

function canvasBlob(canvas,mime,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(blob) resolve(blob);
      else reject(new Error("O navegador não conseguiu gerar o resultado."));
    },mime,quality);
  });
}

async function compress(file,settings,token){
  const started=performance.now();
  const decoded=await decode(file);
  try{
    if(token!==state.token) return null;

    const effective=modeSettings(settings,file,decoded);
    const mime=outputMime(file,effective.format);
    const dims=canvasSize(decoded.width,decoded.height,effective.maxWidth,effective.maxHeight);
    const pixels=dims.width*dims.height;

    if(pixels>36000000){
      throw new Error("A imagem é demasiado grande para o processamento seguro neste dispositivo.");
    }

    const canvas=document.createElement("canvas");
    canvas.width=dims.width;
    canvas.height=dims.height;

    const ctx=canvas.getContext("2d",{alpha:mime!=="image/jpeg"});
    if(!ctx) throw new Error("O navegador não disponibilizou o processamento de imagem.");

    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";

    if(mime==="image/jpeg"){
      ctx.fillStyle=effective.background;
      ctx.fillRect(0,0,dims.width,dims.height);
    }

    ctx.drawImage(decoded.source,0,0,dims.width,dims.height);

    let quality=mime==="image/png" ? 1 : effective.quality;
    let blob=await canvasBlob(canvas,mime,quality);

    // Evita produzir um ficheiro maior quando o utilizador pediu compressão automática.
    if(blob.size>=file.size && effective.format==="auto" && mime!=="image/png"){
      const reduced=Math.max(.55,Math.min(quality-.08,.72));
      const smaller=await canvasBlob(canvas,mime,reduced);
      if(smaller.size<blob.size){
        blob=smaller;
        quality=reduced;
      }
    }

    if(blob.size>=file.size && effective.format==="auto"){
      return {
        blob:file,
        mime:file.type||mime,
        width:decoded.width,
        height:decoded.height,
        outputWidth:dims.width,
        outputHeight:dims.height,
        quality:100,
        ms:performance.now()-started,
        noGain:true,
        profile:effective.mode
      };
    }

    return {
      blob,
      mime,
      width:decoded.width,
      height:decoded.height,
      outputWidth:dims.width,
      outputHeight:dims.height,
      quality:Math.round(quality*100),
      ms:performance.now()-started,
      noGain:false,
      profile:effective.mode
    };
  }finally{
    decoded.close();
  }
}

function renderResult(output){
  if(!output) return;

  if(state.result?.url) URL.revokeObjectURL(state.result.url);
  output.url=URL.createObjectURL(output.blob);
  state.result=output;

  $("#result-empty").hidden=true;
  $("#result-loading").hidden=true;

  const img=$("#result-image");
  img.src=output.url;
  img.hidden=false;

  const saving=Math.max(0,Math.round((1-output.blob.size/state.file.size)*100));
  $("#result-size").textContent=bytes(output.blob.size);
  $("#result-meta").textContent=output.noGain ? "Sem ganho adicional" : extension(output.mime)+" · Q"+output.quality;
  $("#saving").textContent=output.noGain ? "0%" : saving+"%";
  $("#dimensions").textContent=output.outputWidth+" × "+output.outputHeight;
  $("#format-label").textContent=extension(output.mime);
  $("#time-label").textContent=timeLabel(output.ms);
  $("#download").disabled=false;
  setStatus("ready");
}

async function applySettings(){
  if(!state.file || state.busy) return;

  const token=++state.token;
  state.busy=true;
  setStatus("busy");
  $("#result-loading").hidden=false;
  $("#result-empty").hidden=true;
  $("#result-image").hidden=true;
  $("#download").disabled=true;
  $("#result-size").textContent="A processar…";

  try{
    const output=await compress(state.file,getSettings(),token);
    if(token!==state.token || !output) return;
    renderResult(output);
  }catch(error){
    if(token!==state.token) return;
    resetResult();
    setStatus("error");
    showToast(error?.message||"Não foi possível comprimir a imagem.", "error");
  }finally{
    if(token===state.token){
      state.busy=false;
      $("#result-loading").hidden=true;
    }
  }
}

function scheduleApply(delay=450){
  clearTimeout(state.timer);
  if(!state.file) return;
  if(!$("#auto-apply").checked) return;
  state.timer=setTimeout(()=>applySettings(),delay);
}

function toggleSettings(open){
  state.settingsOpen=open;
  $("#settings-panel").hidden=!open;
  $("#settings-toggle").setAttribute("aria-expanded",String(open));
  if(open) $("#settings-panel").scrollIntoView({behavior:"smooth",block:"nearest"});
}

function resetSettings(){
  $("#format").value=DEFAULTS.format;
  $("#quality").value=DEFAULTS.quality;
  $("#quality-value").textContent=DEFAULTS.quality+"%";
  $("#max-width").value=DEFAULTS.maxWidth;
  $("#max-height").value=DEFAULTS.maxHeight;
  $("#mode").value=DEFAULTS.mode;
  $("#auto-apply").checked=DEFAULTS.autoApply;
  $("#background").value=DEFAULTS.background;
  scheduleApply(120);
}

function download(){
  const result=state.result;
  if(!result || !state.file) return;
  const base=state.file.name.replace(/\.[^.]+$/,"");
  const ext=extension(result.mime).toLowerCase();
  const link=document.createElement("a");
  link.href=result.url;
  link.download=base+"-nexauren."+ext;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openModal(kind){
  const src=kind==="original" ? state.originalUrl : state.result?.url;
  if(!src) return;
  $("#modal-title").textContent=kind==="original" ? "Imagem original" : "Resultado";
  $("#modal-image").src=src;
  $("#preview-modal").hidden=false;
}

function closeModal(){
  $("#preview-modal").hidden=true;
  $("#modal-image").removeAttribute("src");
}

function handleFile(file){
  if(!file || !file.type.startsWith("image/")){
    showToast("Selecione um ficheiro de imagem válido.", "error");
    return;
  }
  $("#upload").hidden=true;
  $("#workspace").hidden=false;
  setWorkspaceFile(file);
}

function wire(){
  $("#year").textContent=new Date().getFullYear();

  $("#pick").addEventListener("click",()=>$("#file-input").click());

  $("#file-input").addEventListener("change",(event)=>{
    handleFile(event.target.files?.[0]);
    event.target.value="";
  });

  const upload=$("#upload");
  ["dragenter","dragover"].forEach(type=>upload.addEventListener(type,event=>{
    event.preventDefault();
    upload.classList.add("is-over");
  }));
  ["dragleave","drop"].forEach(type=>upload.addEventListener(type,event=>{
    event.preventDefault();
    upload.classList.remove("is-over");
  }));
  upload.addEventListener("drop",event=>{
    handleFile(event.dataTransfer?.files?.[0]);
  });

  window.addEventListener("paste",event=>{
    const file=Array.from(event.clipboardData?.files||[]).find(item=>item.type.startsWith("image/"));
    if(file) handleFile(file);
  });

  $("#replace").addEventListener("click",()=>{
    $("#file-input").click();
  });

  $("#settings-toggle").addEventListener("click",()=>toggleSettings(!state.settingsOpen));
  $("#settings-close").addEventListener("click",()=>toggleSettings(false));

  $("#quality").addEventListener("input",(event)=>{
    $("#quality-value").textContent=event.target.value+"%";
    scheduleApply();
  });

  ["#format","#max-width","#max-height","#mode","#background"].forEach(selector=>{
    $(selector).addEventListener("change",()=>scheduleApply());
  });

  $("#auto-apply").addEventListener("change",()=>{
    if($("#auto-apply").checked) scheduleApply(120);
  });

  $("#apply-settings").addEventListener("click",applySettings);
  $("#reset-settings").addEventListener("click",resetSettings);
  $("#download").addEventListener("click",download);

  $("#open-original").addEventListener("click",()=>openModal("original"));

  $("#modal-close").addEventListener("click",closeModal);
  $("#modal-x").addEventListener("click",closeModal);

  document.addEventListener("keydown",(event)=>{
    if(event.key==="Escape" && !$("#preview-modal").hidden) closeModal();
  });

  setStatus("ready");
  $("#file-input").setAttribute("capture","environment");
}

wire();
