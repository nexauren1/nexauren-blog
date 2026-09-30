const $=s=>document.querySelector(s);
const e={
file:$("#file"),cameraFile:$("#cameraFile"),choose:$("#choose"),camera:$("#camera"),stage:$("#stage"),preview:$("#preview"),frame:$("#cropFrame"),stageHelp:$("#stageHelp"),
ratio:$("#ratio"),ratioW:$("#ratioW"),ratioH:$("#ratioH"),customRatioField:$("#customRatioField"),rot:$("#rot"),flip:$("#flip"),fmt:$("#fmt"),q:$("#q"),qout:$("#qout"),posx:$("#posx"),posy:$("#posy"),xout:$("#xout"),yout:$("#yout"),lockPosition:$("#lockPosition"),
run:$("#run"),download:$("#download"),copy:$("#copy"),reset:$("#reset"),status:$("#status"),spinner:$("#spinner"),resultSection:$("#resultSection"),output:$("#output"),
dimensions:$("#dimensions"),ratioOut:$("#ratioOut"),sizeOut:$("#sizeOut"),resultFormat:$("#resultFormat"),resultPosition:$("#resultPosition"),resultTransform:$("#resultTransform"),
statusImage:$("#statusImage"),ratioStat:$("#ratioStat"),cropStat:$("#cropStat"),formatStat:$("#formatStat")
};
let source=null,blob=null,sourceUrl="",outputUrl="",dragging=false,dragStartX=0,dragStartY=0,startX=50,startY=50;

const bytes=n=>{if(!Number.isFinite(n))return"—";const u=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<3){v/=1024;i++}return v.toFixed(v>=100?0:v>=10?1:2)+" "+u[i]};
const revoke=u=>{if(u)try{URL.revokeObjectURL(u)}catch{}};
const status=(t,error=false)=>{e.status.textContent=t;e.status.className="status"+(error?" error":"")};
const ratioValue=()=>e.ratio.value==="custom"?(Math.max(1,Number(e.ratioW.value)||1)/Math.max(1,Number(e.ratioH.value)||1)):e.ratio.value==="free"?null:Number(e.ratio.value);

function dimensions(){return source?[source.width||source.naturalWidth||0,source.height||source.naturalHeight||0]:[0,0]};
function cropBox(W,H){
  const r=ratioValue(); if(!r)return{x:0,y:0,w:W,h:H};
  let w=W,h=H;
  if(W/H>r)w=Math.max(1,Math.round(H*r));else h=Math.max(1,Math.round(W/r));
  const maxX=Math.max(0,W-w),maxY=Math.max(0,H-h);
  const x=Math.round(maxX*(Number(e.posx.value)/100)),y=Math.round(maxY*(Number(e.posy.value)/100));
  return{x,y,w,h};
}
function labelRatio(w,h){return w&&h?(w/h).toFixed(2)+":1":"—"}
function updateStats(){
  const [W,H]=dimensions(),box=cropBox(W,H);
  e.xout.textContent=e.posx.value+"%";e.yout.textContent=e.posy.value+"%";e.qout.textContent=e.fmt.value==="image/png"?"Lossless":e.q.value+"%";
  e.ratioStat.textContent=e.ratio.value==="custom"?e.ratioW.value+":"+e.ratioH.value:e.ratio.options[e.ratio.selectedIndex]?.textContent.split(" ")[0]||"Free";
  e.cropStat.textContent=W&&H?box.w+" × "+box.h:"—";e.formatStat.textContent=e.fmt.value==="image/jpeg"?"JPG":e.fmt.value.split("/").pop().toUpperCase();
}
function setBusy(on){
  e.spinner.classList.toggle("on",on);e.spinner.setAttribute("aria-hidden",on?"false":"true");e.run.disabled=on||!source;e.run.textContent=on?"Generating…":"Generate crop";
  e.download.disabled=on||!blob;e.copy.disabled=on||!blob;e.reset.disabled=on||!source;
}
function displayFrame(){
  if(!source){e.frame.style.display="none";return}
  const rect=e.preview.getBoundingClientRect(),stageRect=e.stage.getBoundingClientRect();
  if(!rect.width||!rect.height){e.frame.style.display="none";return}
  const [W,H]=dimensions(),box=cropBox(W,H),sx=rect.width/W,sy=rect.height/H;
  e.frame.style.display="block";
  e.frame.style.left=(rect.left-stageRect.left+box.x*sx)+"px";
  e.frame.style.top=(rect.top-stageRect.top+box.y*sy)+"px";
  e.frame.style.width=(box.w*sx)+"px";
  e.frame.style.height=(box.h*sy)+"px";
}
function refreshPreview(){
  updateStats();displayFrame();
  if(source){e.stageHelp.textContent="Drag inside the image to position the crop";e.statusImage.textContent=source.naturalWidth+" × "+source.naturalHeight}else{e.stageHelp.textContent="Choose an image to begin";e.statusImage.textContent="No image"}
}
async function loadFile(file){
  if(!file)return;
  try{
    if(!file.type.startsWith("image/")&&!/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(file.name))throw new Error("Please choose a supported image file.");
    revoke(sourceUrl);revoke(outputUrl);sourceUrl=URL.createObjectURL(file);outputUrl="";blob=null;e.output.removeAttribute("src");e.resultSection.classList.add("hidden");
    source=await NexaurenImage.loadImage(file);
    const [W,H]=dimensions();if(!W||!H)throw new Error("Could not read the image dimensions.");
    e.posx.value="50";e.posy.value="50";startX=50;startY=50;e.run.disabled=false;e.reset.disabled=false;status("Image ready. Position the crop and generate the result.");
    requestAnimationFrame(refreshPreview);
  }catch(err){source=null;status(err?.message||"Could not load this image.",true);refreshPreview()}
}
async function generate(){
  if(!source){status("Choose an image first.",true);return}
  setBusy(true);status("Preparing crop…");
  try{
    const [iw,ih]=dimensions(),box=cropBox(iw,ih),r=Number(e.rot.value),swap=r===90||r===270;
    const outW=swap?box.h:box.w,outH=swap?box.w:box.h;
    if(outW*outH>32000000)throw new Error("The selected crop is too large for this device. Reduce the crop dimensions.");
    const canvas=NexaurenImage.canvas(outW,outH),ctx=canvas.getContext("2d",{alpha:true});if(!ctx)throw new Error("The browser could not start image processing.");
    if(e.fmt.value==="image/jpeg"){ctx.fillStyle="#ffffff";ctx.fillRect(0,0,outW,outH)}
    ctx.save();ctx.translate(outW/2,outH/2);ctx.rotate(r*Math.PI/180);ctx.scale(e.flip.value==="h"||e.flip.value==="both"?-1:1,e.flip.value==="v"||e.flip.value==="both"?-1:1);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(source,box.x,box.y,box.w,box.h,-box.w/2,-box.h/2,box.w,box.h);ctx.restore();
    blob=await NexaurenImage.blob(canvas,e.fmt.value,e.fmt.value==="image/png"?undefined:Number(e.q.value)/100);
    revoke(outputUrl);outputUrl=URL.createObjectURL(blob);e.output.src=outputUrl;
    e.dimensions.textContent=outW+" × "+outH;e.ratioOut.textContent=labelRatio(outW,outH);e.sizeOut.textContent=NexaurenImage.bytes(blob.size);
    e.resultFormat.textContent=e.fmt.value==="image/jpeg"?"JPG":e.fmt.value.split("/").pop().toUpperCase();
    e.resultPosition.textContent=e.posx.value+"% × "+e.posy.value+"%";
    const transforms=[];if(r)transforms.push(r+"°");if(e.flip.value!=="none")transforms.push(e.flip.value==="h"?"Flip H":e.flip.value==="v"?"Flip V":"Flip H + V");e.resultTransform.textContent=transforms.join(" · ")||"Original";
    e.resultSection.classList.remove("hidden");e.copy.disabled=false;e.download.disabled=false;e.reset.disabled=false;status("Crop generated successfully.");
    e.resultSection.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(err){status(err?.message||"Could not generate the crop.",true)}
  finally{setBusy(false)}
}
function downloadResult(){if(!blob){status("Generate a crop first.",true);return}NexaurenImage.download(blob,"nexauren-crop."+NexaurenImage.ext(blob.type));status("Crop sent to download.")}
async function copySummary(){
  if(!blob){status("Generate a crop first.",true);return}
  const text=["NEXAUREN IMAGE CROPPER","Dimensions: "+e.dimensions.textContent,"Aspect ratio: "+e.ratioOut.textContent,"Format: "+e.resultFormat.textContent,"Size: "+e.sizeOut.textContent,"Position: "+e.resultPosition.textContent].join("\n");
  try{await navigator.clipboard.writeText(text);status("Summary copied.")}
  catch{try{const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();status(ok?"Summary copied.":"Could not copy the summary.",!ok)}catch{status("Could not copy the summary.",true)}}
}
function resetTool(){revoke(sourceUrl);revoke(outputUrl);sourceUrl="";outputUrl="";source=null;blob=null;e.file.value="";e.cameraFile.value="";e.preview.removeAttribute("src");e.output.removeAttribute("src");e.resultSection.classList.add("hidden");e.posx.value="50";e.posy.value="50";e.ratio.value="free";e.ratioW.value="1";e.ratioH.value="1";e.rot.value="0";e.flip.value="none";e.fmt.value="image/webp";e.q.value="90";e.customRatioField.hidden=true;e.run.disabled=true;e.download.disabled=true;e.copy.disabled=true;e.reset.disabled=true;e.qout.textContent="90%";status("Choose an image to start.");refreshPreview()}
function bindPositionDrag(){
  const start=(ev)=>{if(!source)return;dragging=true;const p=ev.touches?ev.touches[0]:ev;dragStartX=p.clientX;dragStartY=p.clientY;startX=Number(e.posx.value);startY=Number(e.posy.value);e.stage.setPointerCapture?.(ev.pointerId)};
  const move=(ev)=>{if(!dragging||!source)return;const rect=e.preview.getBoundingClientRect(),[W,H]=dimensions(),r=ratioValue();if(!r)return;const box=cropBox(W,H),maxX=Math.max(1,W-box.w),maxY=Math.max(1,H-box.h);let nx=startX+(ev.clientX-dragStartX)/rect.width*100*W/maxX,ny=startY+(ev.clientY-dragStartY)/rect.height*100*H/maxY;nx=Math.max(0,Math.min(100,nx));ny=Math.max(0,Math.min(100,ny));e.posx.value=String(Math.round(nx));e.posy.value=String(Math.round(ny));refreshPreview()};
  const end=()=>{dragging=false};
  e.stage.addEventListener("pointerdown",start);e.stage.addEventListener("pointermove",move);e.stage.addEventListener("pointerup",end);e.stage.addEventListener("pointercancel",end);e.stage.addEventListener("pointerleave",end);
}
function init(){
  e.choose.onclick=()=>e.file.click();e.camera.onclick=()=>e.cameraFile.click();
  e.file.onchange=ev=>{void loadFile(ev.target.files[0]);ev.target.value=""};e.cameraFile.onchange=ev=>{void loadFile(ev.target.files[0]);ev.target.value=""};
  e.ratio.onchange=()=>{e.customRatioField.hidden=e.ratio.value!=="custom";refreshPreview()};
  [e.ratioW,e.ratioH].forEach(el=>el.addEventListener("input",refreshPreview));
  [e.posx,e.posy].forEach(el=>el.addEventListener("input",refreshPreview));
  e.rot.onchange=e.flip.onchange=e.fmt.onchange=()=>{updateStats();if(e.fmt.value==="image/png")e.qout.textContent="Lossless";else e.qout.textContent=e.q.value+"%"};
  e.q.oninput=()=>{e.qout.textContent=e.q.value+"%";e.fmt.value==="image/png"||(e.ratio.value="custom"===e.ratio.value?e.ratio.value:e.ratio.value);updateStats()};
  document.querySelectorAll(".preset").forEach(btn=>btn.addEventListener("click",()=>{e.ratio.value=btn.dataset.ratio;e.customRatioField.hidden=true;refreshPreview()}));
  e.run.onclick=generate;e.download.onclick=downloadResult;e.copy.onclick=copySummary;e.reset.onclick=resetTool;
  window.addEventListener("resize",()=>requestAnimationFrame(displayFrame));
  document.addEventListener("keydown",ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();if(source)void generate()}});
  bindPositionDrag();refreshPreview();
}
init();