(()=>{"use strict";
const $=s=>document.querySelector(s);
const input=$("#pdfsplit-file"),drop=$("#pdfsplit-drop"),fileBar=$("#pdfsplit-filebar"),fileName=$("#pdfsplit-file-name"),fileMeta=$("#pdfsplit-file-meta");
const mode=$("#pdfsplit-mode"),range=$("#pdfsplit-range"),splitBtn=$("#pdfsplit-split"),clearBtn=$("#pdfsplit-clear");
const total=$("#pdfsplit-total"),parts=$("#pdfsplit-parts"),state=$("#pdfsplit-state"),status=$("#pdfsplit-status"),progress=$("#pdfsplit-progress"),results=$("#pdfsplit-results");
const langBtn=$("#pdfsplit-lang"),nameInput=$("#pdfsplit-name");
let language=new URLSearchParams(location.search).get("lang")==="en"?"en":"pt";
let file=null,pdf=null,enginePromise=null,outputs=[],downloadUrls=[];

const T={
pt:{title:"Dividir PDF",lead:"Separe um PDF em vários ficheiros por páginas. Tudo acontece no navegador, sem enviar o documento para um servidor.",local:"PDF",drop:"Escolha um PDF",sub:"Toque para selecionar ou arraste o ficheiro para aqui",file:"Documento selecionado",mode:"Modo",each:"Uma página por ficheiro",range:"Intervalo único",pages:"Páginas",rangePlaceholder:"1-3,5,8-10",base:"Nome base",total:"Páginas",parts:"Partes",state:"Estado",ready:"Pronto",split:"Dividir PDF",clear:"Limpar",empty:"Escolha um PDF para começar.",select:"Selecione um ficheiro PDF válido.",needRange:"Indique um intervalo de páginas.",invalidRange:"Intervalo de páginas inválido.",outside:"O intervalo está fora das páginas do PDF.",loading:"A carregar PDF",processing:"A criar partes",done:"Divisão concluída.",error:"Não foi possível dividir o PDF.",engine:"O motor de PDF não conseguiu carregar.",result:"Parte criada",download:"Baixar PDF",privacy:"Processamento local",privacyBody:"O seu PDF permanece no dispositivo durante todo o processo.",flowTitle:"Fluxo",flow1:"Selecionar",flow2:"Definir partes",flow3:"Exportar",translate:"English",back:"← PDF",remove:"Remover",footer:"Dividir PDF · Nexauren Tools"},
en:{title:"Split PDF",lead:"Split a PDF into separate files by page. Everything happens in your browser without uploading the document to a server.",local:"PDF",drop:"Choose a PDF",sub:"Tap to select or drag the file here",file:"Selected document",mode:"Mode",each:"One page per file",range:"Single range",pages:"Pages",rangePlaceholder:"1-3,5,8-10",base:"Base name",total:"Pages",parts:"Parts",state:"Status",ready:"Ready",split:"Split PDF",clear:"Clear",empty:"Choose a PDF to start.",select:"Select a valid PDF file.",needRange:"Enter a page range.",invalidRange:"Invalid page range.",outside:"The page range is outside the PDF.",loading:"Loading PDF",processing:"Creating parts",done:"Split completed.",error:"Could not split the PDF.",engine:"The PDF engine could not be loaded.",result:"Part created",download:"Download PDF",privacy:"Local processing",privacyBody:"Your PDF remains on your device throughout the process.",flowTitle:"Flow",flow1:"Select",flow2:"Define parts",flow3:"Export",translate:"Português",back:"← PDF",remove:"Remove",footer:"Split PDF · Nexauren Tools"}
};
const t=()=>T[language];
const msg=(v,error=false)=>{status.textContent=v;status.style.color=error?"var(--danger)":"var(--muted)"};
const bytes=n=>{if(!Number.isFinite(n))return"—";const u=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<3){v/=1024;i++}return v.toFixed(v>=100?0:v>=10?1:2)+" "+u[i]};
function set(s,v){const e=$(s);if(e)e.textContent=v}
function clearDownloadUrls(){downloadUrls.forEach(u=>URL.revokeObjectURL(u));downloadUrls=[]}
function applyLanguage(){
 const x=t();document.documentElement.lang=language;document.querySelector(".pdfsplit").classList.add("pdfsplit-ready");
 set("#pdfsplit-title",x.title);set("#pdfsplit-lead",x.lead);set("#pdfsplit-radar-label",x.local);
 set("#pdfsplit-drop-title",x.drop);set("#pdfsplit-drop-sub",x.sub);set("#pdfsplit-file-label",x.file);
 set("#pdfsplit-mode-label",x.mode);set("#pdfsplit-mode-each",x.each);set("#pdfsplit-mode-range",x.range);set("#pdfsplit-range-label",x.pages);range.placeholder=x.rangePlaceholder;
 set("#pdfsplit-name-label",x.base);set("#pdfsplit-total-label",x.total);set("#pdfsplit-parts-label",x.parts);set("#pdfsplit-status-label",x.state);
 set("#pdfsplit-split",x.split);set("#pdfsplit-clear",x.clear);set("#pdfsplit-empty",x.empty);set("#pdfsplit-privacy-title",x.privacy);set("#pdfsplit-privacy-body",x.privacyBody);
 set("#pdfsplit-side-title",x.flowTitle);set("#pdfsplit-flow1",x.flow1);set("#pdfsplit-flow2",x.flow2);set("#pdfsplit-flow3",x.flow3);
 set("#pdfsplit-lang",x.translate);set(".pdfsplit-back",x.back);set(".pdfsplit-footer",x.footer);renderResults();
}
function renderResults(){
 clearDownloadUrls();results.replaceChildren();
 if(!outputs.length){const e=document.createElement("div");e.className="pdfsplit-empty";e.textContent=t().empty;results.append(e);return}
 outputs.forEach((r,i)=>{
  const row=document.createElement("div");row.className="pdfsplit-result";
  const idx=document.createElement("div");idx.className="pdfsplit-result-index";idx.textContent=String(i+1).padStart(2,"0");
  const info=document.createElement("div");const b=document.createElement("strong");b.textContent=r.name;const s=document.createElement("small");s.textContent=t().result+" · "+r.pages+" · "+bytes(r.size);info.append(b,s);
  const btn=document.createElement("a");btn.className="pdfsplit-btn primary";btn.href=URL.createObjectURL(r.blob);downloadUrls.push(btn.href);btn.download=r.name;btn.textContent=t().download;btn.setAttribute("role","button");
  row.append(idx,info,btn);results.append(row);
 })
}
function parseRange(value,max){
 const out=new Set();
 for(const raw of String(value||"").split(",")){const s=raw.trim();if(!s)continue;const m=s.match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw Error(t().invalidRange);const a=Number(m[1]),b=m[2]?Number(m[2]):a;if(a<1||b<1||a>max||b>max||a>b)throw Error(t().outside);for(let i=a;i<=b;i++)out.add(i)}
 return [...out].sort((a,b)=>a-b)
}
function selectedPages(totalPages){
 if(mode.value==="each")return Array.from({length:totalPages},(_,i)=>[i+1]);
 const nums=parseRange(range.value,totalPages);if(!nums.length)throw Error(t().needRange);return [nums];
}
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=()=>window.PDFLib?.PDFDocument?resolve(window.PDFLib):reject(Error(t().engine));s.onerror=()=>reject(Error(t().engine));document.head.appendChild(s)})}
async function ensureEngine(){
 if(window.PDFLib?.PDFDocument)return window.PDFLib;
 if(enginePromise)return enginePromise;
 enginePromise=(async()=>{try{return await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js")}catch{}try{return await loadScript("https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js")}catch{}throw Error(t().engine)})();
 try{return await enginePromise}finally{enginePromise=null}
}
async function openFile(f){
 if(!f||(!/application\/pdf/i.test(f.type)&&!/\.pdf$/i.test(f.name))){msg(t().select,true);return}
 file=f;pdf=null;outputs=[];fileBar.hidden=false;fileName.textContent=f.name;fileMeta.textContent=bytes(f.size);total.textContent="…";parts.textContent="0";state.textContent=t().loading;splitBtn.disabled=true;renderResults();msg(t().loading+"…");
 try{const lib=await ensureEngine();pdf=await lib.PDFDocument.load(await f.arrayBuffer());total.textContent=String(pdf.getPageCount());parts.textContent=mode.value==="each"?String(pdf.getPageCount()):"1";state.textContent=t().ready;splitBtn.disabled=false;msg(t().ready)}
 catch(e){state.textContent=t().error;splitBtn.disabled=true;msg(e?.message||t().error,true)}
}
async function split(){
 if(!pdf){msg(t().select,true);return}
 splitBtn.disabled=true;clearBtn.disabled=true;progress.style.width="0%";outputs=[];renderResults();
 try{
  const lib=await ensureEngine(),groups=selectedPages(pdf.getPageCount()),base=(nameInput.value.trim().replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||"parte");
  for(let i=0;i<groups.length;i++){
   msg(t().processing+" "+(i+1)+"/"+groups.length+"…");
   const out=await lib.PDFDocument.create();
   const copied=await out.copyPages(pdf,groups[i].map(n=>n-1));copied.forEach(p=>out.addPage(p));
   const data=await out.save({useObjectStreams:false}),blob=new Blob([data],{type:"application/pdf"});
   const suffix=groups.length===1?base:base+"-"+String(i+1).padStart(3,"0");
   outputs.push({blob,name:suffix+".pdf",pages:groups[i].length,size:blob.size});
   renderResults();progress.style.width=Math.round((i+1)/groups.length*100)+"%";parts.textContent=String(groups.length);state.textContent=t().processing;
   await new Promise(requestAnimationFrame);
  }
  state.textContent=t().ready;msg(t().done);
 }catch(e){state.textContent=t().error;msg(e?.message||t().error,true)}
 finally{splitBtn.disabled=!pdf;clearBtn.disabled=false}
}
window.__nexaurenPdfSplitRun=split;
input.addEventListener("change",e=>{openFile(e.target.files?.[0]);input.value=""});
drop.addEventListener("click",e=>{if(e.target!==input)input.click()});
drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});
drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));
drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag");openFile(e.dataTransfer.files?.[0])});
mode.addEventListener("change",()=>{range.disabled=mode.value!=="range";if(pdf)parts.textContent=mode.value==="each"?String(pdf.getPageCount()):"1"});
clearBtn.addEventListener("click",()=>{file=null;pdf=null;outputs=[];fileBar.hidden=true;total.textContent="0";parts.textContent="0";state.textContent=t().ready;progress.style.width="0%";splitBtn.disabled=true;renderResults();msg(t().ready)});
langBtn.addEventListener("click",()=>{language=language==="en"?"pt":"en";const u=new URL(location.href);if(language==="en")u.searchParams.set("lang","en");else u.searchParams.delete("lang");history.replaceState(null,"",u.pathname+(u.search||""));applyLanguage();msg(t().ready)});
range.disabled=true;applyLanguage();
})();