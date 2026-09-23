const $=s=>document.querySelector(s),format=$("#format"),length=$("#length"),quantity=$("#quantity"),secrets=$("#secrets"),status=$("#status"),message=$("#message");
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
 const items=Array.from({length:qty},()=>encode(randomBytes(n),kind));
 secrets.innerHTML=items.map((secret,i)=>'<div class="secret-row"><code>'+secret+'</code><button data-i="'+i+'">Copiar</button></div>').join("");
 secrets.querySelectorAll("[data-i]").forEach(btn=>btn.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(items[Number(btn.dataset.i)]);message.textContent="Secret copiado.";message.className="message ok"}catch{message.textContent="Não foi possível copiar.";message.className="message error"}}));
 status.textContent=qty+" SECRET"+(qty>1?"S":"")+" · "+kind.toUpperCase();message.textContent="Secret(s) gerado(s) localmente.";message.className="message ok"
}
$("#generate").addEventListener("click",generate);generate();