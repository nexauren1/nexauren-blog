import {auth,onAuthStateChanged,verifyToolAccess,upgradeUrl} from "/tool/frontend/tool-access.js?v=20260923-access-2";

const TOOL_ID="gerador-de-orcamentos";
const gate=document.getElementById("gate"),app=document.getElementById("app"),unlock=document.getElementById("unlock"),msg=document.getElementById("gate-msg");
const q=s=>document.querySelector(s),money=n=>"$"+Number(n||0).toFixed(2);

function row(){
  const d=document.createElement("div");d.className="item";
  d.innerHTML='<input class="desc" placeholder="Descrição do serviço/produto"><input class="qty" type="number" min="0" step="0.01" value="1"><input class="unit" type="number" min="0" step="0.01" value="0"><button type="button" aria-label="Remover">×</button>';
  d.querySelectorAll("input").forEach(x=>x.addEventListener("input",calc));
  d.querySelector("button").onclick=()=>{d.remove();calc()};
  q("#items").appendChild(d);
}
function calc(){
  let sub=0;
  document.querySelectorAll(".item").forEach(r=>sub+=Number(r.querySelector(".qty").value||0)*Number(r.querySelector(".unit").value||0));
  const disc=Math.min(100,Math.max(0,Number(q("#discount").value||0))),tax=Math.max(0,Number(q("#tax").value||0)),d=sub*disc/100,base=sub-d,t=base*tax/100;
  q("#subtotal").textContent=money(sub);q("#discountOut").textContent=money(d);q("#taxOut").textContent=money(t);q("#total").textContent=money(base+t);
}
function setGate(title,text,action,href){
  gate.hidden=false;app.hidden=true;
  msg.innerHTML='<strong>'+title+'</strong><br>'+text;
  unlock.textContent=action;unlock.onclick=()=>location.href=href;
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
  gate.hidden=true;app.hidden=false;
  if(!document.querySelector(".item")){row();row()}
  if(!q("#date").value)q("#date").value=new Date().toISOString().slice(0,10);
  calc();
}
q("#add").onclick=row;q("#discount").oninput=calc;q("#tax").oninput=calc;q("#print").onclick=()=>window.print();q("#year").textContent=new Date().getFullYear();

onAuthStateChanged(auth,user=>{if(user)start();else setGate("É necessária uma conta.","Entre ou crie uma conta Nexauren para usar esta ferramenta.","Entrar ou criar conta","/account")});
window.addEventListener("pageshow",()=>{if(auth.currentUser)start()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&auth.currentUser)start()});
