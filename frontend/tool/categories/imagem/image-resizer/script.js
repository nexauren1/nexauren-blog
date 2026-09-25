import { auth, onAuthStateChanged, getPlanState, verifyToolAccess } from "/tool/frontend/tool-access.js?v=20260925-resize-auth2";

const $=s=>document.querySelector(s);
const state={files:[],results:[],pro:false,limit:10,ratio:null,authReady:false,planReady:false};
const els={
  file:$("#file"),drop:$("#drop"),w:$("#w"),h:$("#h"),fit:$("#fit"),fmt:$("#fmt"),quality:$("#quality"),qv:$("#qv"),
  bg:$("#bg"),lock:$("#lock"),upscale:$("#upscale"),run:$("#run"),download:$("#download"),clear:$("#clear"),
  queue:$("#queue"),status:$("#status"),plan:$("#plan"),limit:$("#limit"),count:$("#count"),mode:$("#mode"),
  done:$("#done"),before:$("#totalBefore"),after:$("#totalAfter"),saved:$("#saved")
};

function bytes(n){
  if(!Number.isFinite(n))return "—";
  const u=["B","KB","MB","GB"];let i=0,v=n;
  while(v>=1024&&i<u.length-1){v/=1024;i++}
  return `${v.toFixed(v>=100?0:v>=10?1:2)} ${u[i]}`;
}
function ext(type){
  return type==="image/jpeg"?"jpg":type==="image/png"?"png":"webp";
}
function setStatus(text,error=false){
  els.status.textContent=text;
  els.status.className="status"+(error?" error":"");
}
function canRun(){return state.authReady&&state.planReady&&state.files.length>0}
function refreshButtons(){
  els.run.disabled=!canRun();
  els.download.disabled=state.results.length===0;
}
function revoke(url){try{URL.revokeObjectURL(url)}catch{}}
function loadImage(file){
  return new Promise((resolve,reject)=>{
    if(!file)return reject(new Error("Selecione uma imagem."));
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{revoke(url);resolve(img)};
    img.onerror=()=>{revoke(url);reject(new Error("Não foi possível ler esta imagem."))};
    img.src=url;
  });
}
function canvas(width,height){
  const c=document.createElement("canvas");
  c.width=Math.max(1,Math.round(width));c.height=Math.max(1,Math.round(height));
  return c;
}
function toBlob(c,type,quality){
  return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error("Falha ao exportar a imagem neste formato.")),type,quality));
}
function downloadBlob(blob,name){
  if(!blob)return;
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;a.rel="noopener";a.style.display="none";
  document.body.appendChild(a);
  try{a.click()}finally{a.remove();setTimeout(()=>revoke(url),1500)}
}
function renderQueue(){
  els.count.textContent=String(state.files.length);
  els.queue.replaceChildren();
  state.files.forEach((file,index)=>{
    const row=document.createElement("div");row.className="item";
    const img=document.createElement("img");img.className="thumb";img.alt="";img.src=URL.createObjectURL(file);
    img.onload=()=>revoke(img.src);
    const info=document.createElement("div");
    const name=document.createElement("b");name.textContent=file.name;
    const br=document.createElement("br");
    const small=document.createElement("small");small.textContent=bytes(file.size);
    info.append(name,br,small);
    const btn=document.createElement("button");btn.type="button";btn.className="preset remove";btn.textContent="Remover";
    btn.addEventListener("click",()=>{state.files.splice(index,1);renderQueue();refreshButtons();if(!state.files.length)setStatus("Adicione imagens para começar.")});
    row.append(img,info,btn);els.queue.append(row);
  });
}
function setPlanUI(){
  els.plan.textContent=state.pro?"NEXAUREN PRO · 50/lote":"NEXAUREN FREE · 10/lote";
  els.limit.textContent=String(state.limit);
}
async function loadPlan(){
  const [plan,access]=await Promise.all([
    getPlanState({force:true}),
    verifyToolAccess("image-resizer")
  ]);
  if(!plan?.authenticated)throw new Error("Entre na sua conta para continuar.");
  if(plan.pro===null||String(plan.status||"").toUpperCase()==="UNKNOWN")throw new Error("Não foi possível confirmar o seu plano.");
  if(plan.pro===true){
    if(String(plan.plan||"").toLowerCase()!=="pro"||String(plan.status||"").toUpperCase()!=="ACTIVE"||access?.unlocked!==true||access?.error)throw new Error("Não foi possível confirmar os recursos Pro.");
    state.pro=true;state.limit=50;
  }else{
    state.pro=false;state.limit=10;
  }
  state.planReady=true;setPlanUI();refreshButtons();
}
async function addFiles(list){
  const incoming=[...list].filter(file=>file&&file.type&&file.type.startsWith("image/"));
  if(!incoming.length){setStatus("Selecione ficheiros de imagem válidos.",true);return}
  const maxSize=state.pro?50:20;
  const room=Math.max(0,state.limit-state.files.length);
  if(!room){setStatus(`O seu plano permite até ${state.limit} imagens por lote.`,true);return}
  const accepted=incoming.slice(0,room).filter(file=>file.size<=maxSize*1024*1024);
  const sizeRejected=incoming.filter(file=>file.size>maxSize*1024*1024).length;
  const countRejected=Math.max(0,incoming.length-Math.min(incoming.length,room));
  state.files.push(...accepted);
  renderQueue();refreshButtons();
  if(sizeRejected||countRejected){
    const parts=[];
    if(countRejected)parts.push(`${countRejected} ultrapassaram o limite do lote`);
    if(sizeRejected)parts.push(`${sizeRejected} ultrapassaram ${maxSize} MB`);
    setStatus(parts.join(" · ")+".",true);
  }else{
    setStatus(`${state.files.length} imagem(ns) na fila.`);
  }
}
els.drop.addEventListener("click",()=>els.file.click());
els.file.addEventListener("change",async event=>{
  await addFiles(event.target.files);
  const first=state.files[0];
  if(first){try{const image=await loadImage(first);state.ratio=image.naturalWidth/image.naturalHeight;els.w.value=image.naturalWidth;els.h.value=image.naturalHeight}catch{}}
});
["dragenter","dragover"].forEach(type=>els.drop.addEventListener(type,event=>{event.preventDefault();els.drop.classList.add("drag")}));
["dragleave","drop"].forEach(type=>els.drop.addEventListener(type,event=>{event.preventDefault();els.drop.classList.remove("drag")}));
els.drop.addEventListener("drop",event=>addFiles(event.dataTransfer.files));
els.quality.addEventListener("input",()=>els.qv.textContent=`${els.quality.value}%`);
els.fit.addEventListener("change",()=>els.mode.textContent=els.fit.value==="cover"?"Preencher":els.fit.value==="stretch"?"Esticar":"Proporção");
els.w.addEventListener("input",()=>{
  if(els.lock.checked&&state.ratio&&Number(els.w.value)>0)els.h.value=Math.max(1,Math.round(Number(els.w.value)/state.ratio));
});
els.h.addEventListener("input",()=>{
  if(els.lock.checked&&state.ratio&&Number(els.h.value)>0)els.w.value=Math.max(1,Math.round(Number(els.h.value)*state.ratio));
});
document.querySelectorAll(".preset").forEach(button=>{
  if(!button.dataset.w)return;
  button.addEventListener("click",event=>{
    event.preventDefault();
    els.w.value=button.dataset.w;els.h.value=button.dataset.h;els.lock.checked=false;
  });
});
async function resizeOne(file){
  const image=await loadImage(file);
  const W=Math.max(1,Number(els.w.value)||1),H=Math.max(1,Number(els.h.value)||1);
  const max=state.pro?12000:6000;
  if(W>max||H>max)throw new Error(`Dimensão máxima: ${max}px.`);
  if(!els.upscale.checked&&(image.naturalWidth<W||image.naturalHeight<H)){
    const targetW=Math.min(W,image.naturalWidth),targetH=Math.min(H,image.naturalHeight);
    return draw(image,targetW,targetH);
  }
  return draw(image,W,H);
}
async function draw(image,W,H){
  const c=canvas(W,H),ctx=c.getContext("2d");
  if(!ctx)throw new Error("O navegador não conseguiu iniciar o processamento.");
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  const fit=els.fit.value;
  if(els.fmt.value==="image/jpeg"||els.bg.value!=="transparent"){
    ctx.fillStyle=els.bg.value==="transparent"?"#fff":els.bg.value;
    ctx.fillRect(0,0,W,H);
  }
  let dx=0,dy=0,dw=W,dh=H;
  if(fit!=="stretch"){
    const scale=fit==="cover"?Math.max(W/image.naturalWidth,H/image.naturalHeight):Math.min(W/image.naturalWidth,H/image.naturalHeight);
    dw=Math.max(1,Math.round(image.naturalWidth*scale));dh=Math.max(1,Math.round(image.naturalHeight*scale));
    dx=Math.round((W-dw)/2);dy=Math.round((H-dh)/2);
  }
  ctx.drawImage(image,dx,dy,dw,dh);
  return toBlob(c,els.fmt.value,Number(els.quality.value)/100);
}
async function run(){
  if(!state.authReady||!state.planReady)return setStatus("A conta ainda está a ser confirmada.",true);
  if(!state.files.length)return setStatus("Adicione pelo menos uma imagem.",true);
  if(state.files.length>state.limit)return setStatus(`O seu plano permite até ${state.limit} imagens por lote.`,true);
  els.run.disabled=true;els.download.disabled=true;state.results=[];refreshButtons();
  els.done.textContent="0";els.before.textContent="—";els.after.textContent="—";els.saved.textContent="—";
  setStatus(`A processar 0/${state.files.length}…`);
  let before=0,after=0,done=0;
  try{
    for(const file of state.files){
      before+=file.size;
      const blob=await resizeOne(file);
      after+=blob.size;
      state.results.push({name:file.name,blob});
      done++;
      els.done.textContent=String(done);els.before.textContent=bytes(before);els.after.textContent=bytes(after);
      els.saved.textContent=before?`${Math.max(0,Math.round((1-after/before)*100))}%`:"—";
      setStatus(`A processar ${done}/${state.files.length}…`);
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    els.download.disabled=state.results.length===0;
    setStatus(`${done} imagem(ns) redimensionada(s) com sucesso. Pode baixar os resultados.`);
  }catch(error){
    setStatus(error?.message||"Não foi possível processar as imagens.",true);
  }finally{
    els.run.disabled=!canRun();
  }
}
els.run.addEventListener("click",event=>{event.preventDefault();void run()});
els.download.addEventListener("click",event=>{
  event.preventDefault();
  if(!state.results.length)return setStatus("Primeiro redimensione pelo menos uma imagem.",true);
  state.results.forEach((result,index)=>{
    setTimeout(()=>downloadBlob(result.blob,`nexauren-resize-${String(index+1).padStart(2,"0")}${result.blob.type==="image/jpeg"?".jpg":result.blob.type==="image/png"?".png":".webp"}`),index*180);
  });
  setStatus(`${state.results.length} ficheiro(s) enviados para download.`);
});
els.clear.addEventListener("click",event=>{
  event.preventDefault();
  state.files=[];state.results=[];state.ratio=null;
  els.file.value="";els.queue.replaceChildren();els.count.textContent="0";els.done.textContent="0";
  els.before.textContent="—";els.after.textContent="—";els.saved.textContent="—";els.download.disabled=true;
  refreshButtons();setStatus("Adicione imagens para começar.");
});
onAuthStateChanged(auth,async user=>{
  state.authReady=true;
  if(!user){
    state.planReady=false;state.pro=false;state.limit=10;
    els.plan.textContent="Entre para continuar";els.limit.textContent="—";refreshButtons();
    setStatus("Entre na sua conta para usar o Image Resize Studio.");
    return;
  }
  setStatus("A confirmar o seu plano…");
  try{
    await loadPlan();
    setStatus(state.pro?"Pro ativo. Pode redimensionar até 50 imagens por lote.":"Pronto. Pode redimensionar até 10 imagens por lote.");
  }catch(error){
    state.planReady=false;state.pro=false;state.limit=10;els.plan.textContent="Conta não confirmada";els.limit.textContent="—";refreshButtons();
    setStatus(error?.message||"Não foi possível confirmar o seu plano.",true);
  }
});
