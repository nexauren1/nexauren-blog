const $=s=>document.querySelector(s);
const lengthEl=$("#length"),format=$("#format"),prefix=$("#prefix"),quantity=$("#quantity"),keys=$("#keys"),status=$("#status"),message=$("#message");
function randomBytes(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return a}
function build(){
 const len=Math.min(128,Math.max(1,Number(lengthEl.value)||32)),qty=Math.min(20,Math.max(1,Number(quantity.value)||1)),kind=format.value,p=prefix.value.slice(0,16);
 const alphabet=kind==="hex"?"0123456789abcdef":"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
 const out=[];
 for(let k=0;k<qty;k++){
  if(kind==="hex"){const raw=Array.from(randomBytes(Math.ceil(len/2)),b=>b.toString(16).padStart(2,"0")).join("").slice(0,len);out.push(p+raw)}
  else if(kind==="base64"){const bytes=randomBytes(Math.ceil(len*3/4)+3);let s=btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");out.push(p+s.slice(0,len))}
  else{const bytes=randomBytes(len+8);let s="";for(const b of bytes)s+=alphabet[b%alphabet.length];out.push(p+s.slice(0,len))}
 }
 keys.innerHTML=out.map((key,i)=>'<div class="key-row"><code>'+key.replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]))+'</code><button data-key="'+i+'">Copiar</button></div>').join("");
 keys.querySelectorAll("[data-key]").forEach(btn=>btn.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(out[Number(btn.dataset.key)]);message.textContent="Chave copiada.";message.className="message ok"}catch{message.textContent="Não foi possível copiar.";message.className="message error"}}));
 status.textContent=qty+" CHAVE"+(qty>1?"S":"")+" · "+kind.toUpperCase();message.textContent="Geração concluída localmente.";message.className="message ok"
}
$("#generate").addEventListener("click",build);build();