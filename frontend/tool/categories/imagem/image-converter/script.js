const $=(s)=>document.querySelector(s);
const state={files:[],results:[],processing:false,previewUrls:[],fileUrls:[]};
const e={
 files:$("#files"),cameraFile:$("#cameraFile"),choose:$("#choose"),camera:$("#camera"),drop:$("#drop"),format:$("#format"),preset:$("#preset"),
 quality:$("#quality"),qualityOut:$("#qualityOut"),resizeMode:$("#resizeMode"),mw:$("#maxWidth"),mh:$("#maxHeight"),bg:$("#background"),
 naming:$("#naming"),rotation:$("#rotation"),flip:$("#flip"),effect:$("#effect"),preserve:$("#preserve"),convert:$("#convert"),
 downloadAll:$("#downloadAll"),copyReport:$("#copyReport"),clear:$("#clear"),status:$("#status"),spinner:$("#spinner"),
 progressWrap:$("#progressWrap"),progressBar:$("#progressBar"),queue:$("#queue"),resultsSection:$("#resultsSection"),resultGrid:$("#resultGrid"),
 count:$("#count"),formatStat:$("#formatStat"),qualityStat:$("#qualityStat"),modeStat:$("#modeStat"),done:$("#done"),failed:$("#failed"),before:$("#before"),after:$("#after")
};

const EXT={ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif" };
const IMAGE_EXT=/\.(jpe?g|png|webp|avif|gif|bmp|heic|heif|tiff?)$/i;
const PRESETS={
 balanced:{format:"image/webp",quality:88},
 web:{format:"image/webp",quality:76},
 quality:{format:"image/avif",quality:94},
 png:{format:"image/png",quality:100}
};

const bytes=(n)=>{
  if(!Number.isFinite(n))return"—";
  const units=["B","KB","MB","GB"];let i=0,v=n;
  while(v>=1024&&i<3){v/=1024;i++}
  return v.toFixed(v>=100?0:v>=10?1:2)+" "+units[i];
};
const baseName=(name)=>String(name||"image").replace(/\.[^./\\]+$/,"").replace(/[^a-zA-Z0-9 _-]/g,"-").replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,90)||"image";
const setStatus=(text,error=false)=>{e.status.textContent=text;e.status.className="status"+(error?" error":"")};
const revoke=(url)=>{try{URL.revokeObjectURL(url)}catch{}};

function updateSummary(){
  e.count.textContent=String(state.files.length);
  e.formatStat.textContent=(EXT[e.format.value]||"webp").toUpperCase();
  e.qualityStat.textContent=e.format.value==="image/png"?"Lossless":e.quality.value+"%";
  e.modeStat.textContent=e.resizeMode.value==="fit"?"Fit within":"Original";
}
function updateQuality(){
  const png=e.format.value==="image/png";
  e.quality.disabled=png;
  e.qualityOut.textContent=png?"Lossless":e.quality.value+"%";
  updateSummary();
}
function setBusy(on){
  state.processing=on;
  e.convert.disabled=on||!state.files.length;
  e.downloadAll.disabled=on||!state.results.length;
  e.spinner.classList.toggle("on",on);
  e.spinner.setAttribute("aria-hidden",on?"false":"true");
  e.convert.textContent=on?"Converting…":"Convert images";
  e.progressWrap.hidden=!on;
}
function progress(done,total){
  const pct=total?Math.round(done/total*100):0;
  e.progressBar.style.width=pct+"%";
  e.progressWrap.setAttribute("aria-valuenow",String(pct));
}
function clearObjectUrls(){
  state.previewUrls.forEach(revoke);state.previewUrls=[];
  state.fileUrls.forEach(revoke);state.fileUrls=[];
}

function renderQueue(){
  clearObjectUrls();
  e.queue.replaceChildren();
  if(!state.files.length){
    e.queue.innerHTML='<div class="empty">No images selected.</div>';
    e.convert.disabled=true;
    updateSummary();
    return;
  }
  state.fileUrls=state.files.map(f=>URL.createObjectURL(f));
  state.files.forEach((file,i)=>{
    const row=document.createElement("div");row.className="item";
    const img=document.createElement("img");img.className="thumb";img.alt="Preview of "+file.name;img.src=state.fileUrls[i];
    const info=document.createElement("div");const b=document.createElement("b");const s=document.createElement("small");
    b.textContent=file.name;s.textContent=bytes(file.size)+" · "+(file.type||"image");
    info.append(b,s);
    const remove=document.createElement("button");remove.type="button";remove.className="btn ghost remove";remove.textContent="Remove";remove.setAttribute("aria-label","Remove "+file.name);
    remove.onclick=()=>{
      state.files.splice(i,1);state.results=[];renderQueue();renderResults();setStatus(state.files.length?state.files.length+" image(s) in queue.":"Add images to start.");
    };
    row.append(img,info,remove);e.queue.append(row);
  });
  e.convert.disabled=state.processing||!state.files.length;
  updateSummary();
}
function renderResults(){
  state.previewUrls.forEach(revoke);state.previewUrls=[];
  e.resultGrid.replaceChildren();
  e.resultsSection.classList.toggle("hidden",state.results.length===0);
  e.downloadAll.disabled=state.processing||!state.results.length;
  if(!state.results.length)return;

  state.results.forEach((r,i)=>{
    const card=document.createElement("article");card.className="result-card";
    const title=document.createElement("h3");title.className="result-title";title.textContent=r.name;
    const compare=document.createElement("div");compare.className="compare";

    const beforeFig=document.createElement("figure");beforeFig.className="figure";
    const beforeCap=document.createElement("figcaption");beforeCap.textContent="Original · "+r.originalWidth+" × "+r.originalHeight;
    const beforeImg=document.createElement("img");beforeImg.className="preview";beforeImg.alt="Original preview of "+r.originalName;beforeImg.loading="lazy";
    const src=URL.createObjectURL(r.file);state.previewUrls.push(src);beforeImg.src=src;beforeFig.append(beforeCap,beforeImg);

    const afterFig=document.createElement("figure");afterFig.className="figure";
    const afterCap=document.createElement("figcaption");afterCap.textContent="Converted · "+r.width+" × "+r.height;
    const afterImg=document.createElement("img");afterImg.className="preview";afterImg.alt="Converted preview of "+r.originalName;afterImg.loading="lazy";
    const out=URL.createObjectURL(r.blob);state.previewUrls.push(out);afterImg.src=out;afterFig.append(afterCap,afterImg);

    compare.append(beforeFig,afterFig);
    const meta=document.createElement("div");meta.className="meta";
    const size=document.createElement("span");size.textContent=bytes(r.blob.size);
    const delta=document.createElement("strong");delta.textContent=r.fallback?"WebP fallback":"Ready";
    meta.append(size,delta);

    const actions=document.createElement("div");actions.className="result-actions";
    const download=document.createElement("button");download.type="button";download.className="btn primary";download.textContent="Download";
    download.onclick=()=>downloadBlob(r.blob,r.name);
    actions.append(download);

    card.append(title,compare,meta,actions);e.resultGrid.append(card);
  });
}

function addFiles(list){
  const incoming=[...list].filter(f=>f&&((f.type&&f.type.startsWith("image/"))||IMAGE_EXT.test(f.name||"")));
  if(!incoming.length){setStatus("Please choose valid image files.",true);return}

  const keys=new Set(state.files.map(f=>f.name+"\0"+f.size+"\0"+f.lastModified));
  let duplicates=0;
  for(const file of incoming){
    const key=file.name+"\0"+file.size+"\0"+file.lastModified;
    if(keys.has(key)){duplicates++;continue}
    keys.add(key);state.files.push(file);
  }

  state.results=[];renderQueue();renderResults();
  setStatus((state.files.length||incoming.length)+" image(s) in queue."+(duplicates?" "+duplicates+" duplicate(s) skipped.":""));
}
function loadImage(file){
  if(typeof createImageBitmap==="function"){
    return createImageBitmap(file,{imageOrientation:"from-image",colorSpaceConversion:"default"}).catch(()=>createImageBitmap(file));
  }
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{revoke(url);resolve(img)};
    img.onerror=()=>{revoke(url);const reader=new FileReader();
      reader.onload=()=>{const fallback=new Image();fallback.onload=()=>resolve(fallback);fallback.onerror=()=>reject(new Error("This browser could not decode the selected image."));fallback.src=reader.result};
      reader.onerror=()=>reject(new Error("Could not read the image on this device."));
      try{reader.readAsDataURL(file)}catch{reject(new Error("Could not read this image."))}
    };
    img.src=url;
  });
}
function dimensions(image){return [image.width||image.naturalWidth||0,image.height||image.naturalHeight||0]}
function targetDimensions(w,h){
  if(e.resizeMode.value!=="fit")return [w,h];
  const mw=Math.max(1,Number(e.mw.value)||w),mh=Math.max(1,Number(e.mh.value)||h);
  const scale=Math.min(1,mw/w,mh/h);
  return [Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))];
}
function makeCanvas(w,h){
  try{
    const c=document.createElement("canvas");c.width=w;c.height=h;
    if(!c.width||!c.height)throw new Error();
    return c;
  }catch{
    throw new Error("The browser could not allocate the requested output image. Try smaller dimensions.");
  }
}
function toBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>{
    try{canvas.toBlob(b=>b?resolve(b):reject(new Error("This browser could not encode the selected output format.")),type,quality)}
    catch(err){reject(err)}
  });
}
async function encode(canvas,type,quality){
  try{return await toBlob(canvas,type,quality)}
  catch(err){
    if(type==="image/avif"){
      const fallback=await toBlob(canvas,"image/webp",quality);
      return {blob:fallback,fallback:true};
    }
    throw err;
  }
}
function outputName(fileName,type){
  let name=baseName(fileName);
  if(e.naming.value==="suffix")name+="-nexauren";
  if(e.naming.value==="converted")name+="-converted";
  return name+"."+EXT[type||e.format.value] ;
}
async function convertOne(file){
  const image=await loadImage(file);
  try{
    const [ow,oh]=dimensions(image);
    if(!ow||!oh)throw new Error("Could not determine the image dimensions.");
    const [bw,bh]=targetDimensions(ow,oh);
    const rotation=Number(e.rotation.value)||0;
    const swap=rotation===90||rotation===270;
    const width=swap?bh:bw,height=swap?bw:bh;
    const canvas=makeCanvas(width,height);
    const ctx=canvas.getContext("2d",{alpha:true});
    if(!ctx)throw new Error("The browser could not start image processing.");

    const type=e.format.value;
    if(type==="image/jpeg"){
      ctx.fillStyle=e.bg.value;ctx.fillRect(0,0,width,height);
    }

    ctx.save();
    ctx.translate(width/2,height/2);
    ctx.rotate(rotation*Math.PI/180);
    ctx.scale(e.flip.value==="h"||e.flip.value==="both"?-1:1,e.flip.value==="v"||e.flip.value==="both"?-1:1);
    if(e.effect.value==="grayscale")ctx.filter="grayscale(1)";
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(image,-bw/2,-bh/2,bw,bh);
    ctx.restore();

    const encoded=await encode(canvas,type,type==="image/png"?undefined:Number(e.quality.value)/100);
    const blob=encoded.blob||encoded;
    const actual=blob.type||type;
    return{
      file,
      blob,
      fallback:Boolean(encoded.fallback)||actual!==type,
      name:outputName(file.name,actual),
      originalName:file.name,
      originalSize:file.size,
      originalWidth:ow,originalHeight:oh,width,height
    };
  }finally{image.close?.()}
}
function resetMetrics(){
  e.done.textContent="0";e.failed.textContent="0";e.before.textContent="—";e.after.textContent="—";progress(0,1);
}
async function run(){
  if(state.processing)return;
  if(!state.files.length){setStatus("Add at least one image first.",true);return}
  state.results=[];renderResults();resetMetrics();setBusy(true);progress(0,state.files.length);
  let before=0,after=0,done=0,failed=0;const errors=[];
  for(let i=0;i<state.files.length;i++){
    const file=state.files[i];
    setStatus("Converting "+(i+1)+"/"+state.files.length+" · "+file.name);
    try{
      const result=await convertOne(file);
      state.results.push(result);before+=result.originalSize;after+=result.blob.size;done++;
    }catch(err){failed++;errors.push(file.name+": "+(err?.message||"Conversion failed."))}
    e.done.textContent=String(done);e.failed.textContent=String(failed);e.before.textContent=bytes(before);e.after.textContent=bytes(after);
    renderResults();progress(i+1,state.files.length);
    await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  setBusy(false);setStatus(done&&failed?done+" converted · "+failed+" failed.":done?done+" image(s) converted successfully.":errors.length?errors.join(" | "):"No image could be converted.",Boolean(failed||!done));
}
function applyPreset(name){
  if(name==="reset"){
    e.resizeMode.value="original";e.mw.value="";e.mh.value="";e.preset.value="custom";updateSummary();setStatus("Original dimensions selected.");
    return;
  }
  const p=PRESETS[name];if(!p)return;
  e.format.value=p.format;e.quality.value=String(p.quality);e.preset.value=name;
  if(name==="png")e.resizeMode.value="original";
  updateQuality();setStatus("Preset applied: "+name+".");
}
function report(){
  if(!state.results.length)return"";
  return[
    "NEXAUREN IMAGE CONVERTER",
    "Converted: "+state.results.length,
    "Output format: "+(EXT[e.format.value]||"unknown").toUpperCase(),
    "Original size: "+e.before.textContent,
    "Output size: "+e.after.textContent,
    "",
    ...state.results.map(r=>r.name+" — "+r.width+"×"+r.height+" — "+bytes(r.blob.size)+(r.fallback?" — fallback":""))
  ].join("\n");
}
async function copyReport(){
  const text=report();
  if(!text){setStatus("Convert at least one image first.",true);return}
  try{await navigator.clipboard.writeText(text);setStatus("Report copied.")}
  catch{
    try{const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();setStatus(ok?"Report copied.":"Could not copy the report.",!ok)}
    catch{setStatus("Could not copy the report.",true)}
  }
}
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";a.style.display="none";
  document.body.appendChild(a);try{a.click()}finally{a.remove();setTimeout(()=>revoke(url),1400)}
}
function downloadAll(){
  if(!state.results.length){setStatus("Convert at least one image first.",true);return}
  state.results.forEach((r,i)=>setTimeout(()=>downloadBlob(r.blob,r.name),i*160));
  setStatus(state.results.length+" result(s) sent to download.");
}
function reset(){
  state.files=[];state.results=[];clearObjectUrls();e.files.value="";e.cameraFile.value="";
  e.format.value="image/webp";e.preset.value="balanced";e.quality.value="88";e.resizeMode.value="original";e.mw.value="";e.mh.value="";
  e.bg.value="#ffffff";e.naming.value="suffix";e.rotation.value="0";e.flip.value="none";e.effect.value="none";e.preserve.checked=true;
  resetMetrics();renderQueue();renderResults();updateQuality();setStatus("Add images to start.");
}
function bind(){
  e.choose.onclick=(ev)=>{ev.preventDefault();e.files.click()};
  e.camera.onclick=(ev)=>{ev.preventDefault();e.cameraFile.click()};
  e.files.onchange=(ev)=>{addFiles(ev.target.files);ev.target.value=""};
  e.cameraFile.onchange=(ev)=>{addFiles(ev.target.files);ev.target.value=""};
  ["dragenter","dragover"].forEach(t=>e.drop.addEventListener(t,ev=>{ev.preventDefault();e.drop.classList.add("drag")}));
  ["dragleave","drop"].forEach(t=>e.drop.addEventListener(t,ev=>{ev.preventDefault();e.drop.classList.remove("drag")}));
  e.drop.addEventListener("drop",ev=>addFiles(ev.dataTransfer.files));
  e.drop.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();e.files.click()}});
  e.format.onchange=()=>{e.preset.value="custom";updateQuality()};
  e.quality.oninput=()=>{e.preset.value="custom";updateQuality()};
  e.resizeMode.onchange=()=>{e.preset.value="custom";updateSummary()};
  [e.mw,e.mh,e.rotation,e.flip,e.effect,e.bg,e.naming,e.preserve].forEach(el=>el.addEventListener("change",()=>{e.preset.value="custom";updateSummary()}));
  document.querySelectorAll(".preset").forEach(btn=>btn.addEventListener("click",()=>applyPreset(btn.dataset.name)));
  e.convert.onclick=run;e.downloadAll.onclick=downloadAll;e.copyReport.onclick=copyReport;e.clear.onclick=reset;
  document.addEventListener("keydown",ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();if(state.files.length)void run()}});
  window.addEventListener("beforeunload",clearObjectUrls);
}
bind();updateQuality();setStatus("Ready. Add images to start.");
