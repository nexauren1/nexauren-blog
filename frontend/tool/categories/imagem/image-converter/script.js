import { auth, onAuthStateChanged, getPlanState, verifyToolAccess } from "/tool/frontend/tool-access.js?v=20260925";

const $=s=>document.querySelector(s);
const state={files:[],results:[],pro:false,planReady:false,objectUrls:[]};
const PRESETS={
  balanced:{format:"image/webp",quality:84,maxWidth:2560,maxHeight:2560},
  web:{format:"image/webp",quality:78,maxWidth:1920,maxHeight:1920},
  quality:{format:"image/avif",quality:92,maxWidth:3200,maxHeight:3200},
  small:{format:"image/webp",quality:68,maxWidth:1600,maxHeight:1600}
};

function ext(type){return type==="image/jpeg"?"jpg":type==="image/png"?"png":type==="image/avif"?"avif":"webp";}
function bytes(n){if(!Number.isFinite(n))return "—";const u=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++;}return `${v.toFixed(v>=100?0:v>=10?1:2)} ${u[i]}`;}
function baseName(name){return String(name||"imagem").replace(/\.[^.]+$/i,"").replace(/[^a-zA-Z0-9À-ÿ _-]/g,"-").replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,90)||"imagem";}
function toast(message){$("#status").textContent=message;}
function setPlanUI(){
  const plan=$("#plan"),name=$("#planName"),limit=$("#planLimit"),stat=$("#limitStat");
  plan.classList.toggle("pro",state.pro);
  name.textContent=state.pro?"NEXAUREN PRO":"NEXAUREN FREE";
  limit.textContent=state.pro?"Lotes ilimitados":"Até 10 imagens por lote";
  stat.textContent=state.pro?"Ilimitado":"10 / lote";
}
async function initPlan(){
  try{
    const [plan,access]=await Promise.all([getPlanState({force:true}),verifyToolAccess("image-converter")]);
    if(plan?.pro===true){
      if(plan.plan?.toLowerCase()==="pro"&&plan.status?.toUpperCase()==="ACTIVE"&&access?.unlocked===true&&!access?.error){state.pro=true;}
      else throw new Error("Não foi possível confirmar os recursos Pro. Atualize a sessão e tente novamente.");
    }
    state.planReady=true;setPlanUI();$("#convert").disabled=state.files.length===0;toast(state.pro?"Pro ativo. Pode converter quantas imagens precisar.":"Pronto. Pode converter até 10 imagens por lote.");
  }catch(e){
    state.planReady=false;$("#planName").textContent="Conta";$("#planLimit").textContent="Não foi possível confirmar os recursos";$("#convert").disabled=true;toast(e.message||"Não foi possível confirmar o plano.");
  }
}
function renderQueue(){
  const q=$("#queue");$("#count").textContent=state.files.length;
  if(!state.files.length){q.innerHTML='<div class="forge-empty">Nenhuma imagem selecionada.</div>';$("#convert").disabled=true;return;}
  q.innerHTML=state.files.map((f,i)=>`<div class="forge-item"><img class="forge-thumb" src="${state.objectUrls[i]}" alt=""><div><b>${escapeHtml(f.name)}</b><small>${bytes(f.size)} · ${f.type||"imagem"}</small></div><button class="forge-remove" data-remove="${i}" aria-label="Remover">Remover</button></div>`).join("");
  q.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.remove);state.files.splice(i,1);revokeUrls();state.objectUrls=state.files.map(f=>URL.createObjectURL(f));renderQueue();});
  $("#convert").disabled=!state.planReady;
}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
function revokeUrls(){state.objectUrls.forEach(u=>URL.revokeObjectURL(u));state.objectUrls=[];}
function addFiles(list){
  const incoming=[...list].filter(f=>f.type.startsWith("image/"));
  if(!incoming.length)return toast("Selecione ficheiros de imagem válidos.");
  const max=state.pro?Infinity:10;
  const combined=[...state.files,...incoming];
  if(combined.length>max){state.files=combined.slice(0,max);toast(state.pro?"":"O plano Free permite até 10 imagens por lote.");}
  else state.files=combined;
  revokeUrls();state.objectUrls=state.files.map(f=>URL.createObjectURL(f));renderQueue();
}
function applyPreset(){const p=PRESETS[$("#preset").value];if(!p)return;$("#format").value=p.format;$("#quality").value=p.quality;$("#qualityOut").textContent=p.quality+"%";$("#maxWidth").value=p.maxWidth;$("#maxHeight").value=p.maxHeight;syncStats();}
function syncStats(){$("#formatStat").textContent=ext($("#format").value).toUpperCase();$("#qualityStat").textContent=$("#quality").value+"%";}
function targetSize(w,h,maxW,maxH,fit){if(!maxW&&!maxH)return [w,h];let scale=1;if(fit==="width"&&maxW)scale=Math.min(1,maxW/w);else if(fit==="height"&&maxH)scale=Math.min(1,maxH/h);else scale=Math.min(1,maxW?w?maxW/w:1:1,maxH?h?maxH/h:1:1);return [Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))];}
async function loadImage(file){return await new Promise((resolve,reject)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error(`Não foi possível abrir ${file.name}.`))};img.src=u;});}
async function convertFile(file){
  const img=await loadImage(file);const format=$("#format").value;const quality=Number($("#quality").value)/100;const maxW=Math.max(320,Number($("#maxWidth").value)||2560);const maxH=Math.max(320,Number($("#maxHeight").value)||2560);const fit=$("#fit").value;const [w,h]=targetSize(img.naturalWidth,img.naturalHeight,maxW,maxH,fit);const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{alpha:true});
  if(format==="image/jpeg"){ctx.fillStyle=$("#background").value==="#000000"?"#000000":"#ffffff";ctx.fillRect(0,0,w,h);}else{ctx.clearRect(0,0,w,h);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,0,0,w,h);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error(`O navegador não suporta ${ext(format).toUpperCase()} nesta imagem.`)),format,quality));
  const naming=$("#naming").value;let name=baseName(file.name);if(naming==="suffix")name+="-nexauren";if(naming==="converted")name+="-converted";return {file,blob,name:`${name}.${ext(blob.type||format)}`,width:w,height:h};
}
function renderResults(){
  const box=$("#resultList");$("#downloadAll").disabled=!state.results.length;if(!state.results.length){box.className="forge-empty";box.textContent="Os resultados aparecerão aqui.";return;}
  box.className="";box.innerHTML=state.results.map((r,i)=>`<div class="forge-result"><div><b>${escapeHtml(r.name)}</b><small>${r.width}×${r.height} · ${bytes(r.blob.size)}</small></div><button class="forge-btn" data-download="${i}">Baixar</button></div>`).join("");
  box.querySelectorAll("[data-download]").forEach(b=>b.onclick=()=>downloadResult(state.results[Number(b.dataset.download)]));
}
function downloadResult(r){const u=URL.createObjectURL(r.blob);const a=document.createElement("a");a.href=u;a.download=r.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
async function convert(){
  if(!state.planReady)return toast("Aguarde a confirmação da conta.");if(!state.files.length)return toast("Selecione pelo menos uma imagem.");
  if(!state.pro&&state.files.length>10)return toast("O plano Free permite até 10 imagens por lote.");
  state.results=[];renderResults();$("#convert").disabled=true;$("#clear").disabled=true;toast(`A converter 0/${state.files.length}…`);
  try{
    for(let i=0;i<state.files.length;i++){const r=await convertFile(state.files[i]);state.results.push(r);toast(`A converter ${i+1}/${state.files.length}…`);}
    renderResults();toast(`${state.results.length} imagem(ns) convertida(s) com sucesso.`);
    try{await fetch("/api/tools/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tool_id:"image-converter",event:"convert_batch",count:state.results.length})});}catch{}
  }catch(e){toast(e.message||"Não foi possível converter as imagens.");renderResults();}
  finally{$("#convert").disabled=!state.files.length||!state.planReady;$("#clear").disabled=false;}
}
function clearAll(){state.files=[];state.results=[];revokeUrls();$("#files").value="";renderQueue();renderResults();toast("Lote limpo.");}

$("#files").addEventListener("change",e=>addFiles(e.target.files));
const drop=$("#drop");drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag");addFiles(e.dataTransfer.files)});
$("#preset").addEventListener("change",()=>{$("#preset").value!=="custom"&&applyPreset();});
$("#quality").addEventListener("input",e=>{$("#qualityOut").textContent=e.target.value+"%";$("#preset").value="custom";syncStats();});
["format","maxWidth","maxHeight","background","naming","fit"].forEach(id=>$("#"+id).addEventListener("change",()=>{if(id!=="format")$("#preset").value="custom";syncStats();}));
$("#convert").onclick=convert;$("#downloadAll").onclick=()=>{state.results.forEach((r,i)=>setTimeout(()=>downloadResult(r),i*180));};$("#clear").onclick=clearAll;
window.addEventListener("beforeunload",revokeUrls);
syncStats();
applyPreset();

let authReady=false;
onAuthStateChanged(auth,async user=>{
  if(authReady&& !user){state.planReady=false;state.pro=false;setPlanUI();$("#convert").disabled=true;toast("A sessão terminou. Entre novamente para continuar.");return;}
  authReady=true;
  if(!user){
    state.planReady=false;state.pro=false;
    $("#planName").textContent="Conta";
    $("#planLimit").textContent="Entre para continuar";
    $("#limitStat").textContent="—";
    $("#convert").disabled=true;
    toast("Entre na sua conta para usar o Image Forge.");
    return;
  }
  await initPlan();
});