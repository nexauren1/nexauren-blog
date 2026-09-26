(()=>{"use strict";
const $=s=>document.querySelector(s);
const input=$("#pdfmerge-files"),drop=$("#pdfmerge-drop"),list=$("#pdfmerge-list"),build=$("#pdfmerge-build"),clear=$("#pdfmerge-clear"),status=$("#pdfmerge-status"),count=$("#pdfmerge-count"),pageCount=$("#pdfmerge-pages"),size=$("#pdfmerge-size"),name=$("#pdfmerge-name"),progress=$("#pdfmerge-progress"),result=$("#pdfmerge-result"),resultName=$("#pdfmerge-result-name"),resultSize=$("#pdfmerge-result-size"),downloadBtn=$("#pdfmerge-download"),langBtn=$("#pdfmerge-lang");
let language=new URLSearchParams(location.search).get("lang")==="en"?"en":"pt";
let files=[],output=null,pdfEnginePromise=null;

const ui={
pt:{lead:"Combine vários documentos PDF num único ficheiro, organize a ordem e faça tudo localmente no navegador.",local:"LOCAL · SEM UPLOAD",drop:"Adicionar PDFs",sub:"Toque para selecionar documentos ou arraste-os para aqui",docs:"Documentos",pages:"Páginas",size:"Tamanho",list:"Fila de montagem",listSub:"A ordem será mantida no PDF final.",clear:"Limpar",empty:"Adicione pelo menos dois PDFs para começar.",name:"Nome do PDF",build:"Juntar PDFs",ready:"Pronto para receber documentos.",privacy:"Privacidade primeiro",privacyBody:"Os documentos permanecem no seu dispositivo enquanto a montagem acontece.",addError:"Selecione ficheiros PDF válidos.",need:"Adicione pelo menos dois ficheiros PDF.",loading:"A ler",processing:"A juntar",done:"PDF criado com sucesso.",error:"Não foi possível criar o PDF.",engine:"O motor de PDF não conseguiu carregar.",download:"Baixar PDF",back:"← PDF",translate:"English",step1:"Adicionar",step2:"Organizar",step3:"Exportar",remove:"Remover",result:"PDF criado"},
en:{lead:"Combine multiple PDF files into one document, organize the order, and do everything locally in your browser.",local:"LOCAL · NO UPLOAD",drop:"Add PDFs",sub:"Tap to select documents or drag them here",docs:"Documents",pages:"Pages",size:"Size",list:"Assembly queue",listSub:"The order will be preserved in the final PDF.",clear:"Clear",empty:"Add at least two PDFs to start.",name:"PDF name",build:"Merge PDFs",ready:"Ready for documents.",privacy:"Privacy first",privacyBody:"Your documents stay on your device while the assembly happens.",addError:"Select valid PDF files.",need:"Add at least two PDF files.",loading:"Reading",processing:"Merging",done:"PDF created successfully.",error:"Could not create the PDF.",engine:"The PDF engine could not be loaded.",download:"Download PDF",back:"← PDF",translate:"Português",step1:"Add",step2:"Organize",step3:"Export",remove:"Remove",result:"PDF created"}
};
const text=()=>ui[language];

function msg(v,error=false){status.textContent=v;status.style.color=error?"var(--danger)":"var(--muted)"}
function bytes(n){if(!Number.isFinite(n))return"—";const units=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<3){v/=1024;i++}return v.toFixed(v>=100?0:v>=10?1:2)+" "+units[i]}
function set(sel,v){const e=$(sel);if(e)e.textContent=v}

function applyLanguage(){
  const x=text();
  document.documentElement.lang=language;
  set("#pdfmerge-lead",x.lead);set("#pdfmerge-local",x.local);set("#pdfmerge-drop-title",x.drop);set("#pdfmerge-drop-sub",x.sub);
  set("#pdfmerge-count-label",x.docs);set("#pdfmerge-pages-label",x.pages);set("#pdfmerge-size-label",x.size);
  set("#pdfmerge-list-title",x.list);set("#pdfmerge-list-sub",x.listSub);set("#pdfmerge-clear",x.clear);
  set("#pdfmerge-name-label",x.name);set("#pdfmerge-build",x.build);set("#pdfmerge-status",x.ready);
  set("#pdfmerge-privacy-title",x.privacy);set("#pdfmerge-privacy-body",x.privacyBody);
  set("#pdfmerge-step1",x.step1);set("#pdfmerge-step2",x.step2);set("#pdfmerge-step3",x.step3);
  set("#pdfmerge-result-label",x.result);set("#pdfmerge-download",x.download);set("#pdfmerge-lang",x.translate);set(".pdfmerge-back",x.back);
  render();
}

function render(){
  const x=text();
  list.replaceChildren();
  count.textContent=String(files.length);
  pageCount.textContent=files.length? "—":"0";
  size.textContent=bytes(files.reduce((n,f)=>n+f.size,0));
  build.disabled=files.length<2;
  if(!files.length){
    const e=document.createElement("div");e.className="pdfmerge-empty";e.textContent=x.empty;list.append(e);return;
  }
  files.forEach((f,i)=>{
    const row=document.createElement("div");row.className="pdfmerge-row";
    const idx=document.createElement("div");idx.className="pdfmerge-index";idx.textContent=String(i+1).padStart(2,"0");
    const info=document.createElement("div"),b=document.createElement("strong"),s=document.createElement("small");b.textContent=f.name;s.textContent=bytes(f.size);info.append(b,s);
    const up=document.createElement("button");up.className="pdfmerge-move";up.type="button";up.textContent="↑";up.title=language==="en"?"Move up":"Subir";up.disabled=i===0;
    up.addEventListener("click",()=>{[files[i-1],files[i]]=[files[i],files[i-1]];render()});
    const down=document.createElement("button");down.className="pdfmerge-move";down.type="button";down.textContent="↓";down.title=language==="en"?"Move down":"Descer";down.disabled=i===files.length-1;
    down.addEventListener("click",()=>{[files[i+1],files[i]]=[files[i],files[i+1]];render()});
    const rm=document.createElement("button");rm.className="pdfmerge-remove";rm.type="button";rm.textContent="×";rm.title=x.remove;
    rm.addEventListener("click",()=>{files.splice(i,1);render()});
    row.append(idx,info,up,down,rm);list.append(row);
  });
}

function add(fileList){
  const selected=[...fileList].filter(f=>f&&(/application\/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)));
  if(!selected.length){msg(text().addError,true);return}
  files.push(...selected);output=null;result.hidden=true;render();msg(text().ready);
}

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement("script");s.src=src;s.async=true;
    s.onload=()=>window.PDFLib?.PDFDocument?resolve(window.PDFLib):reject(new Error(text().engine));
    s.onerror=()=>reject(new Error(text().engine));document.head.appendChild(s);
  });
}
async function ensurePdfEngine(){
  if(window.PDFLib?.PDFDocument)return window.PDFLib;
  if(pdfEnginePromise)return pdfEnginePromise;
  pdfEnginePromise=(async()=>{
    try{return await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js")}catch{}
    try{return await loadScript("https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js")}catch{}
    try{
      const mod=await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");
      if(mod?.PDFDocument){window.PDFLib=mod;return mod}
    }catch{}
    throw new Error(text().engine);
  })();
  try{return await pdfEnginePromise}finally{pdfEnginePromise=null}
}

async function merge(){
  if(files.length<2){msg(text().need,true);return}
  build.disabled=true;clear.disabled=true;result.hidden=true;progress.style.width="0%";
  try{
    const lib=await ensurePdfEngine(),PDFDocument=lib.PDFDocument;
    const out=await PDFDocument.create();
    for(let i=0;i<files.length;i++){
      msg(text().loading+" "+(i+1)+"/"+files.length+"…");
      const src=await PDFDocument.load(await files[i].arrayBuffer(),{ignoreEncryption:true});
      (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p));
      progress.style.width=Math.round((i+1)/files.length*90)+"%";
      await new Promise(requestAnimationFrame);
    }
    msg(text().processing+"…");
    const data=await out.save({useObjectStreams:false});
    output=new Blob([data],{type:"application/pdf"});
    const safe=((name.value||"documento-unificado").trim().replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||"documento-unificado")+".pdf";
    resultName.textContent=safe;resultSize.textContent=bytes(output.size);result.hidden=false;progress.style.width="100%";
    downloadBtn.onclick=()=>{const u=URL.createObjectURL(output),a=document.createElement("a");a.href=u;a.download=safe;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)};
    msg(text().done);
  }catch(e){msg(e?.message||text().error,true)}
  finally{build.disabled=files.length<2;clear.disabled=false}
}

input.addEventListener("change",e=>{add(e.target.files);input.value=""});
drop.addEventListener("click",e=>{if(e.target!==input)input.click()});
drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});
drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));
drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag");add(e.dataTransfer.files)});
build.addEventListener("click",merge);
clear.addEventListener("click",()=>{files=[];output=null;result.hidden=true;progress.style.width="0%";render();msg(text().ready)});
langBtn.addEventListener("click",()=>{
  language=language==="en"?"pt":"en";
  const url=new URL(location.href);
  if(language==="en")url.searchParams.set("lang","en");else url.searchParams.delete("lang");
  history.replaceState(null,"",url.pathname+(url.search||""));
  applyLanguage();
  msg(text().ready);
});
applyLanguage();
})();