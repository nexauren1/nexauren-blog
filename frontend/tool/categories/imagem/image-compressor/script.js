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
  cameraFacing: "environment",
  toastTimer: null
};

const DEFAULTS = {
  format: "auto",
  quality: 84,
  maxWidth: 2560,
  maxHeight: 2560,
  mode: "smart",
  autoApply: false,
  targetSizeKB: "",
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

function outputMime(format){
  if(format==="jpeg") return "image/jpeg";
  if(format==="png") return "image/png";
  if(format==="webp") return "image/webp";
  return "image/webp";
}

function getSettings(){
  const maxWidth=Math.min(12000,Math.max(256,Number($("#max-width").value)||DEFAULTS.maxWidth));
  const maxHeight=Math.min(12000,Math.max(256,Number($("#max-height").value)||DEFAULTS.maxHeight));
  const rawTarget=String($("#target-size")?.value||"").trim();
  const targetSizeKB=rawTarget ? Math.min(100000,Math.max(10,Number(rawTarget))) : "";
  $("#max-width").value=maxWidth;
  $("#max-height").value=maxHeight;
  if($("#target-size")) $("#target-size").value=targetSizeKB==="" ? "" : targetSizeKB;
  return {
    format:$("#format").value,
    quality:Number($("#quality").value)/100,
    maxWidth,
    maxHeight,
    mode:$("#mode").value,
    autoApply:$("#auto-apply").checked,
    targetSizeKB,
    background:$("#background").value
  };
}

function effectiveSettings(settings,source){
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
  if(!el) return;
  el.textContent=message;
  el.className="nx-toast show "+type;
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>el.className="nx-toast",3000);
}

function setStatus(status){
  const dot=$("#status-dot");
  if(dot) dot.className="nx-status-dot "+status;
}

async function blobToDataUrl(blob){
  if(!(blob instanceof Blob) || blob.size<=0){
    throw new Error("Could not prepare the image preview.");
  }

  try{
    if(typeof FileReader!=="undefined"){
      const result=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result));
        reader.onerror=()=>reject(new Error("reader"));
        reader.readAsDataURL(blob);
      });
      if(result && result.startsWith("data:")) return result;
    }
  }catch{}

  if(typeof blob.arrayBuffer==="function" && typeof btoa==="function"){
    const buffer=await blob.arrayBuffer();
    const bytesArray=new Uint8Array(buffer);
    let binary="";
    const chunk=0x8000;
    for(let i=0;i<bytesArray.length;i+=chunk){
      binary+=String.fromCharCode(...bytesArray.subarray(i,i+chunk));
    }
    return "data:"+(blob.type||"image/jpeg")+";base64,"+btoa(binary);
  }

  throw new Error("Could not prepare the image preview.");
}

async function getImageSource(file){
  if(!file) throw new Error("No image selected.");

  if(state.file===file && state.originalSrc){
    return await new Promise((resolve,reject)=>{
      const img=new Image();
      img.decoding="async";
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("The browser could not open this image."));
      img.src=state.originalSrc;
    });
  }

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
      img.decoding="async";
      img.onload=()=>{
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror=()=>{
        URL.revokeObjectURL(url);
        reject(new Error("The browser could not open this image."));
      };
      img.src=url;
    });
  }catch{
    const dataUrl=await blobToDataUrl(file);
    return await new Promise((resolve,reject)=>{
      const img=new Image();
      img.decoding="async";
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("The browser could not decode this image."));
      img.src=dataUrl;
    });
  }
}

function closeSource(source){
  try{source?.close?.()}catch{}
}

function canvasBlob(canvas,mime,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(blob) resolve(blob);
      else reject(new Error("Could not create the compressed image."));
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

function drawCanvas(source,width,height,mime,background){
  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:mime!=="image/jpeg"}) || canvas.getContext("2d");
  if(!ctx) throw new Error("The browser could not start image processing.");

  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";

  if(mime==="image/jpeg"){
    ctx.fillStyle=background;
    ctx.fillRect(0,0,width,height);
  }

  ctx.drawImage(source,0,0,width,height);
  return canvas;
}

async function encodeForTarget(source,width,height,effective,mime,targetBytes){
  let currentWidth=width;
  let currentHeight=height;
  let lastBlob=null;
  let lastQuality=mime==="image/png" ? 1 : effective.quality;
  let targetReached=false;

  for(let dimensionPass=0;dimensionPass<7;dimensionPass++){
    const canvas=drawCanvas(source,currentWidth,currentHeight,mime,effective.background);

    if(mime==="image/png"){
      const png=await canvasBlob(canvas,mime,1);
      lastBlob=png;
      lastQuality=1;
      targetReached=png.size<=targetBytes;
    }else{
      let low=.08;
      let high=Math.max(.15,Math.min(1,effective.quality));
      let smallest=await canvasBlob(canvas,mime,low);
      lastBlob=smallest;
      lastQuality=low;

      if(smallest.size<=targetBytes){
        let best=smallest;
        let bestQ=low;

        for(let i=0;i<8;i++){
          const q=(low+high)/2;
          const candidate=await canvasBlob(canvas,mime,q);

          if(candidate.size<=targetBytes){
            best=candidate;
            bestQ=q;
            low=q;
          }else{
            high=q;
          }
        }

        lastBlob=best;
        lastQuality=bestQ;
        targetReached=true;
      }else{
        targetReached=false;
      }
    }

    if(targetReached || currentWidth<=320 || currentHeight<=320) break;

    const ratio=Math.sqrt(targetBytes/Math.max(lastBlob.size,targetBytes))*0.9;
    const scale=Math.min(.9,Math.max(.45,ratio));
    const nextWidth=Math.max(320,Math.round(currentWidth*scale));
    const nextHeight=Math.max(320,Math.round(currentHeight*scale));

    if(nextWidth>=currentWidth && nextHeight>=currentHeight) break;

    currentWidth=nextWidth;
    currentHeight=nextHeight;
  }

  return {
    blob:lastBlob,
    quality:Math.round(lastQuality*100),
    outputWidth:currentWidth,
    outputHeight:currentHeight,
    targetReached
  };
}

async function processImage(file,settings,token){
  const started=performance.now();
  const source=await getImageSource(file);

  try{
    if(token!==state.token) return null;

    const effective=effectiveSettings(settings,source);
    const mime=outputMime(effective.format);

    if(!Number.isFinite(source.width) || !Number.isFinite(source.height) || source.width<1 || source.height<1){
      throw new Error("Could not determine the image dimensions.");
    }

    const dims=fitDimensions(source.width,source.height,effective.maxWidth,effective.maxHeight);

    if(!Number.isFinite(dims.width) || !Number.isFinite(dims.height) || dims.width<1 || dims.height<1){
      throw new Error("The selected dimensions are not valid.");
    }

    if(dims.width*dims.height>36000000){
      throw new Error("This image is too large for safe processing on this device. Reduce the maximum width or height.");
    }

    const targetBytes=Number(effective.targetSizeKB)>0 ? Number(effective.targetSizeKB)*1024 : 0;
    let blob;
    let quality=mime==="image/png" ? 100 : Math.round(effective.quality*100);
    let outputWidth=dims.width;
    let outputHeight=dims.height;
    let targetReached=false;

    if(targetBytes>0){
      const targetResult=await encodeForTarget(source,dims.width,dims.height,effective,mime,targetBytes);
      blob=targetResult.blob;
      quality=targetResult.quality;
      outputWidth=targetResult.outputWidth;
      outputHeight=targetResult.outputHeight;
      targetReached=targetResult.targetReached;
    }else{
      const canvas=drawCanvas(source,dims.width,dims.height,mime,effective.background);
      blob=await canvasBlob(canvas,mime,mime==="image/png" ? 1 : effective.quality);

      if(blob.size>=file.size && mime!=="image/png"){
        const fallbackQ=Math.max(.45,Math.min(.72,effective.quality-.08));
        if(fallbackQ<effective.quality){
          const fallback=await canvasBlob(canvas,mime,fallbackQ);
          if(fallback.size<blob.size){
            blob=fallback;
            quality=Math.round(fallbackQ*100);
          }
        }
      }
    }

    if(!blob || blob.size<=0){
      throw new Error("The compressed image is empty.");
    }

    const noGain=targetBytes<=0 && blob.size>=file.size && outputWidth===source.width && outputHeight===source.height;
    if(noGain && settings.format==="auto"){
      blob=file;
    }

    return {
      blob,
      mime:noGain ? file.type : mime,
      originalWidth:source.width,
      originalHeight:source.height,
      outputWidth,
      outputHeight,
      quality:noGain ? 100 : quality,
      targetBytes,
      targetReached:targetBytes<=0 ? false : targetReached || blob.size<=targetBytes,
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
  $("#result-size").textContent="Waiting";
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
    showToast("The original image preview could not be loaded.","error");
  };
  img.src=src;
}

async function renderResult(output){
  if(!output || !state.file) return false;

  const tokenAtRender=state.token;
  const previous=state.result;
  let objectUrl="";
  let previewUrl="";
  let committed=false;

  try{
    if(!(output.blob instanceof Blob) || output.blob.size<=0){
      throw new Error("The generated result is empty.");
    }

    objectUrl=URL.createObjectURL(output.blob);
    previewUrl=objectUrl;

    const img=$("#result-image");
    const saving=Math.max(0,Math.round((1-output.blob.size/state.file.size)*100));

    const loadCandidate=src=>new Promise((resolve,reject)=>{
      const probe=new Image();
      probe.onload=()=>resolve(probe);
      probe.onerror=()=>reject(new Error("preview"));
      probe.src=src;
    });

    try{
      await loadCandidate(objectUrl);
    }catch{
      const dataUrl=await blobToDataUrl(output.blob);
      previewUrl=dataUrl;
      await loadCandidate(dataUrl);
    }

    if(tokenAtRender!==state.token || !state.file){
      URL.revokeObjectURL(objectUrl);
      return false;
    }

    state.result={...output,url:objectUrl,previewUrl};
    committed=true;

    if(previous?.url && previous.url!==objectUrl){
      URL.revokeObjectURL(previous.url);
    }

    img.src=previewUrl;
    img.hidden=false;
    $("#result-empty").hidden=true;
    $("#result-loading").hidden=true;
    $("#result-size").textContent=bytes(output.blob.size);

    let meta=output.noGain ? "Original preserved" : mimeLabel(output.mime)+" · Q"+output.quality;
    if(output.targetBytes>0){
      const targetLabel=bytes(output.targetBytes);
      meta+=(output.targetReached ? " · Target "+targetLabel : " · Target not reached: "+targetLabel);
    }
    $("#result-meta").textContent=meta;

    $("#saving").textContent=output.noGain ? "0%" : saving+"%";
    $("#dimensions").textContent=output.outputWidth+" × "+output.outputHeight;
    $("#format-label").textContent=mimeLabel(output.mime);
    $("#time-label").textContent=timeLabel(output.ms);
    $("#download").disabled=false;
    setStatus("ready");
    return true;
  }catch(error){
    if(objectUrl && !committed) URL.revokeObjectURL(objectUrl);

    $("#result-loading").hidden=true;

    if(previous?.blob && state.result===previous){
      $("#result-empty").hidden=true;
      $("#result-image").hidden=false;
      $("#download").disabled=false;
      $("#result-size").textContent=bytes(previous.blob.size);
      $("#result-meta").textContent=previous.noGain ? "Last valid result" : mimeLabel(previous.mime)+" · Q"+previous.quality;
      $("#saving").textContent=previous.noGain ? "0%" : Math.max(0,Math.round((1-previous.blob.size/state.file.size)*100))+"%";
      $("#dimensions").textContent=previous.outputWidth+" × "+previous.outputHeight;
      $("#format-label").textContent=mimeLabel(previous.mime);
      $("#time-label").textContent=timeLabel(previous.ms);
      setStatus("ready");
      return false;
    }

    $("#result-image").hidden=true;
    $("#result-empty").hidden=false;
    $("#download").disabled=true;
    setStatus("error");
    showToast(error?.message==="preview"
      ? "The result was created, but its preview could not be loaded."
      : (error?.message || "Could not prepare the image preview."),"error");
    return false;
  }
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
  $("#result-size").textContent="Updating…";

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
        $("#result-meta").textContent=state.result.noGain ? "Last valid result" : mimeLabel(state.result.mime)+" · Q"+state.result.quality;
        $("#saving").textContent=state.result.noGain ? "0%" : Math.max(0,Math.round((1-state.result.blob.size/state.file.size)*100))+"%";
        $("#dimensions").textContent=state.result.outputWidth+" × "+state.result.outputHeight;
        $("#format-label").textContent=mimeLabel(state.result.mime);
        $("#time-label").textContent=timeLabel(state.result.ms);
      }
      setStatus("error");
      showToast(error?.message||"Could not update these settings. The previous result was kept.","error");
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
  $("#target-size").value=DEFAULTS.targetSizeKB;
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
  $("#modal-title").textContent=kind==="original" ? "Original image" : "Compressed result";
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
  clearTimeout(state.timer);
  state.token++;
  state.pending=false;
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
    showToast("Choose a valid image.","error");
    return;
  }
  showWorkspace(file);
  runCompression();
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
  $("#camera-status").textContent="STARTING";
  $("#camera-hint").textContent="Requesting camera access…";

  if(!navigator.mediaDevices?.getUserMedia){
    $("#camera-status").textContent="UNAVAILABLE";
    $("#camera-hint").textContent="This browser does not provide direct camera access.";
    showToast("Direct camera access is not available. Use your gallery.","error");
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
    $("#camera-status").textContent="READY";
    $("#camera-hint").textContent="Center the image and tap the shutter button.";
    $("#camera-capture").disabled=false;
  }catch(error){
    $("#camera-status").textContent="NO ACCESS";
    $("#camera-hint").textContent="Allow camera access or choose an image from your gallery.";
    showToast(error?.name==="NotAllowedError" ? "Camera access was blocked. Allow it in your browser settings." : "Could not start the camera.","error");
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
  if(!ctx) return;
  ctx.drawImage(video,0,0,canvas.width,canvas.height);

  const blob=await new Promise((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not capture the photo.")),"image/jpeg",.94);
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

  $("#replace").addEventListener("click",()=>openCamera());

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

  ["#mode","#format","#max-width","#max-height","#background","#target-size"].forEach(id=>{
    $(id).addEventListener("input",()=>scheduleCompression());
    $(id).addEventListener("change",()=>scheduleCompression());
  });

  document.querySelectorAll("[data-target-kb]").forEach(button=>{
    button.addEventListener("click",()=>{
      $("#target-size").value=button.dataset.targetKb||"";
      if(button.dataset.targetKb){
        const format=$("#format");
        if(format.value==="png") format.value="webp";
      }
      runCompression();
    });
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
