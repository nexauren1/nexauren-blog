const $=s=>document.querySelector(s);
const lengthEl=$("#length"),format=$("#format"),prefix=$("#prefix"),quantity=$("#quantity"),keys=$("#keys"),status=$("#status"),message=$("#message"),copyAll=$("#copyAll"),download=$("#download");let generated=[];
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
 generated=out;keys.innerHTML=out.map((key,i)=>'<div class="key-row"><code>'+key.replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]))+'</code><button data-key="'+i+'">Copiar</button></div>').join("");
 async function copyText(value){if(!value)return false;try{await navigator.clipboard.writeText(value);return true}catch{try{const ta=document.createElement("textarea");ta.value=value;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok}catch{return false}}}keys.querySelectorAll("[data-key]").forEach(btn=>btn.addEventListener("click",async()=>{const ok=await copyText(generated[Number(btn.dataset.key)]);message.textContent=ok?"Chave copiada.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"}));
 status.textContent=qty+" CHAVE"+(qty>1?"S":"")+" · "+kind.toUpperCase();message.textContent="Geração concluída localmente.";message.className="message ok"
}
copyAll.addEventListener("click",async()=>{const ok=await copyText(generated.join("\n"));message.textContent=ok?"Todas as chaves copiadas.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"});download.addEventListener("click",()=>{if(!generated.length){message.textContent="Gere uma chave antes de baixar.";message.className="message error";return}const url=URL.createObjectURL(new Blob([generated.join("\n")+"\n"],{type:"text/plain;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="nexauren-api-keys.txt";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);message.textContent="Ficheiro TXT baixado.";message.className="message ok"});document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();build()}});$("#generate").addEventListener("click",build);build();