const $=s=>document.querySelector(s),format=$("#format"),length=$("#length"),quantity=$("#quantity"),secrets=$("#secrets"),status=$("#status"),message=$("#message"),copyAll=$("#copyAll"),download=$("#download");let generated=[];
function randomBytes(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return a}
function toBase64(bytes){let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
function encode(bytes,kind){
 if(kind==="hex")return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
 const b64=toBase64(bytes);
 if(kind==="base64")return b64;
 if(kind==="base64url")return b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
 let out="";for(const b of bytes)out+=chars[b%chars.length];return out
}
function generate(){
 const n=Math.min(96,Math.max(16,Number(length.value)||32)),qty=Math.min(20,Math.max(1,Number(quantity.value)||1)),kind=format.value;
 const items=Array.from({length:qty},()=>encode(randomBytes(n),kind));generated=items;
 secrets.innerHTML=items.map((secret,i)=>'<div class="secret-row"><code>'+secret+'</code><button data-i="'+i+'">Copiar</button></div>').join("");
 async function copyText(value){if(!value)return false;try{await navigator.clipboard.writeText(value);return true}catch{try{const ta=document.createElement("textarea");ta.value=value;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok}catch{return false}}}secrets.querySelectorAll("[data-i]").forEach(btn=>btn.addEventListener("click",async()=>{const ok=await copyText(generated[Number(btn.dataset.i)]);message.textContent=ok?"Secret copiado.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"}));
 status.textContent=qty+" SECRET"+(qty>1?"S":"")+" · "+kind.toUpperCase();message.textContent="Secret(s) gerado(s) localmente.";message.className="message ok"
}
copyAll.addEventListener("click",async()=>{const ok=await copyText(generated.join("\n"));message.textContent=ok?"Todos os secrets copiados.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"});download.addEventListener("click",()=>{if(!generated.length){message.textContent="Gere um secret antes de baixar.";message.className="message error";return}const url=URL.createObjectURL(new Blob([generated.join("\n")+"\n"],{type:"text/plain;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="nexauren-secrets.txt";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);message.textContent="Ficheiro TXT baixado.";message.className="message ok"});document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();generate()}});$("#generate").addEventListener("click",generate);generate();