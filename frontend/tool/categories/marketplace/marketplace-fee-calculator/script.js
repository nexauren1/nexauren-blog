(() => {
  const defaults={quantity:1,salePrice:100,productCost:40,shippingCost:6,marketplaceFee:15,paymentFee:3,adsFee:0,fixedFee:0,otherCosts:0,discount:0,taxRate:0,taxMode:"included",fixedCosts:0,targetMargin:20,targetProfit:0,currency:"EUR"};
  const fields=Object.keys(defaults).reduce((acc,id)=>(acc[id]=document.getElementById(id),acc),{});
  const symbols={EUR:"€",USD:"$",GBP:"£",MZN:"MT",BRL:"R$",ZAR:"R"};
  const formatter=new Intl.NumberFormat(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  function num(el){const value=Number.parseFloat(el?.value);return Number.isFinite(value)?Math.max(0,value):0}
  function quantity(){return Math.max(1,Math.floor(num(fields.quantity)))}
  function rate(el){return Math.min(100,num(el))/100}
  function money(value){const symbol=symbols[fields.currency.value]||fields.currency.value;const amount=Number.isFinite(value)?value:0;const sign=amount<0?"−":"";return `${sign}${symbol} ${formatter.format(Math.abs(amount))}`}
  function pct(value){const amount=Number.isFinite(value)?value:0;const sign=amount<0?"−":"";return `${sign}${formatter.format(Math.abs(amount))}%`}
  function units(value){return `${value} ${value===1?"unidade":"unidades"}`}
  function updatePrefixes(){const symbol=symbols[fields.currency.value]||fields.currency.value;document.getElementById("currencyPrefix").textContent=symbol;document.querySelectorAll("[data-currency]").forEach(el=>el.textContent=symbol)}
  function row(label,value,cls=""){return `<div class="mfc-row ${cls}"><span>${label}</span><strong>${money(value)}</strong></div>`}
  function economics(price){
    const discount=rate(fields.discount), tax=rate(fields.taxRate);
    const marketplace=rate(fields.marketplaceFee), payment=rate(fields.paymentFee), ads=rate(fields.adsFee);
    const feeRate=marketplace+payment+ads, fixedFee=num(fields.fixedFee);
    const discountedPrice=price*(1-discount);
    let customerTotal, netRevenueBeforeFees, taxPerUnit;
    if(fields.taxMode.value==="added"){customerTotal=discountedPrice*(1+tax);netRevenueBeforeFees=discountedPrice;taxPerUnit=customerTotal-netRevenueBeforeFees}
    else{customerTotal=discountedPrice;netRevenueBeforeFees=tax>0?discountedPrice/(1+tax):discountedPrice;taxPerUnit=discountedPrice-netRevenueBeforeFees}
    const percentFees=customerTotal*feeRate;
    const fees=percentFees+fixedFee;
    const product=num(fields.productCost), shipping=num(fields.shippingCost), other=num(fields.otherCosts);
    const variableCost=product+shipping+other+fees;
    const profitPerUnit=netRevenueBeforeFees-variableCost;
    const totalRevenue=netRevenueBeforeFees*quantity();
    const totalTax=taxPerUnit*quantity();
    const totalFees=fees*quantity();
    const totalVariableCosts=variableCost*quantity();
    const totalProfit=totalRevenue-totalVariableCosts-num(fields.fixedCosts);
    const margin=totalRevenue>0?(totalProfit/totalRevenue)*100:0;
    const totalCosts=totalRevenue-totalProfit;
    const roi=totalCosts>0?(totalProfit/totalCosts)*100:0;
    return {discountedPrice,customerTotal,netRevenueBeforeFees,taxPerUnit,percentFees,fees,product,shipping,other,variableCost,profitPerUnit,totalRevenue,totalTax,totalFees,totalVariableCosts,totalProfit,margin,totalCosts,roi,feeRate,taxRate:tax,discountRate:discount};
  }
  function requiredPrice(target="breakEven"){
    const d=rate(fields.discount), t=rate(fields.taxRate), f=rate(fields.marketplaceFee)+rate(fields.paymentFee)+rate(fields.adsFee), fixed=num(fields.fixedFee);
    let revenueCoeff, feeCoeff;
    if(fields.taxMode.value==="added"){revenueCoeff=(1-d);feeCoeff=(1-d)*(1+t)*f}
    else{revenueCoeff=(1-d)/(1+t);feeCoeff=(1-d)*f}
    const profitCoeff=revenueCoeff-feeCoeff;
    const unitBase=num(fields.productCost)+num(fields.shippingCost)+num(fields.otherCosts)+fixed;
    if(profitCoeff<=0)return Infinity;
    if(target==="breakEven")return unitBase/profitCoeff;
    if(target==="margin"){const margin=rate(fields.targetMargin);const denominator=profitCoeff-margin*revenueCoeff;return denominator>0?unitBase/denominator:Infinity}
    if(target==="profit"){const perUnitTarget=num(fields.targetProfit)/quantity();return (unitBase+perUnitTarget+num(fields.fixedCosts)/quantity())/profitCoeff}
    return 0;
  }
  function scenarioCard(label,price,isCurrent=false){
    const e=economics(price), state=e.totalProfit>=0?"positive":"negative";
    return `<div class="mfc-scenario ${isCurrent?"current":""}"><span>${label}</span><strong>${money(price)}</strong><em>Lucro: <b class="${state}">${money(e.totalProfit)}</b></em><em>Margem: <b class="${state}">${pct(e.margin)}</b></em></div>`
  }
  function calculate(){
    const qty=quantity(), price=num(fields.salePrice), e=economics(price);
    document.getElementById("netProfit").textContent=money(e.totalProfit);
    document.getElementById("margin").textContent=pct(e.margin);
    document.getElementById("unitProfit").textContent=money(e.profitPerUnit);
    document.getElementById("unitTotalCost").textContent=money(e.variableCost+num(fields.fixedCosts)/qty);
    document.getElementById("unitRevenue").textContent=money(e.netRevenueBeforeFees);
    document.getElementById("revenue").textContent=money(e.totalRevenue);
    document.getElementById("totalCosts").textContent=money(e.totalCosts);
    document.getElementById("totalFees").textContent=money(e.totalFees);
    document.getElementById("taxTotal").textContent=money(e.totalTax);
    document.getElementById("discountTotal").textContent=money((price-e.discountedPrice)*qty);
    document.getElementById("roi").textContent=pct(e.roi);
    document.getElementById("quantityResult").textContent=units(qty);
    document.getElementById("unitPrice").textContent=money(price);
    document.getElementById("unitFees").textContent=money(e.fees);
    document.getElementById("breakdown").innerHTML=[
      row(`Preço bruto · ${qty} un.`,price*qty),
      row(`Desconto · ${qty} un.`,(price-e.discountedPrice)*qty,"fee"),
      row(`Custo dos produtos · ${qty} un.`,e.product*qty),
      row(`Custo de envio · ${qty} un.`,e.shipping*qty),
      row("Taxa do marketplace",e.percentFees*(rate(fields.marketplaceFee)/(e.feeRate||1)),"fee"),
      row("Taxa de pagamento",e.percentFees*(rate(fields.paymentFee)/(e.feeRate||1)),"fee"),
      row("Publicidade / anúncios",e.percentFees*(rate(fields.adsFee)/(e.feeRate||1)),"fee"),
      row(`Comissão fixa · ${qty} un.`,num(fields.fixedFee)*qty,"fee"),
      row(`Outros custos · ${qty} un.`,e.other*qty),
      row(fields.taxMode.value==="added"?"Imposto / IVA acrescentado":"Imposto / IVA incluído",e.totalTax,"tax"),
      row("Custos fixos da operação",num(fields.fixedCosts)),
      row("Total de custos",e.totalCosts,"total")
    ].join("");
    document.getElementById("minimumPrice").textContent=money(requiredPrice("breakEven"));
    document.getElementById("marginPrice").textContent=money(requiredPrice("margin"));
    document.getElementById("profitPrice").textContent=num(fields.targetProfit)>0?money(requiredPrice("profit")):"—";
    const contribution=e.profitPerUnit;
    document.getElementById("contributionUnit").textContent=money(contribution);
    document.getElementById("breakEvenUnits").textContent=contribution>0?units(Math.max(0,Math.ceil(num(fields.fixedCosts)/contribution))):"Não atingível";
    document.getElementById("scenarios").innerHTML=[scenarioCard("−10% DO PREÇO",price*.9),scenarioCard("PREÇO ATUAL",price,true),scenarioCard("+10% DO PREÇO",price*1.1)].join("");
    const profitCard=document.querySelector(".mfc-profit-card");
    profitCard.classList.toggle("is-positive",e.totalProfit>=0);profitCard.classList.toggle("is-negative",e.totalProfit<0);
  }
  function reset(){Object.entries(defaults).forEach(([key,value])=>{fields[key].value=value});updatePrefixes();calculate()}
  Object.values(fields).forEach(el=>{el.addEventListener("input",calculate);el.addEventListener("change",()=>{updatePrefixes();calculate()})});
  document.getElementById("reset").addEventListener("click",reset);
  updatePrefixes();calculate();
})();