(()=>{"use strict";
const $=s=>document.querySelector(s);
const beforeInput=$("#before-input"),afterInput=$("#after-input");
const beforeUpload=$("#before-upload"),afterUpload=$("#after-upload");
const beforeImage=$("#before-image"),afterImage=$("#after-image"),beforeClip=$("#before-clip");
const beforeThumb=$("#before-thumb"),afterThumb=$("#after-thumb"),stage=$("#stage"),empty=$("#stage-empty"),divider=$("#divider");
const slider=$("#slider"),sliderSide=$("#slider-side"),sliderValue=$("#slider-value"),positionLabel=$("#position-label");
const labelBefore=$("#label-before"),labelAfter=$("#label-after"),status=$("#status"),clear=$("#clear");
const download=$("#download"),downloadSide=$("#download-side"),format=$("#format"),quality=$("#quality"),qualityValue=$("#quality-value"),qualityField=$("#quality-field");
let beforeFile=null,afterFile=null,beforeUrl=null,afterUrl=null,beforeImageObj=null,afterImageObj=null;

function readImage(file){
  return new Promise((resolve,reject)=>{
    if(!file)return reject(new Error("Ficheiro inválido."));
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Não foi possível ler esta imagem."))};
    img.src=url;
  });
}
function syncClip(){
  const p=Number(slider.value);
  beforeClip.style.width=p+"%";
  divider.style.left="calc("+p+"% - 1px)";
  beforeClip.style.setProperty("--split",p+"%");
  sliderSide.value=String(p);slider.value=String(p);
  sliderValue.textContent=p+"%";positionLabel.textContent=p+"%";
  labelBefore.style.opacity=p<8?"0":"1";labelAfter.style.opacity=p>92?"0":"1";
}
function setPreviewReady(){
  stage.classList.add("ad-stage-ready");
  empty.hidden=true;beforeClip.hidden=false;afterImage.hidden=false;divider.hidden=false;labelBefore.hidden=false;labelAfter.hidden=false;
  syncClip();
}
function updateStatus(){
  if(beforeFile&&afterFile){status.textContent="As duas fotos estão prontas. Arraste o divisor para comparar.";status.className="ad-status ready";download.disabled=false;downloadSide.disabled=false;clear.disabled=false}
  else {status.textContent="Adicione uma foto em cada lado para começar.";status.className="ad-status";download.disabled=true;downloadSide.disabled=true;clear.disabled=!(beforeFile||afterFile)}
}
function setFile(side,file){
  if(!file)return;
  if(!file.type.startsWith("image/")){status.textContent="Escolha um ficheiro de imagem.";status.className="ad-status error";return}
  readImage(file).then(img=>{
    if(side==="before"){if(beforeUrl)URL.revokeObjectURL(beforeUrl);beforeFile=file;beforeImageObj=img;beforeUrl=URL.createObjectURL(file);beforeImage.src=beforeUrl;beforeThumb.src=beforeUrl;beforeThumb.hidden=false;beforeThumb.className="ad-upload-thumb";beforeUpload.classList.add("has-file")}
    else {if(afterUrl)URL.revokeObjectURL(afterUrl);afterFile=file;afterImageObj=img;afterUrl=URL.createObjectURL(file);afterImage.src=afterUrl;afterThumb.src=afterUrl;afterThumb.hidden=false;afterThumb.className="ad-upload-thumb";afterUpload.classList.add("has-file")}
    if(beforeFile&&afterFile)setPreviewReady();
    updateStatus();
  }).catch(()=>{status.textContent="Não foi possível preparar uma das imagens.";status.className="ad-status error"});
}
beforeInput.addEventListener("change",e=>setFile("before",e.target.files?.[0]));
afterInput.addEventListener("change",e=>setFile("after",e.target.files?.[0]));
slider.addEventListener("input",()=>{sliderSide.value=slider.value;syncClip()});
sliderSide.addEventListener("input",()=>{slider.value=sliderSide.value;syncClip()});
quality.addEventListener("input",()=>qualityValue.textContent=quality.value);
format.addEventListener("change",()=>{qualityField.hidden=format.value==="image/png"});
function clearAll(){
  if(beforeUrl)URL.revokeObjectURL(beforeUrl);if(afterUrl)URL.revokeObjectURL(afterUrl);
  beforeUrl=afterUrl=null;beforeFile=afterFile=null;beforeImageObj=afterImageObj=null;
  beforeInput.value="";afterInput.value="";beforeThumb.hidden=true;afterThumb.hidden=true;
  beforeUpload.classList.remove("has-file");afterUpload.classList.remove("has-file");
  beforeClip.hidden=true;afterImage.hidden=true;divider.hidden=true;labelBefore.hidden=true;labelAfter.hidden=true;empty.hidden=false;
  download.disabled=true;downloadSide.disabled=true;clear.disabled=true;stage.classList.remove("ad-stage-ready");status.textContent="Adicione uma foto em cada lado para começar.";status.className="ad-status";
}
clear.addEventListener("click",clearAll);
function fitContain(ctx,img,x,y,w,h){
  const r=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*r,dh=img.naturalHeight*r;
  ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function extFor(m){return m==="image/jpeg"?"jpg":m==="image/webp"?"webp":"png"}
function exportCanvas(canvas,name){
  const type=format.value,q=Number(quality.value)/100;
  canvas.toBlob(blob=>{
    if(!blob){status.textContent="Falha ao preparar o ficheiro.";status.className="ad-status error";return}
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name+"."+extFor(type);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  },type,q);
}
function drawCombined(sideBySide){
  if(!beforeImageObj||!afterImageObj)return;
  const maxH=Math.max(beforeImageObj.naturalHeight,afterImageObj.naturalHeight);
  const eachW=sideBySide?Math.max(beforeImageObj.naturalWidth,afterImageObj.naturalWidth):Math.max(beforeImageObj.naturalWidth,afterImageObj.naturalWidth);
  const scale=Math.min(1,2200/Math.max(sideBySide?eachW*2:eachW,maxH));
  const w=Math.max(1,Math.round(eachW*(sideBySide?2:1)*scale)),h=Math.max(1,Math.round(maxH*scale));
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");ctx.fillStyle="#0b0f18";ctx.fillRect(0,0,w,h);
  if(sideBySide){fitContain(ctx,beforeImageObj,0,0,w/2,h);fitContain(ctx,afterImageObj,w/2,0,w/2,h)}
  else {
    fitContain(ctx,afterImageObj,0,0,w,h);
    ctx.save();ctx.beginPath();ctx.rect(0,0,w*Number(slider.value)/100,h);ctx.clip();fitContain(ctx,beforeImageObj,0,0,w,h);ctx.restore();
    ctx.fillStyle="#ffffff";const x=w*Number(slider.value)/100;ctx.fillRect(Math.max(0,x-1),0,2,h);
  }
  exportCanvas(c,sideBySide?"nexauren-antes-e-depois-lado-a-lado":"nexauren-antes-e-depois");
}
download.addEventListener("click",()=>drawCombined(false));
downloadSide.addEventListener("click",()=>drawCombined(true));
format.dispatchEvent(new Event("change"));
syncClip();updateStatus();
})();