import { workerFetch } from "./account-client.js?v=20260922-3";

const esc = (value) => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#39;");

function statusLabel(b){
  if(b?.status==="ACTIVE") return "Pro ativo";
  if(b?.status==="APPROVED") return "A aguardar ativação";
  if(b?.status==="APPROVAL_PENDING") return "A aguardar aprovação";
  if(b?.status==="SUSPENDED") return "Pagamento suspenso";
  if(b?.status==="CANCELLED") return "Cancelado";
  return "Free";
}
function billingMarkup(b,notice=""){
  const pro=b?.plan==="pro" && b?.status==="ACTIVE";
  return `
    <section class="billing-panel">
      <div class="billing-kicker">NEXAUREN PLANS</div>
      <div class="billing-head">
        <div><h3>Escolha o seu plano</h3><p>Comece grátis ou desbloqueie os recursos Pro por $5/mês.</p></div>
        <span class="billing-status">${esc(statusLabel(b))}</span>
      </div>
      ${notice?'<div class="billing-notice">'+esc(notice)+'</div>':""}
      <div class="billing-plans">
        <article class="billing-plan ${!pro?"current":""}">
          <div class="billing-plan-top"><span>Free</span>${!pro?"<b>ATUAL</b>":""}</div>
          <strong>$0</strong><small>para sempre</small>
          <ul><li>Acesso às ferramentas gratuitas</li><li>Conta Nexauren</li><li>Recursos essenciais</li></ul>
          <button class="billing-btn muted" type="button" disabled>${!pro?"Plano atual":"Free"}</button>
        </article>
        <article class="billing-plan pro ${pro?"current":""}">
          <div class="billing-plan-top"><span>Pro</span><b>PAYPAL</b></div>
          <strong>$5<small>/mês</small></strong>
          <p>Mais recursos e funcionalidades Pro à medida que forem disponibilizados.</p>
          <ul><li>Recursos premium</li><li>Experiências Pro</li><li>Pagamento recorrente seguro via PayPal</li></ul>
          ${pro
            ? '<button class="billing-btn danger" data-billing-cancel type="button">Cancelar Pro</button>'
            : '<button class="billing-btn" data-billing-upgrade type="button">Assinar Pro por $5</button>'}
        </article>
      </div>
      ${pro&&b.current_period_end?'<div class="billing-meta">Próxima cobrança: '+esc(new Date(b.current_period_end).toLocaleDateString("pt-PT"))+'</div>':""}
    </section>
  `;
}
function safeReturnTo(value){
  try{const u=new URL(String(value||""),location.origin);if(u.origin!==location.origin||!u.pathname.startsWith("/tool/"))return "";return u.pathname+u.search}catch{return ""}
}

async function initBilling(root){
  const host=root.querySelector("[data-billing]");
  if(!host)return;
  let notice="";
  const params=new URLSearchParams(location.search);
  const paypal=params.get("paypal");
  const subscriptionId=params.get("subscription_id");
  const requestedReturn=safeReturnTo(params.get("return_to")||sessionStorage.getItem("nexauren-tool-return")||"");
  if(requestedReturn){try{sessionStorage.setItem("nexauren-tool-return",requestedReturn)}catch{}}
  try{
    if(paypal==="success"&&subscriptionId){
      host.innerHTML='<div class="billing-loading">A confirmar a sua assinatura PayPal…</div>';
      const confirmed=await workerFetch("/api/account/paypal/confirm",{method:"POST",body:JSON.stringify({subscription_id:subscriptionId})});
      const activated=confirmed?.paypal_status==="ACTIVE"||confirmed?.billing?.status==="ACTIVE";
      notice=activated
        ?"Assinatura Pro ativada com sucesso."
        :"O PayPal recebeu a aprovação. A ativação será concluída assim que o estado da assinatura ficar ativo.";
      history.replaceState({},document.title,"/account/upgrade/");
      if(activated&&requestedReturn){try{sessionStorage.removeItem("nexauren-tool-return")}catch{};location.replace(requestedReturn);return}
    }else if(paypal==="cancel"){
      notice="O processo PayPal foi cancelado. A sua conta continua no plano Free.";
      history.replaceState({},document.title,"/account/upgrade/");
    }
    const result=await workerFetch("/api/account/billing");
    host.innerHTML=billingMarkup(result.billing,notice);
  }catch(error){
    host.innerHTML=billingMarkup({plan:"free",status:"FREE"},"Erro ao carregar assinatura: " + (error?.message || "erro desconhecido") + (error?.code ? " [" + error.code + "]" : ""));
    if(paypal)history.replaceState({},document.title,"/account/upgrade/");
  }
  const upgrade=host.querySelector("[data-billing-upgrade]");
  if(upgrade)upgrade.onclick=async()=>{
    upgrade.disabled=true;upgrade.textContent="A preparar PayPal…";
    try{
      const result=await workerFetch("/api/account/paypal/create",{method:"POST",body:"{}"});
      if(result?.approval_url) location.href=result.approval_url;
      else throw new Error("Não foi possível abrir o PayPal.");
    }catch(error){
      upgrade.disabled=false;upgrade.textContent="Assinar Pro por $5";
      host.insertAdjacentHTML("afterbegin",'<div class="billing-notice error">'+esc(error.message||"Não foi possível iniciar o pagamento.")+'</div>');
    }
  };
  const cancel=host.querySelector("[data-billing-cancel]");
  if(cancel)cancel.onclick=async()=>{
    if(!confirm("Cancelar a assinatura Pro agora?"))return;
    cancel.disabled=true;cancel.textContent="A cancelar…";
    try{
      await workerFetch("/api/account/paypal/cancel",{method:"POST",body:"{}"});
      await initBilling(root);
    }catch(error){
      cancel.disabled=false;cancel.textContent="Cancelar Pro";
      host.insertAdjacentHTML("afterbegin",'<div class="billing-notice error">'+esc(error.message||"Não foi possível cancelar.")+'</div>');
    }
  };
}
export { initBilling };
