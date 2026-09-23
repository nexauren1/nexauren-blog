(() => {
  const defaults={quantity:1,salePrice:100,productCost:40,shippingCost:6,marketplaceFee:15,paymentFee:3,adsFee:0,otherCosts:0,currency:"EUR"};
  const fields=Object.keys(defaults).reduce((acc,id)=>(acc[id]=document.getElementById(id),acc),{});
  const symbols={EUR:"€",USD:"$",GBP:"£",MZN:"MT",BRL:"R$",ZAR:"R"};
  const formatter=new Intl.NumberFormat(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  function num(el){const value=Number.parseFloat(el.value);return Number.isFinite(value)?Math.max(0,value):0}
  function quantity(){return Math.max(1,Math.floor(num(fields.quantity)))}
  function money(value){const symbol=symbols[fields.currency.value]||fields.currency.value;const amount=Number.isFinite(value)?value:0;const sign=amount<0?"−":"";return `${sign}${symbol} ${formatter.format(Math.abs(amount))}`}
  function pct(value){const amount=Number.isFinite(value)?value:0;const sign=amount<0?"−":"";return `${sign}${formatter.format(Math.abs(amount))}%`}
  function updatePrefixes(){const symbol=symbols[fields.currency.value]||fields.currency.value;document.getElementById("currencyPrefix").textContent=symbol;document.querySelectorAll("[data-currency]").forEach(el=>el.textContent=symbol)}
  function row(label,value,cls=""){return `<div class="mfc-row ${cls}"><span>${label}</span><strong>${money(value)}</strong></div>`}
  function calculate(){
    const qty=quantity(), saleUnit=num(fields.salePrice), productUnit=num(fields.productCost), shippingUnit=num(fields.shippingCost), otherUnit=num(fields.otherCosts);
    const marketplaceRate=num(fields.marketplaceFee)/100, paymentRate=num(fields.paymentFee)/100, adsRate=num(fields.adsFee)/100;
    const sale=saleUnit*qty, product=productUnit*qty, shipping=shippingUnit*qty, other=otherUnit*qty;
    const marketplaceFee=sale*marketplaceRate, paymentFee=sale*paymentRate, adsFee=sale*adsRate;
    const totalFees=marketplaceFee+paymentFee+adsFee, totalCosts=product+shipping+other+totalFees, profit=sale-totalCosts;
    const margin=sale>0?(profit/sale)*100:0, roi=totalCosts>0?(profit/totalCosts)*100:0;
    document.getElementById("netProfit").textContent=money(profit);document.getElementById("margin").textContent=pct(margin);
    document.getElementById("revenue").textContent=money(sale);document.getElementById("totalCosts").textContent=money(totalCosts);document.getElementById("totalFees").textContent=money(totalFees);
    document.getElementById("roi").textContent=pct(roi);document.getElementById("quantityResult").textContent=`${qty} ${qty===1?"unidade":"unidades"}`;document.getElementById("unitPrice").textContent=money(saleUnit);
    document.getElementById("breakdown").innerHTML=[row(`Custo dos produtos · ${qty} un.`,product),row(`Custo de envio · ${qty} un.`,shipping),row("Taxa do marketplace",marketplaceFee,"fee"),row("Taxa de pagamento",paymentFee,"fee"),row("Publicidade / anúncios",adsFee,"fee"),row(`Outros custos · ${qty} un.`,other),row("Total de custos",totalCosts,"total")].join("");
    const profitCard=document.querySelector(".mfc-profit-card");profitCard.classList.toggle("is-positive",profit>=0);profitCard.classList.toggle("is-negative",profit<0);
  }
  function reset(){Object.entries(defaults).forEach(([key,value])=>{fields[key].value=value});updatePrefixes();calculate()}
  Object.values(fields).forEach(el=>{el.addEventListener("input",calculate);el.addEventListener("change",()=>{updatePrefixes();calculate()})});
  document.getElementById("reset").addEventListener("click",reset);updatePrefixes();calculate();
})();