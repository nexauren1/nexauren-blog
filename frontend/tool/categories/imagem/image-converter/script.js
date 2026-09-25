import { auth, onAuthStateChanged, getPlanState, verifyToolAccess } from "/tool/frontend/tool-access.js?v=20260925-converter2";

const $=s=>document.querySelector(s);

const state={
  files:[],
  results:[],
  pro:false,
  planReady:false,
  objectUrls:[],
  failed:0
};

const LIMITS={
  free:{batch:10,maxMB:15,maxMP:16,maxEdge:6000},
  pro:{batch:50,maxMB:75,maxMP:40,maxEdge:10000}
};

const PRESETS={
  balanced:{format:"image/webp",quality:84,maxWidth:2560,maxHeight:2560},
  web:{format:"image/webp",quality:78,maxWidth:1920,maxHeight:1920},
  quality:{format:"image/avif",quality:92,maxWidth:3200,maxHeight:3200},
  small:{format:"image/webp",quality:68,maxWidth:1600,maxHeight:1600}
};

const els={
  files:$("#files"),drop:$("#drop"),format:$("#format"),preset:$("#preset"),quality:$("#quality"),qualityOut:$("#qualityOut"),
  maxWidth:$("#maxWidth"),maxHeight:$("#maxHeight"),background:$("#background"),naming:$("#naming"),fit:$("#fit"),
  rotation:$("#rotation"),flip:$("#flip"),effect:$("#effect"),
  convert:$("#convert"),downloadAll:$("#downloadAll"),clear:$("#clear"),status:$("#status"),queue:$("#queue"),
  results:$("#resultList"),count:$("#count"),formatStat:$("#formatStat"),qualityStat:$("#qualityStat"),limitStat:$("#limitStat"),
  sizeStat:$("#sizeStat"),transformStat:$("#transformStat"),plan:$("#plan"),planName:$("#planName"),planLimit:$("#planLimit")
};

function ext(type){return type==="image/jpeg"?"jpg":type==="image/png"?"png":type==="image/avif"?"avif":"webp";}

function bytes(n){
  if(!Number.isFinite(n))return "—";
  const u=["B","KB","MB","GB"];let i=0,v=n;
  while(v>=1024&&i<u.length-1){v/=1024;i++;}
  return `${v.toFixed(v>=100?0:v>=10?1:2)} ${u[i]}`;
}

function baseName(name){
  return String(name||"imagem")
    .replace(/\.[^.]+$/i,"")
    .replace(/[^a-zA-Z0-9À-ÿ _-]/g,"-")
    .replace(/\s+/g,"-")
    .replace(/-+/g,"-")
    .slice(0,90)||"imagem";
}

function status(message,error=false){
  els.status.textContent=message;
  els.status.style.color=error?"var(--forge-danger)":"";
}

function revokeUrls(){
  for(const url of state.objectUrls)URL.revokeObjectURL(url);
  state.objectUrls=[];
}

function currentLimits(){return state.pro?LIMITS.pro:LIMITS.free;}

function setPlanUI(){
  const lim=currentLimits();
  els.plan.classList.toggle("pro",state.pro);
  els.planName.textContent=state.pro?"NEXAUREN PRO":"NEXAUREN FREE";
  els.planLimit.textContent=`Até ${lim.batch} imagens · ${lim.maxMB} MB/ficheiro`;
  els.limitStat.textContent=`${lim.batch} / lote`;
  els.sizeStat.textContent=`${lim.maxMB} MB`;
}

function syncStats(){
  els.formatStat.textContent=ext(els.format.value).toUpperCase();
  els.qualityStat.textContent=els.quality.value+"%";
  const rotation=Number(els.rotation.value)||0;
  const flip=els.flip.value,effect=els.effect.value;
  const parts=[];
  if(rotation)parts.push(rotation+"°");
  if(flip!=="none")parts.push(flip==="h"?"Espelho H":flip==="v"?"Espelho V":"Espelho HV");
  if(effect==="grayscale")parts.push("Cinza");
  els.transformStat.textContent=parts.length?parts.join(" · "):"Original";
}

async function initPlan(){
  try{
    const [plan,access]=await Promise.all([getPlanState({force:true}),verifyToolAccess("image-converter")]);
    if(plan?.pro===true){
      if(String(plan.plan||"").toLowerCase()==="pro"&&String(plan.status||"").toUpperCase()==="ACTIVE"&&access?.unlocked===true&&!access?.error)state.pro=true;
      else throw new Error("Não foi possível confirmar os recursos Pro. Atualize a sessão e tente novamente.");
    }else state.pro=false;
    state.planReady=true;
    setPlanUI();
    els.convert.disabled=state.files.length===0;
    status(state.pro?"Pro ativo. Até 50 imagens por lote.":"Pronto. Até 10 imagens por lote.");
  }catch(e){
    state.planReady=false;
    els.convert.disabled=true;
    els.planName.textContent="Conta";
    els.planLimit.textContent="Não foi possível confirmar os recursos";
    els.limitStat.textContent="—";
    els.sizeStat.textContent="—";
    status(e?.message||"Não foi possível confirmar o plano.",true);
  }
}

function readInputFiles(list){
  return [...list].filter(f=>{
    if(!f)return false;
    if(f.type&&f.type.startsWith("image/"))return true;
    return /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif|tiff?)$/i.test(f.name||"");
  });
}

function addFiles(list){
  const incoming=readInputFiles(list);
  if(!incoming.length){status("Selecione ficheiros de imagem válidos.",true);return;}
  const lim=currentLimits();
  const room=Math.max(0,lim.batch-state.files.length);
  if(!room){status(`O plano atual permite até ${lim.batch} imagens por lote.`,true);return;}

  const accepted=[];
  let tooBig=0;
  for(const f of incoming.slice(0,room)){
    if(f.size>lim.maxMB*1024*1024){tooBig++;continue;}
    accepted.push(f);
  }
  const ignoredCount=Math.max(0,incoming.length-Math.min(incoming.length,room));
  state.files.push(...accepted);
  rebuildUrls();
  renderQueue();

  const messages=[];
  if(tooBig)messages.push(`${tooBig} acima de ${lim.maxMB} MB`);
  if(ignoredCount)messages.push(`${ignoredCount} excederam o limite do lote`);
  status(messages.length?messages.join(" · ")+".":`${state.files.length} imagem(ns) na fila.`,messages.length>0);
}

function renderQueue(){
  els.count.textContent=String(state.files.length);
  els.queue.replaceChildren();

  if(!state.files.length){
    els.queue.innerHTML='<div class="forge-empty">Nenhuma imagem selecionada.</div>';
    els.convert.disabled=true;
    return;
  }

  state.files.forEach((file,index)=>{
    const row=document.createElement("div");
    row.className="forge-item";

    const img=document.createElement("img");
    img.className="forge-thumb";
    img.alt="";
    img.src=state.objectUrls[index];

    const info=document.createElement("div");
    const name=document.createElement("b");
    name.textContent=file.name;
    const small=document.createElement("small");
    small.textContent=`${bytes(file.size)} · ${file.type||"imagem"}`;
    info.append(name,small);

    const btn=document.createElement("button");
    btn.className="forge-remove";
    btn.type="button";
    btn.textContent="Remover";
    btn.onclick=()=>{
      state.files.splice(index,1);
      rebuildUrls();
      renderQueue();
      status(state.files.length?`${state.files.length} imagem(ns) na fila.`:"Adicione imagens para começar.");
    };

    row.append(img,info,btn);
    els.queue.append(row);
  });

  els.convert.disabled=!state.planReady;
}

function rebuildUrls(){
  revokeUrls();
  state.objectUrls=state.files.map(file=>URL.createObjectURL(file));
}

function applyPreset(){
  const p=PRESETS[els.preset.value];
  if(!p)return;
  els.format.value=p.format;
  els.quality.value=p.quality;
  els.qualityOut.textContent=p.quality+"%";
  els.maxWidth.value=p.maxWidth;
  els.maxHeight.value=p.maxHeight;
  syncStats();
}

function targetSize(w,h,maxW,maxH,fit){
  if(!w||!h)return [1,1];
  let scale=1;
  if(fit==="width")scale=Math.min(1,maxW/w);
  else if(fit==="height")scale=Math.min(1,maxH/h);
  else scale=Math.min(1,maxW/w,maxH/h);
  return [Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))];
}

async function loadImage(file){
  if(typeof createImageBitmap==="function"){
    try{return await createImageBitmap(file,{imageOrientation:"from-image",premultiplyAlpha:"default",colorSpaceConversion:"default"});}catch{}
    try{return await createImageBitmap(file);}catch{}
  }

  return await new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();

    img.onload=()=>{
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror=()=>{
      URL.revokeObjectURL(url);
      const reader=new FileReader();

      reader.onload=()=>{
        const fallback=new Image();
        fallback.onload=()=>resolve(fallback);
        fallback.onerror=()=>reject(new Error("O navegador não conseguiu descodificar esta imagem."));
        fallback.src=reader.result;
      };

      reader.onerror=()=>reject(new Error("Não foi possível ler o ficheiro de imagem."));
      try{reader.readAsDataURL(file)}catch{reject(new Error("Não foi possível carregar esta imagem."))}
    };

    img.src=url;
  });
}

function imageSize(image){return [image.width||image.naturalWidth||0,image.height||image.naturalHeight||0];}

function canvasFor(w,h){
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)throw new Error("Dimensões inválidas.");
  if(w*h>32000000)throw new Error("A imagem resultante é demasiado grande para a memória disponível neste dispositivo.");
  const canvas=document.createElement("canvas");
  canvas.width=w;canvas.height=h;
  return canvas;
}

async function encodeCanvas(canvas,format,quality){
  const encode=type=>new Promise((resolve,reject)=>{
    try{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Formato de saída não suportado.")),type,quality);
    }catch(error){reject(error);}
  });

  try{
    return await encode(format);
  }catch{
    if(format==="image/avif")return await encode("image/webp");
    if(format==="image/webp")return await encode("image/png");
    throw new Error("Não foi possível gerar o ficheiro de saída neste navegador.");
  }
}

async function convertFile(file){
  const lim=currentLimits();
  if(file.size>lim.maxMB*1024*1024)throw new Error(`Ficheiro acima do limite de ${lim.maxMB} MB.`);

  const img=await loadImage(file);

  try{
    const [ow,oh]=imageSize(img);
    if(!ow||!oh)throw new Error("Não foi possível obter as dimensões desta imagem.");

    const megapixels=(ow*oh)/1000000;
    if(megapixels>lim.maxMP)throw new Error(`Imagem acima do limite de ${lim.maxMP} MP.`);
    if(Math.max(ow,oh)>lim.maxEdge)throw new Error(`Dimensão original acima de ${lim.maxEdge}px.`);

    const requestedW=Math.min(lim.maxEdge,Math.max(320,Number(els.maxWidth.value)||2560));
    const requestedH=Math.min(lim.maxEdge,Math.max(320,Number(els.maxHeight.value)||2560));
    const [baseW,baseH]=targetSize(ow,oh,requestedW,requestedH,els.fit.value);

    const rotation=Number(els.rotation.value)||0;
    const swap=rotation===90||rotation===270;
    const w=swap?baseH:baseW;
    const h=swap?baseW:baseH;
    const canvas=canvasFor(w,h);
    const ctx=canvas.getContext("2d",{alpha:true});

    if(!ctx)throw new Error("O navegador não conseguiu iniciar o processamento.");

    const format=els.format.value;
    if(format==="image/jpeg"){
      ctx.fillStyle=els.background.value==="#000000"?"#000000":"#ffffff";
      ctx.fillRect(0,0,w,h);
    }

    ctx.save();
    ctx.translate(w/2,h/2);
    if(rotation)ctx.rotate(rotation*Math.PI/180);

    const flipH=els.flip.value==="h"||els.flip.value==="both";
    const flipV=els.flip.value==="v"||els.flip.value==="both";
    ctx.scale(flipH?-1:1,flipV?-1:1);

    if(els.effect.value==="grayscale"&&"filter" in ctx)ctx.filter="grayscale(1)";
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    ctx.drawImage(img,-baseW/2,-baseH/2,baseW,baseH);
    ctx.restore();

    const blob=await encodeCanvas(canvas,format,Number(els.quality.value)/100);
    const actualType=blob.type||format;
    let name=baseName(file.name);
    if(els.naming.value==="suffix")name+="-nexauren";
    if(els.naming.value==="converted")name+="-converted";

    return {
      file,
      blob,
      name:`${name}.${ext(actualType)}`,
      width:w,
      height:h,
      sourceSize:file.size,
      fallback:actualType!==format
    };
  }finally{
    img.close?.();
  }
}

function renderResults(){
  els.downloadAll.disabled=!state.results.length;
  els.results.replaceChildren();

  if(!state.results.length){
    const empty=document.createElement("div");
    empty.className="forge-empty";
    empty.textContent="Os resultados aparecerão aqui.";
    els.results.append(empty);
    return;
  }

  state.results.forEach(result=>{
    const row=document.createElement("div");
    row.className="forge-result";

    const info=document.createElement("div");
    const name=document.createElement("b");
    name.textContent=result.name;
    const small=document.createElement("small");
    small.textContent=`${result.width}×${result.height} · ${bytes(result.blob.size)}${result.fallback?" · WebP (fallback)":""}`;
    info.append(name,small);

    const btn=document.createElement("button");
    btn.className="forge-btn";
    btn.type="button";
    btn.textContent="Baixar";
    btn.onclick=()=>downloadResult(result);

    row.append(info,btn);
    els.results.append(row);
  });
}

function downloadResult(result){
  const url=URL.createObjectURL(result.blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=result.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function convert(){
  if(!state.planReady){status("Aguarde a confirmação da conta.",true);return;}
  if(!state.files.length){status("Selecione pelo menos uma imagem.",true);return;}

  const lim=currentLimits();
  if(state.files.length>lim.batch){status(`O plano atual permite até ${lim.batch} imagens por lote.`,true);return;}

  state.results=[];
  state.failed=0;
  renderResults();

  els.convert.disabled=true;
  els.clear.disabled=true;

  for(let index=0;index<state.files.length;index++){
    try{
      const result=await convertFile(state.files[index]);
      state.results.push(result);
    }catch{
      state.failed++;
    }

    status(`A processar ${index+1}/${state.files.length}…`);
    renderResults();
    await new Promise(resolve=>requestAnimationFrame(resolve));
  }

  const done=state.results.length;
  if(done&&state.failed){
    status(`${done} processadas · ${state.failed} ignoradas por incompatibilidade ou limite. Pode baixar os resultados.`,true);
  }else if(done){
    status(`${done} imagem(ns) convertida(s) com sucesso.`);
  }else{
    status("Nenhuma imagem pôde ser convertida. Verifique os ficheiros e os limites do plano.",true);
  }

  els.convert.disabled=!state.files.length||!state.planReady;
  els.clear.disabled=false;
}

function clearAll(){
  state.files=[];
  state.results=[];
  state.failed=0;
  revokeUrls();
  els.files.value="";
  renderQueue();
  renderResults();
  status("Lote limpo.");
}

els.files.addEventListener("change",event=>{
  addFiles(event.target.files);
  event.target.value="";
});

els.drop.addEventListener("dragover",event=>{
  event.preventDefault();
  els.drop.classList.add("drag");
});

els.drop.addEventListener("dragleave",()=>els.drop.classList.remove("drag"));

els.drop.addEventListener("drop",event=>{
  event.preventDefault();
  els.drop.classList.remove("drag");
  addFiles(event.dataTransfer.files);
});

els.preset.addEventListener("change",()=>{
  if(els.preset.value!=="custom")applyPreset();
});

els.quality.addEventListener("input",event=>{
  els.qualityOut.textContent=event.target.value+"%";
  els.preset.value="custom";
  syncStats();
});

["format","maxWidth","maxHeight","background","naming","fit","rotation","flip","effect"].forEach(id=>{
  els[id].addEventListener("change",()=>{
    if(id!=="format")els.preset.value="custom";
    syncStats();
  });
});

els.convert.onclick=convert;
els.downloadAll.onclick=()=>state.results.forEach((result,index)=>setTimeout(()=>downloadResult(result),index*180));
els.clear.onclick=clearAll;

window.addEventListener("beforeunload",revokeUrls);

syncStats();
applyPreset();

let authReady=false;

onAuthStateChanged(auth,async user=>{
  if(authReady&&!user){
    state.planReady=false;
    state.pro=false;
    setPlanUI();
    els.convert.disabled=true;
    status("A sessão terminou. Entre novamente para continuar.",true);
    return;
  }

  authReady=true;

  if(!user){
    state.planReady=false;
    state.pro=false;
    els.planName.textContent="Conta";
    els.planLimit.textContent="Entre para continuar";
    els.limitStat.textContent="—";
    els.sizeStat.textContent="—";
    els.convert.disabled=true;
    status("Entre na sua conta para usar o Image Forge.",true);
    return;
  }

  await initPlan();
});
