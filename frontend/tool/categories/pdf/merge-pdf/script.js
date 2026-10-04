(()=>{
"use strict";

const $=s=>document.querySelector(s);
const copyBtn=$("#pdfmerge-copy");
const input=$("#pdfmerge-files");
const drop=$("#pdfmerge-drop");
const list=$("#pdfmerge-list");
const build=$("#pdfmerge-build");
const clear=$("#pdfmerge-clear");
const status=$("#pdfmerge-status");
const count=$("#pdfmerge-count");
const pageCount=$("#pdfmerge-pages");
const size=$("#pdfmerge-size");
const name=$("#pdfmerge-name");
const progress=$("#pdfmerge-progress");
const result=$("#pdfmerge-result");
const resultName=$("#pdfmerge-result-name");
const resultSize=$("#pdfmerge-result-size");
const downloadBtn=$("#pdfmerge-download");
const langBtn=$("#pdfmerge-lang");

const LANG_KEY="nexauren:pdfmerge:language";
const params=new URLSearchParams(location.search);
let language=params.get("lang")==="pt"?"pt":"en";
let files=[];
let output=null;

const ui={
  en:{
    title:"Merge PDF Files Online Free",
    kicker:"PDF ASSEMBLY",
    lead:"Combine multiple PDF files into one document, organize the order, and do everything locally in your browser.",
    local:"LOCAL · NO UPLOAD",
    drop:"Add PDFs",
    sub:"Tap to select documents or drag them here",
    docs:"Documents",
    pages:"Pages",
    size:"Size",
    list:"Assembly queue",
    listSub:"The order will be preserved in the final PDF.",
    clear:"Clear",
    empty:"Add at least two PDF files to start.",
    name:"PDF name",
    build:"Merge PDFs",
    copy:"Copy summary",
    ready:"Ready for documents.",
    done:"PDF created successfully.",
    error:"Could not create the PDF.",
    invalid:"Select valid PDF files.",
    reading:"Reading",
    download:"Download PDF",
    back:"← PDF",
    translate:"Português",
    remove:"Remove",
    result:"PDF created",
    footer:"Merge PDFs · Nexauren Tools",
assembly:"Assembly", add:"Add", organize:"Organize", export:"Export", privacyTitle:"Privacy first", privacyBody:"Your documents stay on your device while the assembly happens.",
    seo:seo=>`
      <article class="nx-seo-card">
        <div class="nx-seo-kicker">SEARCH GUIDE</div>
        <h2>Combine multiple PDFs into one document</h2>
        <p>Merge PDFs by adding multiple documents to an ordered queue and exporting them as one file. The browser handles the assembly locally so you can combine documents without uploading them to a remote processor.</p>
        <p>Use it for reports, applications, scanned documents, school files, business documents, or any workflow where several PDFs need to become one document.</p>
        <div class="nx-seo-grid">
          <div><b>Use case</b><span>Combine two or more PDF files</span></div>
          <div><b>Workflow</b><span>Preserve the order of documents in the queue</span></div>
          <div><b>Local processing</b><span>The PDF is processed directly in your browser.</span></div>
        </div>
      </article>
      <article class="nx-seo-card">
        <h2>Common uses</h2>
        <ul>
          <li>Combine two or more PDF files</li>
          <li>Preserve the order of documents in the queue</li>
          <li>Create one final PDF for sharing</li>
          <li>Process the document set in the browser</li>
        </ul>
      </article>
      <article class="nx-seo-card">
        <h2>Nexauren PDF Merger FAQ</h2>
        <div class="nx-faq"><h3>Can I merge several PDFs?</h3><p>Yes. Add multiple PDF files to the assembly queue.</p></div>
        <div class="nx-faq"><h3>Does the order matter?</h3><p>Yes. The final PDF follows the document order in the queue.</p></div>
        <div class="nx-faq"><h3>Does the original PDF get changed?</h3><p>No. A new combined PDF is exported.</p></div>
      </article>
      <article class="nx-seo-card">
        <h2>More PDF tools</h2>
        <p>Continue with another focused PDF workflow.</p>
        <div class="nx-seo-grid">
          <div><a href="/tool/categories/pdf/jpg-to-pdf/"><b>JPG to PDF</b><span>Convert images into a PDF.</span></a></div>
          <div><a href="/tool/categories/pdf/merge-pdf/"><b>Merge PDF</b><span>Combine PDF documents.</span></a></div>
          <div><a href="/tool/categories/pdf/split-pdf/"><b>Split PDF</b><span>Separate PDF pages.</span></a></div>
        </div>
      </article>`
  },
  pt:{
    title:"Juntar PDFs Online Grátis",
    kicker:"MONTAGEM DE PDF",
    lead:"Combine vários ficheiros PDF num único documento, organize a ordem e faça tudo localmente no seu navegador.",
    local:"LOCAL · SEM UPLOAD",
    drop:"Adicionar PDFs",
    sub:"Toque para selecionar documentos ou arraste-os para aqui",
    docs:"Documentos",
    pages:"Páginas",
    size:"Tamanho",
    list:"Fila de montagem",
    listSub:"A ordem será mantida no PDF final.",
    clear:"Limpar",
    empty:"Adicione pelo menos dois ficheiros PDF para começar.",
    name:"Nome do PDF",
    build:"Juntar PDFs",
    copy:"Copiar resumo",
    ready:"Pronto para receber documentos.",
    done:"PDF criado com sucesso.",
    error:"Não foi possível criar o PDF.",
    invalid:"Selecione ficheiros PDF válidos.",
    reading:"A ler",
    download:"Baixar PDF",
    back:"← PDF",
    translate:"English",
    remove:"Remover",
    result:"PDF criado",
    footer:"Juntar PDFs · Ferramentas Nexauren",
assembly:"Montagem", add:"Adicionar", organize:"Organizar", export:"Exportar", privacyTitle:"Privacidade primeiro", privacyBody:"Os seus documentos permanecem no seu dispositivo enquanto a montagem acontece.",
    seo:seo=>`
      <article class="nx-seo-card">
        <div class="nx-seo-kicker">GUIA RÁPIDO</div>
        <h2>Combine vários PDFs num único documento</h2>
        <p>Junte PDFs adicionando vários documentos a uma fila ordenada e exportando-os como um único ficheiro. A montagem é feita localmente no navegador, sem enviar os documentos para um processador remoto.</p>
        <p>Use esta ferramenta para relatórios, candidaturas, documentos digitalizados, trabalhos escolares, documentos empresariais ou qualquer fluxo em que vários PDFs precisem de se tornar um só documento.</p>
        <div class="nx-seo-grid">
          <div><b>Utilização</b><span>Combine dois ou mais ficheiros PDF</span></div>
          <div><b>Fluxo</b><span>Mantenha a ordem dos documentos na fila</span></div>
          <div><b>Processamento local</b><span>O PDF é processado diretamente no seu navegador.</span></div>
        </div>
      </article>
      <article class="nx-seo-card">
        <h2>Utilizações comuns</h2>
        <ul>
          <li>Combine dois ou mais ficheiros PDF</li>
          <li>Mantenha a ordem dos documentos na fila</li>
          <li>Crie um PDF final para partilhar</li>
          <li>Processe o conjunto de documentos no navegador</li>
        </ul>
      </article>
      <article class="nx-seo-card">
        <h2>Perguntas frequentes sobre o Juntar PDF</h2>
        <div class="nx-faq"><h3>Posso juntar vários PDFs?</h3><p>Sim. Adicione vários ficheiros PDF à fila de montagem.</p></div>
        <div class="nx-faq"><h3>A ordem dos ficheiros é importante?</h3><p>Sim. O PDF final segue a ordem dos documentos na fila.</p></div>
        <div class="nx-faq"><h3>O PDF original é alterado?</h3><p>Não. É exportado um novo PDF combinado.</p></div>
      </article>
      <article class="nx-seo-card">
        <h2>Mais ferramentas PDF</h2>
        <p>Continue com outro fluxo de trabalho PDF.</p>
        <div class="nx-seo-grid">
          <div><a href="/tool/categories/pdf/jpg-to-pdf/"><b>JPG para PDF</b><span>Converta imagens num PDF.</span></a></div>
          <div><a href="/tool/categories/pdf/merge-pdf/"><b>Juntar PDF</b><span>Combine documentos PDF.</span></a></div>
          <div><a href="/tool/categories/pdf/split-pdf/"><b>Dividir PDF</b><span>Separe páginas de um PDF.</span></a></div>
        </div>
      </article>`
  }
};

const t=()=>ui[language];

function setText(selector,value){
  const el=$(selector);
  if(el)el.textContent=value;
}

function setMeta(){
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content=language==="en"
    ?"Merge multiple PDF files online for free. Add documents, keep their order, combine them into one PDF, and download the result directly in your browser."
    :"Junte vários ficheiros PDF online gratuitamente. Adicione documentos, mantenha a ordem, combine-os num único PDF e descarregue o resultado diretamente no navegador.";
  document.title=language==="en"
    ?"Merge PDF Files Online Free | Combine PDFs | Nexauren"
    :"Juntar PDFs Online Grátis | Combinar PDFs | Nexauren";
}

function syncLanguageUrl(){
  const u=new URL(location.href);
  if(language==="pt")u.searchParams.set("lang","pt");
  else u.searchParams.delete("lang");
  history.replaceState(null,"",u.pathname+(u.search||""));
}

function applyLanguage(){
  const x=t();
  document.documentElement.lang=language;
  setText(".pdfmerge-kicker",x.kicker);
  setText(".pdfmerge-hero h1",x.title);
  setText("#pdfmerge-lead",x.lead);
  setText("#pdfmerge-local",x.local);
  setText("#pdfmerge-drop-title",x.drop);
  setText("#pdfmerge-drop-sub",x.sub);
  setText("#pdfmerge-count-label",x.docs);
  setText("#pdfmerge-pages-label",x.pages);
  setText("#pdfmerge-size-label",x.size);
  setText("#pdfmerge-list-title",x.list);
  setText("#pdfmerge-list-sub",x.listSub);
  setText("#pdfmerge-clear",x.clear);
  setText("#pdfmerge-name-label",x.name);
  setText("#pdfmerge-build",x.build);
  setText("#pdfmerge-copy",x.copy);
  setText("#pdfmerge-result-label",x.result);
  setText("#pdfmerge-download",x.download);
  setText("#pdfmerge-lang",x.translate);
  setText(".pdfmerge-back",x.back);
  setText(".pdfmerge-footer",x.footer);
  setText("#pdfmerge-side-title",x.assembly);
  setText("#pdfmerge-step1",x.add);
  setText("#pdfmerge-step2",x.organize);
  setText("#pdfmerge-step3",x.export);
  setText("#pdfmerge-privacy-title",x.privacyTitle);
  setText("#pdfmerge-privacy-body",x.privacyBody);
  setText("#pdfmerge-status",x.ready);
  const seo=$(".nx-seo");
  if(seo)seo.innerHTML=x.seo();
  setMeta();
  render();
}

function bytes(n){
  const units=["B","KB","MB","GB"];
  let i=0;
  let value=n;
  while(value>=1024&&i<3){value/=1024;i++}
  return value.toFixed(value>=100?0:value>=10?1:2)+" "+units[i];
}

function msg(value,error=false){
  if(status){
    status.textContent=value;
    status.style.color=error?"#d82049":"#68758a";
  }
}

function render(){
  const x=t();
  list.replaceChildren();
  count.textContent=String(files.length);
  pageCount.textContent=files.length?"—":"0";
  size.textContent=bytes(files.reduce((sum,file)=>sum+file.size,0));
  build.disabled=files.length<2;

  if(!files.length){
    const empty=document.createElement("div");
    empty.className="pdfmerge-empty";
    empty.textContent=x.empty;
    list.append(empty);
    return;
  }

  files.forEach((file,index)=>{
    const row=document.createElement("div");
    row.className="pdfmerge-row";

    const idx=document.createElement("div");
    idx.className="pdfmerge-index";
    idx.textContent=String(index+1).padStart(2,"0");

    const info=document.createElement("div");
    const strong=document.createElement("strong");
    const small=document.createElement("small");
    strong.textContent=file.name;
    small.textContent=bytes(file.size);
    info.append(strong,small);

    const up=document.createElement("button");
    up.className="pdfmerge-move";
    up.textContent="↑";
    up.disabled=index===0;
    up.title=language==="en"?"Move up":"Mover para cima";
    up.onclick=()=>{
      [files[index-1],files[index]]=[files[index],files[index-1]];
      render();
    };

    const down=document.createElement("button");
    down.className="pdfmerge-move";
    down.textContent="↓";
    down.disabled=index===files.length-1;
    down.title=language==="en"?"Move down":"Mover para baixo";
    down.onclick=()=>{
      [files[index+1],files[index]]=[files[index],files[index+1]];
      render();
    };

    const remove=document.createElement("button");
    remove.className="pdfmerge-remove";
    remove.textContent="×";
    remove.title=x.remove;
    remove.setAttribute("aria-label",x.remove);
    remove.onclick=()=>{
      files.splice(index,1);
      render();
    };

    row.append(idx,info,up,down,remove);
    list.append(row);
  });
}

function add(filesList){
  const selected=[...filesList].filter(file=>file&&(/application\/pdf/i.test(file.type)||/\.pdf$/i.test(file.name)));
  if(!selected.length){
    msg(t().invalid,true);
    return;
  }
  files.push(...selected);
  render();
  msg(t().ready);
}

async function engine(){
  if(window.PDFLib?.PDFDocument)return window.PDFLib;
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
  await new Promise((resolve,reject)=>{
    script.onload=resolve;
    script.onerror=reject;
    document.head.append(script);
  });
  return window.PDFLib;
}

async function merge(){
  if(files.length<2)return;

  build.disabled=true;
  clear.disabled=true;
  copyBtn.disabled=true;
  result.hidden=true;
  progress.style.width="0%";

  try{
    const {PDFDocument}=await engine();
    const merged=await PDFDocument.create();
    let totalPages=0;

    for(let i=0;i<files.length;i++){
      msg(t().reading+" "+(i+1)+"/"+files.length+"…");
      const source=await PDFDocument.load(await files[i].arrayBuffer(),{ignoreEncryption:true});
      const pages=await merged.copyPages(source,source.getPageIndices());
      pages.forEach(page=>merged.addPage(page));
      totalPages+=pages.length;
      pageCount.textContent=String(totalPages);
      progress.style.width=Math.round((i+1)/files.length*90)+"%";
      await new Promise(requestAnimationFrame);
    }

    const data=await merged.save({useObjectStreams:false});
    output=new Blob([data],{type:"application/pdf"});
    const safe=((name.value||"merged-pdf").trim().replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||"merged-pdf")+".pdf";

    resultName.textContent=safe;
    resultSize.textContent=bytes(output.size);
    result.hidden=false;
    progress.style.width="100%";
    msg(t().done);

    downloadBtn.onclick=()=>{
      const url=URL.createObjectURL(output);
      const anchor=document.createElement("a");
      anchor.href=url;
      anchor.download=safe;
      anchor.click();
      setTimeout(()=>URL.revokeObjectURL(url),1200);
    };

    copyBtn.disabled=false;
    copyBtn.onclick=async()=>{
      const summary=language==="en"
        ? "Merged PDF: "+safe+" · "+totalPages+" pages · "+bytes(output.size)
        : "PDF combinado: "+safe+" · "+totalPages+" páginas · "+bytes(output.size);
      try{
        await navigator.clipboard.writeText(summary);
        msg(language==="en"?"Summary copied.":"Resumo copiado.");
      }catch{
        msg(language==="en"?"Could not copy the summary.":"Não foi possível copiar o resumo.",true);
      }
    };
  }catch(error){
    msg(error?.message||t().error,true);
  }finally{
    build.disabled=files.length<2;
    clear.disabled=false;
    copyBtn.disabled=!output;
  }
}

input.onchange=event=>{
  add(event.target.files);
  input.value="";
};

drop.onclick=event=>{
  if(event.target!==input)input.click();
};

drop.ondragover=event=>{
  event.preventDefault();
  drop.classList.add("drag");
};

drop.ondragleave=()=>{
  drop.classList.remove("drag");
};

drop.ondrop=event=>{
  event.preventDefault();
  drop.classList.remove("drag");
  add(event.dataTransfer.files);
};

build.onclick=merge;

clear.onclick=()=>{
  files=[];
  output=null;
  result.hidden=true;
  progress.style.width="0%";
  copyBtn.disabled=true;
  render();
  msg(t().ready);
};

langBtn.onclick=(event)=>{
  event.preventDefault();
  event.stopPropagation();
  language=language==="en"?"pt":"en";
  localStorage.setItem(LANG_KEY,language);
  syncLanguageUrl();
  applyLanguage();
  msg(t().ready);
};

localStorage.setItem(LANG_KEY,language);
applyLanguage();
})();