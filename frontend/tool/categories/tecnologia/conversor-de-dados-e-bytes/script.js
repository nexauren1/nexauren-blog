const $=s=>document.querySelector(s);
const value=$("#value"),from=$("#from"),scale=$("#scale"),results=$("#results"),exact=$("#exact"),message=$("#message"),copyExact=$("#copyExact"),copyAll=$("#copyAll");let lastBytes=null;
const decimalUnits=[["B",1],["KB",1e3],["MB",1e6],["GB",1e9],["TB",1e12]],binaryUnits=[["KiB",1024],["MiB",1024**2],["GiB",1024**3],["TiB",1024**4]];
const format=n=>Number.isInteger(n)?n.toLocaleString("pt-PT"):n.toLocaleString("pt-PT",{maximumFractionDigits:12});
const all=[...decimalUnits,...binaryUnits];
function convert(){
 const n=Number(value.value),entry=all.find(u=>u[0]===from.value);
 if(!Number.isFinite(n)||n<0||!entry){message.textContent="Introduza um valor válido.";message.className="message error";return}
 const bytes=n*entry[1];lastBytes=bytes;const units=scale.value==="binary"?binaryUnits:decimalUnits;
 results.innerHTML=units.map(([unit,m])=>'<div class="result"><span class="unit">'+unit+'</span><strong>'+format(bytes/m)+'</strong><small>'+unit+(unit==="B"?" · bytes":"")+'</small></div>').join("");
 exact.textContent=format(bytes)+" B";
 message.textContent="Conversão concluída localmente.";message.className="message ok"
}
$("#convert").addEventListener("click",convert);
value.addEventListener("input",()=>{if(value.value)convert()});value.addEventListener("keydown",e=>{if((e.key==="Enter")||((e.ctrlKey||e.metaKey)&&e.key==="Enter"))convert()});
from.addEventListener("change",convert);scale.addEventListener("change",convert);
document.querySelectorAll("[data-v]").forEach(btn=>btn.addEventListener("click",()=>{value.value=btn.dataset.v;from.value="B";convert()}));
async function copyText(value){if(!value)return false;try{await navigator.clipboard.writeText(value);return true}catch{try{const ta=document.createElement("textarea");ta.value=value;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok}catch{return false}}}copyExact.addEventListener("click",async()=>{if(exact.textContent==="—")return;const ok=await copyText(exact.textContent);message.textContent=ok?"Valor exato copiado.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"});copyAll.addEventListener("click",async()=>{if(lastBytes===null)return;const units=scale.value==="binary"?binaryUnits:decimalUnits;const text="Bytes exatos: "+format(lastBytes)+" B\n"+units.map(([u,m])=>u+": "+format(lastBytes/m)).join("\n");const ok=await copyText(text);message.textContent=ok?"Todas as conversões copiadas.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"});
convert();