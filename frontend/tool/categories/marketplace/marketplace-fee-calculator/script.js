(() => {
  const defaults={salePrice:100,productCost:40,shippingCost:6,marketplaceFee:15,paymentFee:3,adsFee:0,otherCosts:0,currency:"EUR"};
  const fields=Object.keys(defaults).reduce((acc,id)=>(acc[id]=document.getElementById(id),acc),{});
  const symbols={EUR:"€",USD:"$",GBP:"£",MZN:"MT",BRL:"R$",ZAR:"R"};
  const formatter=new Intl.NumberFormat(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

  function num(el){const value=Number.parseFloat(el.value);return Number.isFinite(value)?Math.max(0,value):0}
  function money(value){
    const code=fields.currency.value;
    return `${symbols[code]||code} ${formatter.format(Math.max(0,value))}`;
  }
  function pct(value){return `${formatter.format(value)}%`}

  function updatePrefixes(){
    const symbol=symbols[fields.currency.value]||fields.currency.value;
    document.getElementById("currencyPrefix").textContent=symbol;
    document.querySelectorAll("[data-currency]").forEach(el=>el.textContent=symbol);
  }

  function row(label,value,cls=""){
    return `<div class="mfc-row ${cls}"><span>${label}</span><strong>${money(value)}</strong></div>`;
  }

  function calculate(){
    const sale=num(fields.salePrice);
    const product=num(fields.productCost);
    const shipping=num(fields.shippingCost);
    const marketplaceRate=num(fields.marketplaceFee)/100;
    const paymentRate=num(fields.paymentFee)/100;
    const adsRate=num(fields.adsFee)/100;
    const other=num(fields.otherCosts);

    const marketplaceFee=sale*marketplaceRate;
    const paymentFee=sale*paymentRate;
    const adsFee=sale*adsRate;
    const totalFees=marketplaceFee+paymentFee+adsFee;
    const totalCosts=product+shipping+other+totalFees;
    const profit=sale-totalCosts;
    const margin=sale>0?(profit/sale)*100:0;
    const roi=totalCosts>0?(profit/totalCosts)*100:0;

    document.getElementById("netProfit").textContent=money(profit);
    document.getElementById("margin").textContent=pct(margin);
    document.getElementById("revenue").textContent=money(sale);
    document.getElementById("totalCosts").textContent=money(totalCosts);
    document.getElementById("totalFees").textContent=money(totalFees);
    document.getElementById("roi").textContent=pct(roi);

    document.getElementById("breakdown").innerHTML=[
      row("Custo do produto",product),
      row("Custo de envio",shipping),
      row("Taxa do marketplace",marketplaceFee),
      row("Taxa de pagamento",paymentFee),
      row("Publicidade / anúncios",adsFee),
      row("Outros custos",other),
      row("Total de custos",totalCosts,"total")
    ].join("");

    const profitEl=document.getElementById("netProfit");
    const marginEl=document.getElementById("margin");
    const positive=profit>=0;
    profitEl.style.color=positive?"#bff5ff":"#ff9daa";
    marginEl.style.color=positive?"#64e2aa":"#ff9daa";
  }

  function reset(){
    Object.entries(defaults).forEach(([key,value])=>{fields[key].value=value});
    updatePrefixes();
    calculate();
  }

  Object.values(fields).forEach(el=>{
    el.addEventListener("input",calculate);
    el.addEventListener("change",()=>{updatePrefixes();calculate()});
  });
  document.getElementById("reset").addEventListener("click",reset);
  updatePrefixes();
  calculate();
})();