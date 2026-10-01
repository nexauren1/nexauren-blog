(()=>{"use strict";
const $=s=>document.querySelector(s);
const fileInput=$("#nxpc-file"),drop=$("#nxpc-drop"),filePanel=$("#nxpc-file-panel"),fileName=$("#nxpc-file-name"),fileMeta=$("#nxpc-file-meta");
const removeBtn=$("#nxpc-remove"),settings=$("#nxpc-settings"),compressBtn=$("#nxpc-compress"),resetBtn=$("#nxpc-reset"),progressWrap=$("#nxpc-progress-wrap"),progress=$("#nxpc-progress"),status=$("#nxpc-status"),result=$("#nxpc-result"),downloadBtn=$("#nxpc-download");
const modeButtons=[...document.querySelectorAll(".nxpc-mode")],visualBox=$("#nxpc-visual-setting"),quality=$("#nxpc-quality"),qualityLabel=$("#nxpc-quality-label"),dpi=$("#nxpc-dpi"),presetButtons=[...document.querySelectorAll(".nxpc-preset")],presetHint=$("#nxpc-preset-hint");
let sourceFile=null,outputBlob=null,outputName="compressed.pdf",mode="smart",preset="balanced",busy=false;
const PRESETS={
  balanced:{dpi:110,q:70,label:"Balanced",hint:"Good balance between readable pages and file size."},
  strong:{dpi:90,q:50,label:"Strong",hint:"A stronger reduction for image-heavy documents."},
  maximum:{dpi:72,q:35,label:"Maximum",hint:"Aggressive compression while keeping practical page readability."},
  smallest:{dpi:60,q:28,label:"Smallest file",hint:"Pushes file size down as far as this browser-based visual method can."}
};
const fmtBytes=n=>{if(!Number.isFinite(n)||n<0)return"—";const units=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<units.length-1){v/=1024;i++}return(v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(2))+" "+units[i]};
const setProgress=(pct,msg)=>{progressWrap.hidden=false;progress.style.width=Math.max(0,Math.min(100,pct))+"%";status.textContent=msg};
const cleanName=n=>(String(n||"compressed").replace(/\.pdf$/i,"").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,70)||"compressed")+"-compressed.pdf";
const updateQuality=()=>{const q=Number(quality.value);qualityLabel.textContent=(q>=80?"High":q>=60?"Balanced":q>=40?"Strong":"Maximum")+" · JPEG "+q+"%"};
const applyPreset=name=>{preset=PRESETS[name]?name:"balanced";const p=PRESETS[preset];quality.value=p.q;dpi.value=String(p.dpi);presetButtons.forEach(b=>b.classList.toggle("active",b.dataset.preset===preset));presetHint.textContent=p.hint;updateQuality()};
const showFile=f=>{sourceFile=f;fileName.textContent=f.name;fileMeta.textContent=fmtBytes(f.size);filePanel.hidden=false;settings.hidden=false;visualBox.hidden=mode==="visual";result.hidden=true;progressWrap.hidden=true;compressBtn.disabled=false;};
const clearAll=()=>{sourceFile=null;outputBlob=null;fileInput.value="";filePanel.hidden=true;settings.hidden=false;visualBox.hidden=true;result.hidden=true;progressWrap.hidden=true;progress.style.width="0%";compressBtn.disabled=true;busy=false;mode="smart";modeButtons.forEach(b=>b.classList.toggle("active",b.dataset.mode==="smart"));compressBtn.textContent="Compress PDF"};
let pdfLibPromise=null,pdfjsPromise=null;
const loadScript=(src,globalName,timeout=15000)=>new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-nx-lib="'+src+'"]');
  if(existing&&window[globalName])return resolve(window[globalName]);
  const s=existing||document.createElement("script");s.src=src;s.async=true;s.dataset.nxLib=src;
  let done=false;const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);fn(value)};
  const timer=setTimeout(()=>finish(reject,new Error("Library loading timed out.")),timeout);
  s.onload=()=>window[globalName]?finish(resolve,window[globalName]):finish(reject,new Error("Required library did not initialize."));
  s.onerror=()=>finish(reject,new Error("Required browser library could not be loaded."));
  if(!existing)document.head.appendChild(s);
});
const engine=async()=>{if(window.PDFLib?.PDFDocument)return window.PDFLib;if(!pdfLibPromise)pdfLibPromise=loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js","PDFLib");return pdfLibPromise};
const pdfjs=async()=>{if(window.pdfjsLib?.getDocument)return window.pdfjsLib;if(!pdfjsPromise)pdfjsPromise=loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js","pdfjsLib").then(lib=>{lib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";return lib});return pdfjsPromise};
const smartCompress=async(file,PDFLib)=>{
  setProgress(7,"Reading PDF structure…");
  const bytes=await file.arrayBuffer(),doc=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false}),pages=doc.getPageCount();
  setProgress(45,"Optimizing "+pages+" page"+(pages===1?"":"s")+"…");
  const bytesOut=await doc.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50});
  return {bytes:bytesOut,pages,method:"Smart Optimize"};
};
const renderPdf=async(lib,data,disableWorker)=>{
  try{return await lib.getDocument({data,disableWorker:!!disableWorker,useWorkerFetch:false,isEvalSupported:true,verbosity:0}).promise}
  catch(first){if(!disableWorker){setProgress(6,"Worker unavailable. Switching to local fallback…");return lib.getDocument({data,disableWorker:true,useWorkerFetch:false,isEvalSupported:false,verbosity:0}).promise}throw first}
};
const visualCompress=async(file,PDFLib,config={})=>{
  const lib=await pdfjs(),cfg={...PRESETS[preset],...config};
  setProgress(4,"Opening PDF for visual compression…");
  const data=new Uint8Array(await file.arrayBuffer()),pdf=await renderPdf(lib,data,false),out=await PDFLib.PDFDocument.create();
  const requestedScale=cfg.dpi/72,maxPixels=8000000;
  for(let i=1;i<=pdf.numPages;i++){
    setProgress(6+Math.round((i-1)/pdf.numPages*88),"Compressing page "+i+" of "+pdf.numPages+" at "+cfg.dpi+" DPI…");
    const page=await pdf.getPage(i),base=page.getViewport({scale:requestedScale});
    let scale=requestedScale,area=base.width*base.height;if(area>maxPixels)scale*=Math.sqrt(maxPixels/area);
    const viewport=page.getViewport({scale}),canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
    const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw new Error("Canvas rendering is unavailable in this browser.");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:ctx,viewport,background:"rgb(255,255,255)"}).promise;
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("JPEG encoding is unavailable in this browser.")),"image/jpeg",cfg.q/100));
    const jpg=new Uint8Array(await blob.arrayBuffer()),img=await out.embedJpg(jpg);
    const pageWidth=viewport.width/scale,pageHeight=viewport.height/scale,outPage=out.addPage([pageWidth,pageHeight]);
    outPage.drawImage(img,{x:0,y:0,width:pageWidth,height:pageHeight});
    canvas.width=1;canvas.height=1;await new Promise(requestAnimationFrame);
  }
  setProgress(96,"Finalizing compact PDF…");
  const bytes=await out.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50});
  return {bytes,pages:pdf.numPages,method:"Visual Compression · "+cfg.dpi+" DPI · JPEG "+cfg.q+"%"};
};
const bestSize=async(PDFLib)=>{
  const smart=await smartCompress(sourceFile,PDFLib);
  setProgress(51,"Testing the smallest visual version…");
  const visual=await visualCompress(sourceFile,PDFLib,{dpi:60,q:28});
  return visual.bytes.length<smart.bytes.length?visual:smart;
};
const compress=async()=>{
  if(!sourceFile||busy)return;
  busy=true;compressBtn.disabled=true;resetBtn.disabled=true;result.hidden=true;outputBlob=null;
  try{
    const PDFLib=await engine();let candidate;
    if(mode==="smart")candidate=await smartCompress(sourceFile,PDFLib);
    else if(mode==="visual")candidate=await visualCompress(sourceFile,PDFLib);
    else candidate=await bestSize(PDFLib);
    outputBlob=new Blob([candidate.bytes],{type:"application/pdf"});outputName=cleanName(sourceFile.name);
    const original=sourceFile.size,final=outputBlob.size,reduction=(1-final/original)*100;
    $("#nxpc-original-size").textContent=fmtBytes(original);
    $("#nxpc-result-size").textContent=fmtBytes(final);
    $("#nxpc-saved").textContent=reduction>0?reduction.toFixed(1)+"% smaller":Math.abs(reduction).toFixed(1)+"% larger";
    $("#nxpc-result-method").textContent=candidate.method;
    $("#nxpc-result-name").textContent=outputName;
    $("#nxpc-result-note").textContent=reduction>0?"Ready to download.":"This PDF is already highly compact; try Best Size for the strongest automatic comparison.";
    result.hidden=false;setProgress(100,"Compression complete.");
    downloadBtn.onclick=()=>{if(!outputBlob)return;const url=URL.createObjectURL(outputBlob),a=document.createElement("a");a.href=url;a.download=outputName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
  }catch(err){
    const raw=String(err?.message||"");
    const friendly=/password|encrypted/i.test(raw)?"This PDF is password-protected or encrypted. Please use an unlocked PDF.":/worker|globalworkers|canvas|render|encoding/i.test(raw)?"This browser could not render the PDF safely. Try Smart Optimize or another PDF.":"We could not compress this PDF. Try another file.";
    setProgress(0,friendly);
  }finally{busy=false;compressBtn.disabled=false;resetBtn.disabled=false}
};
fileInput.addEventListener("change",e=>{const f=e.target.files?.[0];if(f)showFile(f)});
drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});
drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));
drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag");const f=e.dataTransfer.files?.[0];if(f?.type==="application/pdf"||/\.pdf$/i.test(f?.name||""))showFile(f)});
removeBtn.onclick=clearAll;resetBtn.onclick=clearAll;compressBtn.onclick=compress;
quality.addEventListener("input",()=>{preset="custom";presetButtons.forEach(b=>b.classList.remove("active"));presetHint.textContent="Custom quality and DPI. Lower values create smaller PDFs with more visual degradation.";updateQuality()});
dpi.addEventListener("change",()=>{preset="custom";presetButtons.forEach(b=>b.classList.remove("active"));presetHint.textContent="Custom quality and DPI. Lower values create smaller PDFs with more visual degradation."});
presetButtons.forEach(btn=>btn.addEventListener("click",()=>applyPreset(btn.dataset.preset)));
modeButtons.forEach(btn=>btn.onclick=()=>{mode=btn.dataset.mode;modeButtons.forEach(b=>b.classList.toggle("active",b===btn));visualBox.hidden=mode!=="visual";compressBtn.textContent=mode==="auto"?"Find Smallest PDF":"Compress PDF"});
applyPreset("balanced");updateQuality();
})();