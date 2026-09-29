const $ = (selector) => document.querySelector(selector);

const state = {
  file: null,
  originalSrc: "",
  result: null,
  token: 0,
  timer: null,
  busy: false,
  pending: false,
  settingsOpen: false,
  cameraStream: null,
  cameraFacing: "environment"
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

function mimeLabel(mime){
  if(mime==="image/jpeg") return "JPG";
  if(mime==="image/png") return "PNG";
  if(mime==="image/webp") return "WEBP";
  return (String(mime||"IMG").split("/")[1]||"IMG").toUpperCase();
}

function outputMime(file,format){
  if(format==="jpeg") return "image/jpeg";
  if(format==="png") return "image/png";
  if(format==="webp") return "image/webp";
  return "image/webp";
}

function getSettings(){
  const maxWidth=Math.min(12000,Math.max(256,Number($("#max-width").value)||DEFAULTS.maxWidth));
  const maxHeight=Math.min(12000,Math.max(256,Number($("#max-height").value)||DEFAULTS.maxHeight));
  $("#max-width").value=maxWidth;
  $("#max-height").value=maxHeight;
  return {
    format:$("#format").value,
    quality:Number($("#quality").value)/100,
    maxWidth,
    maxHeight,
    mode:$("#mode").value,
    autoApply:$("#auto-apply").checked,
    background:$("#background").value
  };
}

function effectiveSettings(settings,file,source){
  const out={...settings};

  if(out.mode==="small") out.quality=Math.min(out.quality,.68);
  if(out.mode==="quality") out.quality=Math.max(out.quality,.92);

  if(out.mode==="smart"){
    const large=Math.max(source.width,source.height)>=4500 || source.width*source.height>=12000000;
    if(out.format==="auto") out.format="webp";
    if(large){
      out.maxWidth=Math.min(out.maxWidth,3200);
      out.maxHeight=Math.min(out.maxHeight,3200);
      out.quality=Math.min(out.quality,.84);
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
  state.toastTimer=setTimeout(()=>el.className="nx-toast",2600);
}

function setStatus(status){
  $("#status-dot").className="nx-status-dot "+status;
}

function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error("Não foi possível preparar a pré-visualização."));
    reader.readAsDataURL(blob);
  });
}

async function getImageSource(file){
  if(!file) throw new Error("Nenhuma imagem selecionada.");

  if("createImageBitmap" in window){
    try{
      return await createImageBitmap(file,{imageOrientation:"from-image"});
    }catch{}
    try{
      return await createImageBitmap(file);
    }catch{}
  }

  const url=URL.createObjectURL(file);
  try{
    return await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror=()=>{
        URL.revokeObjectURL(url);
        reject(new Error("O navegador não conseguiu abrir esta imagem."));
      };
      img.src=url;
    });
  }catch{
    const dataUrl=await blobToDataUrl(file);
    return await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("O navegador não conseguiu abrir esta imagem."));
      img.src=dataUrl;
    });
  }
}

function closeSource(source){
  try{source?.close?.();}catch{}
}

function canvasBlob(canvas,mime,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(blob) resolve(blob);
      else reject(new Error("Não foi possível gerar o resultado."));
    },mime,quality);
  });
}

function fitDimensions(width,height,maxWidth,maxHeight){
  const scale=Math.min(1,maxWidth/width,maxHeight/height);
  return {
    width:Math.max(1,Math.round(width*scale)),
    height:Math.max(1,Math.round(height*scale))
  };
}

async function processImage(file,settings,token){
  const started=performance.now();
  const source=await getImageSource(file);

  try{
    if(token!==state.token) return null;

    const effective=effectiveSettings(settings,file,source);
    const mime=outputMime(file,effective.format);
    if(!Number.isFinite(source.width) || !Number.isFinite(source.height) || source.width<1 || source.height<1){
      throw new Error("Não foi possível determinar as dimensões da imagem.");
    }
    const dims=fitDimensions(source.width,source.height,effective.maxWidth,effective.maxHeight);

    if(!Number.isFinite(dims.width) || !Number.isFinite(dims.height) || dims.width<1 || dims.height<1){
      throw new Error("As dimensões escolhidas não são válidas.");
    }
    if(dims.width*dims.height>36000000){
      throw new Error("Esta imagem é grande demais para o processamento seguro neste dispositivo.");
    }

    const canvas=document.createElement("canvas");
    canvas.width=dims.width;
    canvas.height=dims.height;

    const ctx=canvas.getContext("2d",{alpha:mime!=="image/jpeg"}) || canvas.getContext("2d");
    if(!ctx) throw new Error("O navegador não disponibilizou o processamento de imagem.");

    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";

    if(mime==="image/jpeg"){
      ctx.fillStyle=effective.background;
      ctx.fillRect(0,0,dims.width,dims.height);
    }

    ctx.drawImage(source,0,0,dims.width,dims.height);

    let quality=mime==="image/png" ? 1 : effective.quality;
    let blob=await canvasBlob(canvas,mime,quality);

    if(blob.size>=file.size && mime!=="image/png"){
      const fallbackQ=Math.max(.55,Math.min(.72,quality-.08));
      if(fallbackQ<quality){
        const fallback=await canvasBlob(canvas,mime,fallbackQ);
        if(fallback.size<blob.size){
          blob=fallback;
          quality=fallbackQ;
        }
      }
    }

    const noGain=blob.size>=file.size && dims.width===source.width && dims.height===source.height;
    if(noGain && settings.format==="auto"){
      blob=file;
    }

    return {
      blob,
      mime:noGain ? file.type : mime,
      originalWidth:source.width,
      originalHeight:source.height,
      outputWidth:dims.width,
      outputHeight:dims.height,
      quality:noGain ? 100 : Math.round(quality*100),
      ms:performance.now()-started,
      noGain
    };
  }finally{
    closeSource(source);
  }
}

function clearResult(){
  if(state.result?.url) URL.revokeObjectURL(state.result.url);
  state.result=null;
  const img=$("#result-image");
  img.hidden=true;
  img.removeAttribute("src");
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

function setOriginalPreview(src){
  const img=$("#original-image");
  img.onload=()=>{
    $("#original-loading").hidden=true;
    $("#original-dimensions").textContent=img.naturalWidth+" × "+img.naturalHeight;
  };
  img.onerror=()=>{
    $("#original-loading").hidden=true;
    setStatus("error");
    showToast("A pré-visualização original não pôde ser carregada.","error");
  };
  img.src=src;
}

async function renderResult(output){
  if(!output || !state.file) return;

  const tokenAtRender=state.token;
  const objectUrl=URL.createObjectURL(output.blob);
  let dataUrl="";

  if(state.result?.url) URL.revokeObjectURL(state.result.url);
  state.result={...output,url:objectUrl,previewUrl:objectUrl};

  const img=$("#result-image");
  $("#result-empty").hidden=true;
  $("#result-loading").hidden=false;
  $("#download").disabled=true;

  const showMetrics=()=>{
    const saving=Math.max(0,Math.round((1-output.blob.size/state.file.size)*100));
    $("#result-size").textContent=bytes(output.blob.size);
    $("#result-meta").textContent=output.noGain ? "Original preservado" : mimeLabel(output.mime)+" · Q"+output.quality;
    $("#saving").textContent=output.noGain ? "0%" : saving+"%";
    $("#dimensions").textContent=output.outputWidth+" × "+output.outputHeight;
    $("#format-label").textContent=mimeLabel(output.mime);
    $("#time-label").textContent=timeLabel(output.ms);
    $("#download").disabled=false;
    setStatus("ready");
  };

  const finish=()=>{
    if(tokenAtRender!==state.token) return;
    $("#result-loading").hidden=true;
    img.hidden=false;
    showMetrics();
  };

  const fallbackToDataUrl=async()=>{
    try{
      dataUrl=await blobToDataUrl(output.blob);
      state.result.previewUrl=dataUrl;
      img.onload=finish;
      img.onerror=()=>{
        $("#result-loading").hidden=true;
        img.hidden=true;
        showToast("O resultado foi criado, mas o navegador não conseguiu renderizar esta pré-visualização.","error");
      };
      img.src=dataUrl;
      img.hidden=false;
    }catch{
      $("#result-loading").hidden=true;
      img.hidden=true;
      showToast("O resultado foi criado, mas a pré-visualização não pôde ser preparada.","error");
    }
  };

  img.onload=finish;
  img.onerror=()=>fallbackToDataUrl();

  // ObjectURL é o caminho principal; data URL é o fallback para WebView/navegadores problemáticos.
  img.src=objectUrl;
  img.hidden=false;
}

async function runCompression(){
  if(!state.file) return;

  if(state.busy){
    state.pending=true;
    return;
  }

  const token=++state.token;
  state.busy=true;
  state.pending=false;
  setStatus("busy");
  $("#result-loading").hidden=false;
  $("#download").disabled=!state.result?.blob;
  $("#result-size").textContent="A atualizar…";

  try{
    const output=await processImage(state.file,getSettings(),token);
    if(token===state.token && output) await renderResult(output);
  }catch(error){
    if(token===state.token){
      $("#result-loading").hidden=true;
      if(state.result?.blob){
        $("#result-empty").hidden=true;
        $("#result-image").hidden=false;
        $("#download").disabled=false;
        $("#result-size").textContent=bytes(state.result.blob.size);
        $("#result-meta").textContent=state.result.noGain ? "Último resultado válido" : mimeLabel(state.result.mime)+" · Q"+state.result.quality;
        $("#saving").textContent=state.result.noGain ? "0%" : Math.max(0,Math.round((1-state.result.blob.size/state.file.size)*100))+"%";
        $("#dimensions").textContent=state.result.outputWidth+" × "+state.result.outputHeight;
        $("#format-label").textContent=mimeLabel(state.result.mime);
        $("#time-label").textContent=timeLabel(state.result.ms);
      }
      setStatus("error");
      showToast(error?.message||"Não foi possível atualizar estas definições. O resultado anterior foi mantido.","error");
    }
  }finally{
    if(token===state.token){
      state.busy=false;
      $("#result-loading").hidden=true;
      if(state.pending){
        state.pending=false;
        queueMicrotask(()=>runCompression());
      }
    }
  }
}

function scheduleCompression(delay=420){
  clearTimeout(state.timer);
  if(!state.file || !$("#auto-apply").checked) return;
  state.timer=setTimeout(runCompression,delay);
}

function openSettings(){
  state.settingsOpen=true;
  $("#settings-screen").hidden=false;
  document.body.classList.add("nx-lock");
  $("#settings-back").focus();
}

function closeSettings(){
  state.settingsOpen=false;
  $("#settings-screen").hidden=true;
  document.body.classList.remove("nx-lock");
}

function resetSettings(){
  $("#mode").value=DEFAULTS.mode;
  $("#format").value=DEFAULTS.format;
  $("#quality").value=DEFAULTS.quality;
  $("#quality-value").textContent=DEFAULTS.quality+"%";
  $("#max-width").value=DEFAULTS.maxWidth;
  $("#max-height").value=DEFAULTS.maxHeight;
  $("#background").value=DEFAULTS.background;
  $("#auto-apply").checked=DEFAULTS.autoApply;
  scheduleCompression(100);
}

function download(){
  if(!state.result?.blob || !state.file) return;
  const link=document.createElement("a");
  link.href=state.result.url;
  const base=state.file.name.replace(/\.[^.]+$/,"");
  link.download=base+"-nexauren."+mimeLabel(state.result.mime).toLowerCase();
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openPreview(kind){
  const src=kind==="original" ? state.originalSrc : state.result?.previewUrl;
  if(!src) return;
  $("#modal-title").textContent=kind==="original" ? "Imagem original" : "Resultado";
  $("#modal-image").src=src;
  $("#preview-modal").hidden=false;
  document.body.classList.add("nx-lock");
}

function closePreview(){
  $("#preview-modal").hidden=true;
  $("#modal-image").removeAttribute("src");
  if(!state.settingsOpen && $("#camera-screen").hidden) document.body.classList.remove("nx-lock");
}

function showWorkspace(file){
  if(state.originalSrc) URL.revokeObjectURL(state.originalSrc);
  clearResult();

  state.file=file;
  state.originalSrc=URL.createObjectURL(file);
  $("#upload").hidden=true;
  $("#workspace").hidden=false;
  $("#file-name").textContent=file.name;
  $("#file-info").textContent=mimeLabel(file.type)+" · "+bytes(file.size);
  $("#original-size").textContent=bytes(file.size);
  $("#original-loading").hidden=false;
  setStatus("busy");
  setOriginalPreview(state.originalSrc);
}

function handleGalleryFile(file){
  if(!file || !String(file.type||"").startsWith("image/")){
    showToast("Escolha uma imagem válida.","error");
    return;
  }
  showWorkspace(file);
  scheduleCompression(120);
}

function stopCamera(){
  if(state.cameraStream){
    state.cameraStream.getTracks().forEach(track=>track.stop());
    state.cameraStream=null;
  }
  const video=$("#camera-video");
  video.srcObject=null;
  $("#camera-capture").disabled=true;
}

async function openCamera(){
  $("#camera-screen").hidden=false;
  document.body.classList.add("nx-lock");
  $("#camera-status").textContent="A INICIAR";
  $("#camera-hint").textContent="Solicitando acesso à câmera…";

  if(!navigator.mediaDevices?.getUserMedia){
    $("#camera-status").textContent="INDISPONÍVEL";
    $("#camera-hint").textContent="Este navegador não disponibiliza câmera direta.";
     showToast("A câmera direta não está disponível neste navegador. Use a galeria.", "error");
    return;
  }

  try{
    stopCamera();
    state.cameraStream=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{facingMode:{ideal:state.cameraFacing},width:{ideal:1920},height:{ideal:1080}}
    });
    const video=$("#camera-video");
    video.srcObject=state.cameraStream;
    await video.play().catch(()=>{});
    $("#camera-status").textContent="PRONTA";
    $("#camera-hint").textContent="Centralize a imagem e toque no botão para fotografar.";
    $("#camera-capture").disabled=false;
  }catch(error){
    $("#camera-status").textContent="SEM ACESSO";
    $("#camera-hint").textContent="Autorize a câmera ou escolha uma imagem da galeria.";
    showToast(error?.name==="NotAllowedError" ? "A câmera foi bloqueada. Permita o acesso nas definições do navegador." : "Não foi possível iniciar a câmera.","error");
  }
}

function closeCamera(){
  stopCamera();
  $("#camera-screen").hidden=true;
  if(!state.settingsOpen && $("#preview-modal").hidden) document.body.classList.remove("nx-lock");
}

async function captureCamera(){
  const video=$("#camera-video");
  if(!state.cameraStream || !video.videoWidth || !video.videoHeight) return;

  const canvas=$("#camera-canvas");
  const maxSide=4096;
  const scale=Math.min(1,maxSide/video.videoWidth,maxSide/video.videoHeight);
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));

  const ctx=canvas.getContext("2d",{alpha:false});
  ctx.drawImage(video,0,0,canvas.width,canvas.height);

  const blob=await new Promise((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(new Error("Não foi possível capturar a foto.")),"image/jpeg",.94);
  });

  const file=new File([blob],"nexauren-camera-"+Date.now()+".jpg",{type:"image/jpeg",lastModified:Date.now()});
  closeCamera();
  handleGalleryFile(file);
}

function switchCamera(){
  state.cameraFacing=state.cameraFacing==="environment" ? "user" : "environment";
  openCamera();
}

function wire(){
  $("#year").textContent=new Date().getFullYear();

  $("#camera-open").addEventListener("click",openCamera);
  $("#gallery-open").addEventListener("click",()=>$("#file-input").click());
  $("#camera-gallery").addEventListener("click",()=>$("#file-input").click());
  $("#file-input").addEventListener("change",event=>{
    handleGalleryFile(event.target.files?.[0]);
    event.target.value="";
  });

  $("#replace").addEventListener("click",openCamera);

  const upload=$("#upload");
  ["dragenter","dragover"].forEach(type=>upload.addEventListener(type,event=>{
    event.preventDefault();
    upload.classList.add("is-over");
  }));
  ["dragleave","drop"].forEach(type=>upload.addEventListener(type,event=>{
    event.preventDefault();
    upload.classList.remove("is-over");
  }));
  upload.addEventListener("drop",event=>handleGalleryFile(event.dataTransfer?.files?.[0]));

  window.addEventListener("paste",event=>{
    const file=Array.from(event.clipboardData?.files||[]).find(f=>String(f.type||"").startsWith("image/"));
    if(file) handleGalleryFile(file);
  });

  $("#settings-toggle").addEventListener("click",openSettings);
  $("#settings-back").addEventListener("click",closeSettings);

  $("#quality").addEventListener("input",event=>{
    $("#quality-value").textContent=event.target.value+"%";
    scheduleCompression();
  });

  ["#mode","#format","#max-width","#max-height","#background"].forEach(id=>{
    $(id).addEventListener("input",()=>scheduleCompression());
    $(id).addEventListener("change",()=>scheduleCompression());
  });

  $("#auto-apply").addEventListener("change",()=>scheduleCompression(100));

  $("#apply-settings").addEventListener("click",()=>{
    closeSettings();
    runCompression();
  });

  $("#reset-settings").addEventListener("click",resetSettings);
  $("#download").addEventListener("click",download);
  $("#open-original").addEventListener("click",()=>openPreview("original"));

  $("#modal-close").addEventListener("click",closePreview);
  $("#modal-x").addEventListener("click",closePreview);

  $("#camera-close").addEventListener("click",closeCamera);
  $("#camera-capture").addEventListener("click",captureCamera);
  $("#camera-switch").addEventListener("click",switchCamera);

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
      if(!$("#camera-screen").hidden){closeCamera();return;}
      if(!$("#preview-modal").hidden){closePreview();return;}
      if(!$("#settings-screen").hidden){closeSettings();}
    }
    if(event.key===" " && !$("#camera-screen").hidden && !$("#camera-capture").disabled){
      event.preventDefault();
      captureCamera();
    }
  });

  $("#settings-screen").addEventListener("click",event=>{
    if(event.target===$("#settings-screen")) closeSettings();
  });

  $("#camera-screen").addEventListener("click",event=>{
    if(event.target===$("#camera-screen")) closeCamera();
  });

  setStatus("ready");
}

wire();
