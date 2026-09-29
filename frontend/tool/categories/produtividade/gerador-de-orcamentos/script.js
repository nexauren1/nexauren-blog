import {auth,onAuthStateChanged,verifyToolAccess,upgradeUrl} from "/tool/frontend/tool-access.js?v=20260923-access-2";

const TOOL_ID="gerador-de-orcamentos";
const STORAGE_KEY="nexauren:quote-draft:v2";
const gate=document.getElementById("gate");
const app=document.getElementById("app");
const unlock=document.getElementById("unlock");
const msg=document.getElementById("gate-msg");
const q=s=>document.querySelector(s);
const currencyEl=q("#currency");
const statusEl=q("#status");

const currencyConfig={
  MZN:{locale:"pt-MZ",currency:"MZN"},
  USD:{locale:"en-US",currency:"USD"},
  EUR:{locale:"pt-PT",currency:"EUR"},
  ZAR:{locale:"en-ZA",currency:"ZAR"}
};

function money(n){
  const code=currencyEl?.value||"MZN";
  const cfg=currencyConfig[code]||currencyConfig.MZN;
  return new Intl.NumberFormat(cfg.locale,{style:"currency",currency:cfg.currency,maximumFractionDigits:2}).format(Number(n)||0);
}

function announce(text){
  if(!statusEl)return;
  statusEl.textContent=text;
  clearTimeout(announce.timer);
  announce.timer=setTimeout(()=>statusEl.textContent="",2200);
}

function isoDate(date){return date.toISOString().slice(0,10)}
function defaultDates(){
  const now=new Date();
  const valid=new Date(now);
  valid.setDate(valid.getDate()+7);
  if(!q("#date").value)q("#date").value=isoDate(now);
  if(!q("#valid").value)q("#valid").value=isoDate(valid);
}

function row(item={description:"",qty:"1",unit:"0"}){
  const d=document.createElement("div");
  d.className="item";
  d.innerHTML='<input class="desc" aria-label="Descrição do item" placeholder="Descrição do serviço/produto"><input class="qty" aria-label="Quantidade" type="number" min="0" step="0.01" value="1"><input class="unit" aria-label="Preço unitário" type="number" min="0" step="0.01" value="0"><button type="button" class="remove-item" aria-label="Remover item">×</button>';
  d.querySelector(".desc").value=item.description??"";
  d.querySelector(".qty").value=item.qty??"1";
  d.querySelector(".unit").value=item.unit??"0";
  d.querySelectorAll("input").forEach(input=>input.addEventListener("input",()=>{calc();scheduleSave()}));
  d.querySelector(".remove-item").addEventListener("click",()=>{d.remove();calc();scheduleSave()});
  q("#items").appendChild(d);
}

function getItems(){
  return [...document.querySelectorAll(".item")].map(r=>({
    description:r.querySelector(".desc")?.value||"",
    qty:r.querySelector(".qty")?.value||"0",
    unit:r.querySelector(".unit")?.value||"0"
  }));
}

function calc(){
  let sub=0;
  document.querySelectorAll(".item").forEach(r=>{
    sub+=Number(r.querySelector(".qty")?.value||0)*Number(r.querySelector(".unit")?.value||0);
  });
  const disc=Math.min(100,Math.max(0,Number(q("#discount").value||0)));
  const tax=Math.min(100,Math.max(0,Number(q("#tax").value||0)));
  const discountAmount=sub*disc/100;
  const base=sub-discountAmount;
  const taxAmount=base*tax/100;
  q("#subtotal").textContent=money(sub);
  q("#discountOut").textContent=money(discountAmount);
  q("#taxOut").textContent=money(taxAmount);
  q("#total").textContent=money(base+taxAmount);
  return {sub,discountAmount,taxAmount,total:base+taxAmount};
}

function draft(){
  return {
    company:q("#company").value,
    client:q("#client").value,
    email:q("#email").value,
    number:q("#number").value,
    date:q("#date").value,
    valid:q("#valid").value,
    currency:q("#currency").value,
    discount:q("#discount").value,
    tax:q("#tax").value,
    notes:q("#notes").value,
    items:getItems()
  };
}

function saveDraft(show=true){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({savedAt:Date.now(),draft:draft()}));
    if(show)announce("Rascunho guardado neste navegador.");
  }catch{
    announce("Não foi possível guardar o rascunho neste navegador.");
  }
}

let saveTimer=0;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>saveDraft(false),500);
}

function restoreDraft(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    const d=raw?.draft;
    if(!d)return false;
    for(const id of ["company","client","email","number","date","valid","discount","tax","notes"]){
      if(q("#"+id)&&d[id]!=null)q("#"+id).value=d[id];
    }
    if(currencyEl&&currencyConfig[d.currency])currencyEl.value=d.currency;
    q("#items").innerHTML="";
    (Array.isArray(d.items)&&d.items.length?d.items:[{description:"",qty:"1",unit:"0"},{description:"",qty:"1",unit:"0"}]).forEach(row);
    calc();
    return true;
  }catch{return false}
}

function resetDraft(){
  try{localStorage.removeItem(STORAGE_KEY)}catch{}
  for(const id of ["company","client","email","notes"])q("#"+id).value="";
  q("#number").value="ORC-001";
  q("#discount").value="0";
  q("#tax").value="0";
  if(currencyEl)currencyEl.value="MZN";
  q("#date").value="";
  q("#valid").value="";
  q("#items").innerHTML="";
  row();row();
  defaultDates();
  calc();
  announce("Novo orçamento iniciado.");
}

function setGate(title,text,action,href){
  gate.hidden=false;app.hidden=true;
  msg.innerHTML="<strong>"+title+"</strong><br>"+text;
  unlock.textContent=action;
  unlock.onclick=()=>location.href=href;
}

async function start(){
  msg.textContent="A verificar o seu acesso…";
  const result=await verifyToolAccess(TOOL_ID);
  if(!result.authenticated){
    setGate("É necessária uma conta.","Entre ou crie uma conta Nexauren para usar esta ferramenta.","Entrar ou criar conta","/account");
    return;
  }
  if(result.unlocked){openApp();return}
  setGate("Esta ferramenta é exclusiva do Pro.","O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.","Ir para o plano Pro",upgradeUrl());
}

function openApp(){
  gate.hidden=true;
  app.hidden=false;
  if(!restoreDraft()){
    row();row();
    defaultDates();
    calc();
  }
  announce("Pronto. O seu orçamento é guardado automaticamente neste navegador.");
}

q("#add")?.addEventListener("click",()=>{row();calc();scheduleSave()});
q("#discount")?.addEventListener("input",()=>{calc();scheduleSave()});
q("#tax")?.addEventListener("input",()=>{calc();scheduleSave()});
currencyEl?.addEventListener("change",()=>{calc();scheduleSave()});
["company","client","email","number","date","valid","notes"].forEach(id=>q("#"+id)?.addEventListener("input",scheduleSave));
q("#save")?.addEventListener("click",()=>saveDraft(true));
q("#reset")?.addEventListener("click",()=>{
  if(confirm("Começar um novo orçamento e apagar o rascunho atual?"))resetDraft();
});
q("#print")?.addEventListener("click",()=>{saveDraft(false);window.print()});

q("#year").textContent=new Date().getFullYear();
onAuthStateChanged(auth,user=>{
  if(user)start();
  else setGate("É necessária uma conta.","Entre ou crie uma conta Nexauren para usar esta ferramenta.","Entrar ou criar conta","/account");
});
window.addEventListener("pageshow",()=>{if(auth.currentUser)start()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&auth.currentUser)start()});
