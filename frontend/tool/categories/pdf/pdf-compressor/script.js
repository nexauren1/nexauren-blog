(()=>{"use strict";
const $=s=>document.querySelector(s);
const fileInput=$("#nxpc-file"),drop=$("#nxpc-drop"),filePanel=$("#nxpc-file-panel"),fileName=$("#nxpc-file-name"),fileMeta=$("#nxpc-file-meta");
const removeBtn=$("#nxpc-remove"),settings=$("#nxpc-settings"),compressBtn=$("#nxpc-compress"),resetBtn=$("#nxpc-reset"),progressWrap=$("#nxpc-progress-wrap"),progress=$("#nxpc-progress"),status=$("#nxpc-status"),result=$("#nxpc-result"),downloadBtn=$("#nxpc-download");
const modeButtons=[...document.querySelectorAll(".nxpc-mode")],visualBox=$("#nxpc-visual-setting"),quality=$("#nxpc-quality"),qualityLabel=$("#nxpc-quality-label"),dpi=$("#nxpc-dpi");
let sourceFile=null,outputBlob=null,outputName="compressed.pdf",mode="smart",busy=false;
const fmtBytes=n=>{if(!Number.isFinite(n)||n<0)return"—";const units=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<units.length-1){v/=1024;i++}return(v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(2))+" "+units[i]};
const setProgress=(pct,msg)=>{progressWrap.hidden=false;progress.style.width=Math.max(0,Math.min(100,pct))+"%";status.textContent=msg};
const cleanName=n=>(String(n||"compressed").replace(/\.pdf$/i,"").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,70)||"compressed")+"-compressed.pdf";
const updateQuality=()=>{const q=Number(quality.value);qualityLabel.textContent=(q>=80?"High":q>=65?"Balanced":"Smaller")+" · JPEG "+q+"%"};
const showFile=f=>{sourceFile=f;fileName.textContent=f.name;fileMeta.textContent=fmtBytes(f.size);filePanel.hidden=false;settings.hidden=false;result.hidden=true;progressWrap.hidden=true;compressBtn.disabled=false};
const clearAll=()=>{sourceFile=null;outputBlob=null;fileInput.value="";filePanel.hidden=true;settings.hidden=true;result.hidden=true;progressWrap.hidden=true;progress.style.width="0%";compressBtn.disabled=false;busy=false};
let pdfLibPromise=null,pdfjsPromise=null;
const loadScript=(src,globalName,timeout=15000)=>new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-nx-lib="'+src+'"]');
  if(existing){if(window[globalName])return resolve(window[globalName]);}
  const s=existing||document.createElement("script");
  s.src=src;s.async=true;s.dataset.nxLib=src;
  let done=false;
  const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);fn(value)};
  const timer=setTimeout(()=>finish(reject,new Error("Library loading timed out.")),timeout);
  s.onload=()=>window[globalName]?finish(resolve,window[globalName]):finish(reject,new Error("Required library did not initialize."));
  s.onerror=()=>finish(reject,new Error("Required browser library could not be loaded."));
  if(!existing)document.head.appendChild(s);
});
const engine=async()=>{
  if(window.PDFLib?.PDFDocument)return window.PDFLib;
  if(!pdfLibPromise)pdfLibPromise=loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js","PDFLib");
  return pdfLibPromise;
};
const pdfjs=async()=>{
  if(window.pdfjsLib?.getDocument)return window.pdfjsLib;
  if(!pdfjsPromise)pdfjsPromise=loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js","pdfjsLib").then(lib=>{
    lib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
    return lib;
  });
  return pdfjsPromise;
};
const smartCompress=async(file,PDFLib)=>{
 setProgress(8,"Reading PDF…");
 const bytes=await file.arrayBuffer();
 const doc=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
 setProgress(58,"Rewriting PDF structure…");
 const bytesOut=await doc.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50});
 return bytesOut;
};
const renderPdf=async(lib,data,disableWorker)=>{
  try{
    return await lib.getDocument({data,disableWorker:!!disableWorker,useWorkerFetch:false,isEvalSupported:true,verbosity:0}).promise;
  }catch(first){
    if(!disableWorker){
      setProgress(5,"Worker unavailable. Switching to local fallback…");
      return lib.getDocument({data,disableWorker:true,useWorkerFetch:false,isEvalSupported:false,verbosity:0}).promise;
    }
    throw first;
  }
};
const visualCompress=async(file,PDFLib)=>{
 const lib=await pdfjs();
 setProgress(4,"Opening PDF…");
 const data=new Uint8Array(await file.arrayBuffer());
 const pdf=await renderPdf(lib,data,false);
 const out=await PDFLib.PDFDocument.create();
 const q=Number(quality.value)/100,d=Number(dpi.value),requestedScale=d/72;
 const maxPixels=12000000;
 for(let i=1;i<=pdf.numPages;i++){
   setProgress(5+Math.round((i-1)/pdf.numPages*88),`Rendering page ${i} of ${pdf.numPages}…`);
   const page=await pdf.getPage(i);
   const base=page.getViewport({scale:requestedScale});
   let scale=requestedScale;
   const area=base.width*base.height;
   if(area>maxPixels)scale*=Math.sqrt(maxPixels/area);
   const viewport=page.getViewport({scale});
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
   const ctx=canvas.getContext("2d",{alpha:false,willReadFrequently:false});
   if(!ctx)throw new Error("Canvas rendering is unavailable in this browser.");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
   await page.render({canvasContext:ctx,viewport}).promise;
   const dataUrl=canvas.toDataURL("image/jpeg",q);
   const img=await out.embedJpg(dataUrl);
   const pageWidth=viewport.width/scale,pageHeight=viewport.height/scale;
   const outPage=out.addPage([pageWidth,pageHeight]);
   outPage.drawImage(img,{x:0,y:0,width:pageWidth,height:pageHeight});
   canvas.width=1;canvas.height=1;
   await new Promise(requestAnimationFrame);
 }
 setProgress(96,"Finalizing PDF…");
 return out.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50});
};
const compress=async()=>{
 if(!sourceFile||busy)return;
 busy=true;compressBtn.disabled=true;resetBtn.disabled=true;result.hidden=true;outputBlob=null;
 try{
   const PDFLib=await engine();
   const outBytes=mode==="smart"?await smartCompress(sourceFile,PDFLib):await visualCompress(sourceFile,PDFLib);
   outputBlob=new Blob([outBytes],{type:"application/pdf"});
   outputName=cleanName(sourceFile.name);
   const original=sourceFile.size,final=outputBlob.size;
   const reduction=(1-final/original)*100;
   $("#nxpc-original-size").textContent=fmtBytes(original);$("#nxpc-result-size").textContent=fmtBytes(final);
   $("#nxpc-saved").textContent=(reduction>0?reduction.toFixed(1)+"% smaller":Math.abs(reduction).toFixed(1)+"% larger");
   $("#nxpc-result-name").textContent=outputName;
   $("#nxpc-result-note").textContent=reduction>0?"Ready to download.":"This source PDF was already compact; the optimized file may not be smaller.";
   result.hidden=false;setProgress(100,"Compression complete.");
   downloadBtn.onclick=()=>{if(!outputBlob)return;const url=URL.createObjectURL(outputBlob);const a=document.createElement("a");a.href=url;a.download=outputName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
 }catch(err){
   const raw=String(err?.message||"");
   const friendly=/password|encrypted/i.test(raw)
     ?"This PDF is password-protected or encrypted. Please use an unlocked PDF."
     :/worker|globalworkers|canvas|render/i.test(raw)
       ?"This browser could not render the PDF safely. Try Smart Optimize or another PDF."
       :"We couldn't compress this PDF. Try another file.";
   setProgress(0,friendly);
 }finally{busy=false;compressBtn.disabled=false;resetBtn.disabled=false}
};
fileInput.addEventListener("change",e=>{const f=e.target.files?.[0];if(f)showFile(f)});
drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});
drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));
drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag");const f=e.dataTransfer.files?.[0];if(f?.type==="application/pdf"||/\.pdf$/i.test(f?.name||""))showFile(f)});
removeBtn.onclick=clearAll;resetBtn.onclick=clearAll;quality.addEventListener("input",updateQuality);
modeButtons.forEach(btn=>btn.addEventListener("click",()=>{mode=btn.dataset.mode;modeButtons.forEach(b=>b.classList.toggle("active",b===btn));visualBox.hidden=mode!=="visual";}));
compressBtn.addEventListener("click",compress);updateQuality();
})();