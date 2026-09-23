const $=s=>document.querySelector(s);
const value=$("#value"),from=$("#from"),scale=$("#scale"),results=$("#results"),exact=$("#exact"),message=$("#message");
const decimalUnits=[["B",1],["KB",1e3],["MB",1e6],["GB",1e9],["TB",1e12]],binaryUnits=[["KiB",1024],["MiB",1024**2],["GiB",1024**3],["TiB",1024**4]];
const format=n=>Number.isInteger(n)?n.toLocaleString("pt-PT"):n.toLocaleString("pt-PT",{maximumFractionDigits:12});
const all=[...decimalUnits,...binaryUnits];
function convert(){
 const n=Number(value.value),entry=all.find(u=>u[0]===from.value);
 if(!Number.isFinite(n)||n<0||!entry){message.textContent="Introduza um valor válido.";message.className="message error";return}
 const bytes=n*entry[1],units=scale.value==="binary"?binaryUnits:decimalUnits;
 results.innerHTML=units.map(([unit,m])=>'<div class="result"><span class="unit">'+unit+'</span><strong>'+format(bytes/m)+'</strong><small>'+unit+(unit==="B"?" · bytes":"")+'</small></div>').join("");
 exact.textContent=format(bytes)+" B";
 message.textContent="Conversão concluída localmente.";message.className="message ok"
}
$("#convert").addEventListener("click",convert);
value.addEventListener("keydown",e=>{if(e.key==="Enter")convert()});
from.addEventListener("change",convert);scale.addEventListener("change",convert);
document.querySelectorAll("[data-v]").forEach(btn=>btn.addEventListener("click",()=>{value.value=btn.dataset.v;from.value="B";convert()}));
$("#copyExact").addEventListener("click",async()=>{if(exact.textContent==="—")return;try{await navigator.clipboard.writeText(exact.textContent);message.textContent="Valor exato copiado.";message.className="message ok"}catch{message.textContent="Não foi possível copiar.";message.className="message error"}});
convert();