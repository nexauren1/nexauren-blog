(()=>{
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const symbols={MZN:"MT",ZAR:"R",AOA:"Kz",BRL:"R$",EUR:"€",USD:"$"};
const defaults={marketplace:{marketFee:10,paymentFee:2,taxFee:0,transport:50,packaging:20},direct:{marketFee:0,paymentFee:0,taxFee:0,transport:0,packaging:10},delivery:{marketFee:12,paymentFee:2,taxFee:0,transport:70,packaging:20}};
const keys=["productName","currency","purchase","transport","packaging","other","fixedFee","marketFee","paymentFee","taxFee","quantity","goal","discount","rounding"];
let mode="margin";
const num=id=>Math.max(0,Number.parseFloat($("#"+id)?.value)||0);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const symbol=()=>symbols[$("#currency").value]||$("#currency").value;
const money=v=>symbol()+" "+new Intl.NumberFormat("pt-PT",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(v)?v:0);
const pct=v=>new Intl.NumberFormat("pt-PT",{minimumFractionDigits:1,maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)+"%";
const ceilTo=(value,step)=>step>0?Math.ceil(value/step-1e-10)*step:value;
function goalValue(){return clamp(num("goal")||1,1,70)}
function calc(){
 const purchase=num("purchase"),transport=num("transport"),packaging=num("packaging"),other=num("other"),fixed=num("fixedFee");
 const qty=Math.max(1,Math.floor(num("quantity")||1));
 const variable=(num("marketFee")+num("paymentFee")+num("taxFee"))/100;
 const discount=clamp(num("discount"),0,90)/100;
 const cost=purchase+transport+packaging+other+(fixed/qty);
 const goal=goalValue()/100;
 const denom=mode==="margin"?(1-variable-goal):(1-variable);
 let paid=denom>0?(mode==="margin"?cost/denom:cost*(1+goal)/denom):0;
 let list=discount>0?paid/(1-discount):paid;
 list=ceilTo(list,num("rounding"));
 paid=list*(1-discount);
 const marketAmount=paid*num("marketFee")/100;
 const paymentAmount=paid*num("paymentFee")/100;
 const taxAmount=paid*num("taxFee")/100;
 const fees=marketAmount+paymentAmount+taxAmount;
 const net=paid-fees,profit=net-cost;
 return {qty,variable,discount,cost,paid,list,fees,profit,margin:paid?profit/paid:0,roi:cost?profit/cost:0,revenue:paid*qty,totalProfit:profit*qty,breakEven:variable<1?cost/(1-variable):0,discountSavings:list-paid};
}
function render(){
 const r=calc();
 const goal=goalValue();
 $("[data-live-goal]").textContent=pct(goal)+(mode==="margin"?" margem":" markup");
 $("#goalOutput").textContent=pct(goal);
 $$( "[data-currency-symbol]" ).forEach(el=>el.textContent=symbol());
 $("[data-list-price]").textContent=money(r.list);
 $("[data-customer-price]").textContent=money(r.paid);
 $("[data-profit]").textContent=money(r.profit);
 $("[data-cost]").textContent=money(r.cost);
 $("[data-fees]").textContent=money(r.fees);
 $("[data-fee-rate]").textContent=pct(r.variable*100)+" do preço";
 $("[data-margin]").textContent=pct(r.margin*100);
 $("[data-roi]").textContent=pct(r.roi*100);
 $("[data-break-even]").textContent=money(r.breakEven);
 $("[data-total-profit]").textContent=money(r.totalProfit);
 $("[data-quantity-note]").textContent=r.qty+" unidade"+(r.qty===1?"":"s");
 $("[data-share-qty]").textContent=r.qty;
 $("[data-share-revenue]").textContent=money(r.revenue);
 $("[data-discount-note]").textContent=r.discountSavings>0?"desconto de "+pct(r.discount*100):"sem desconto";
 $("[data-customer-note]").textContent=r.discountSavings>0?"líquido após "+pct(r.discount*100)+" de desconto":"preço final";
 const costW=r.paid>0?clamp(r.cost/r.paid*100,0,100):0;
 const feeW=r.paid>0?clamp(r.fees/r.paid*100,0,100-costW):0;
 $("[data-stack-cost]").style.width=costW+"%";
 $("[data-stack-fee]").style.width=feeW+"%";
 $("[data-stack-profit]").style.width=Math.max(0,100-costW-feeW)+"%";
 const positive=r.profit>=0;
 $("[data-result-title]").textContent=positive?"Preço recomendado":"Preço precisa de ajuste";
 $("[data-insight-icon]").textContent=positive?"✓":"!";
 $("[data-insight-icon]").style.background=positive?"rgba(43,211,148,.09)":"rgba(255,70,108,.09)";
 $("[data-insight-icon]").style.color=positive?"#6ce0b0":"#ff7895";
 $("[data-insight-title]").textContent=positive?(mode==="margin"?"O preço foi calculado para a margem escolhida.":"O preço foi calculado para o markup escolhido."):"A combinação de custos, taxas e objetivo ultrapassa o limite.";
 $("[data-insight-body]").textContent=positive?"Os custos operacionais e as taxas já entram no cálculo. O ponto de equilíbrio mostra o mínimo antes do lucro.":"Reduza a meta de lucro, ajuste os custos ou reveja as taxas para obter um preço calculável.";
 try{localStorage.setItem("nexauren-market-pricing",JSON.stringify({mode,values:Object.fromEntries(keys.map(k=>[k,$("#"+k)?.value??""]))}))}catch{}
}
function loadSaved(){
 try{
  const raw=JSON.parse(localStorage.getItem("nexauren-market-pricing")||"null"); if(!raw)return;
  mode=raw.mode==="markup"?"markup":"margin";
  keys.forEach(k=>{if(raw.values?.[k]!=null&&$("#"+k))$("#"+k).value=raw.values[k]});
  $$("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
 }catch{}
}
function reset(){
 const vals={currency:"MZN",purchase:"500",transport:"50",packaging:"20",other:"0",fixedFee:"0",marketFee:"10",paymentFee:"2",taxFee:"0",quantity:"10",goal:"30",discount:"0",rounding:"10",productName:""};
 Object.entries(vals).forEach(([k,v])=>{if($("#"+k))$("#"+k).value=v});
 mode="margin";$$("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));render();
}
function applyPreset(name){
 const d=defaults[name]||defaults.marketplace;
 $("#marketFee").value=d.marketFee;$("#paymentFee").value=d.paymentFee;$("#taxFee").value=d.taxFee;$("#transport").value=d.transport;$("#packaging").value=d.packaging;
 $$(".preset").forEach(b=>b.classList.toggle("active",b.dataset.preset===name));render();
}
async function copySummary(){
 const r=calc(),name=($("#productName").value||"Produto").trim();
 const summary=[name,"Preço de vitrine: "+money(r.list),"Cliente paga: "+money(r.paid),"Custo real: "+money(r.cost),"Taxas + imposto: "+money(r.fees),"Lucro/unidade: "+money(r.profit),"Margem: "+pct(r.margin*100),"ROI: "+pct(r.roi*100),"Ponto de equilíbrio: "+money(r.breakEven),"Quantidade: "+r.qty,"Lucro total: "+money(r.totalProfit)].join("\n");
 try{await navigator.clipboard.writeText(summary);const b=$("[data-copy]"),old=b.textContent;b.textContent="Copiado ✓";setTimeout(()=>b.textContent=old,1400)}catch{window.prompt("Copie o resumo:",summary)}
}
document.addEventListener("input",e=>{if(keys.includes(e.target.id))render()});
document.addEventListener("change",e=>{if(keys.includes(e.target.id))render()});
$$("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;$$("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));render()}));
$$("[data-preset]").forEach(b=>b.addEventListener("click",()=>applyPreset(b.dataset.preset)));
$("[data-copy]")?.addEventListener("click",copySummary);
$("[data-print]")?.addEventListener("click",()=>window.print());
$("[data-reset]")?.addEventListener("click",reset);
loadSaved();render();
})();