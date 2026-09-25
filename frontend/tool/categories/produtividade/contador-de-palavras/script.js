import {auth,onAuthStateChanged,verifyToolAccess,upgradeUrl} from "/tool/frontend/tool-access.js?v=20260923-access-2";

(()=> {
  const TOOL_ID="contador-de-palavras";
  const text=document.querySelector("#text"),app=document.querySelector("#tool-app"),gate=document.querySelector("#account-gate");
  const gateTitle=gate?.querySelector("h3"),gateBody=gate?.querySelector("p"),gateLink=gate?.querySelector("a");
  const els={words:document.querySelector("#words"),chars:document.querySelector("#chars"),charsNoSpace:document.querySelector("#charsNoSpace"),lines:document.querySelector("#lines"),read:document.querySelector("#read")};

  function update(){
    const v=text.value;
    const words=v.trim()?v.trim().split(/\s+/).length:0;
    const lines=v?v.split(/\n/).length:0;
    const minutes=words?Math.max(1,Math.ceil(words/200)):0;
    els.words.textContent=words.toLocaleString("pt-PT");
    els.chars.textContent=v.length.toLocaleString("pt-PT");
    els.charsNoSpace.textContent=v.replace(/\s/g,"").length.toLocaleString("pt-PT");
    els.lines.textContent=lines.toLocaleString("pt-PT");
    els.read.textContent=minutes+" min";
  }

  function setGate(title,body,action,href){
    gate.hidden=false;app.hidden=true;
    gateTitle.textContent=title;gateBody.textContent=body;gateLink.textContent=action;gateLink.href=href;
  }

  function openApp(){
    gate.hidden=true;app.hidden=false;update();
    setTimeout(()=>text.focus(),0);
  }

  async function syncAccess(){
    const result=await verifyToolAccess(TOOL_ID);
    if(result.unlocked){openApp();return}
    if(result.error){
      setGate("Não foi possível verificar o acesso.","Não conseguimos confirmar o estado do seu plano agora. Tente novamente.","Tentar novamente",location.href);
      return;
    }
    if(result.requiresPro){
      setGate("Esta ferramenta é exclusiva do Pro.","O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.","Ir para o plano Pro",upgradeUrl());
      return;
    }
    setGate("Não foi possível verificar o acesso.","Não conseguimos confirmar o estado do seu plano agora. Tente novamente.","Tentar novamente",location.href);
  }

  text.addEventListener("input",update);
  document.querySelector("#clear").addEventListener("click",()=>{text.value="";text.focus();update()});
  document.querySelector("#copy").addEventListener("click",async()=>{
    if(!text.value)return;
    try{
      await navigator.clipboard.writeText(text.value);
      const b=document.querySelector("#copy"),old=b.textContent;
      b.textContent="Copiado ✓";
      setTimeout(()=>b.textContent=old,1200)
    }catch{}
  });

  onAuthStateChanged(auth,user=>{
    if(user)syncAccess();
    else setGate("É necessária uma conta.","Entre ou crie uma conta Nexauren para usar esta ferramenta.","Entrar ou criar conta","/account");
  });
  window.addEventListener("pageshow",()=>{if(auth.currentUser)syncAccess()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&auth.currentUser)syncAccess()});
})();
