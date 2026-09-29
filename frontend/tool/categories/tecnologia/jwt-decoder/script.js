const $=id=>document.getElementById(id),jwt=$("jwt"),status=$("status");
const setStatus=(m,e=false)=>{status.textContent=m;status.className=e?"error":"success"};
function decodeBase64Url(value){const clean=value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=");const binary=atob(clean);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder("utf-8",{fatal:true}).decode(bytes)}
function decodeJsonPart(part){const text=decodeBase64Url(part);const value=JSON.parse(text);return JSON.stringify(value,null,2)}
function decode(){
  const token=jwt.value.trim();
  $("header").textContent="";$("payload").textContent="";$("signature").textContent="";
  if(!token){setStatus("Cole um JWT para continuar.",true);jwt.focus();return}
  const parts=token.split(".");
  if(parts.length!==3){setStatus("JWT inválido: um token compacto precisa de três partes.",true);return}
  try{
    $("header").textContent=decodeJsonPart(parts[0]);
    $("payload").textContent=decodeJsonPart(parts[1]);
    $("signature").textContent=parts[2];
    setStatus("JWT decodificado localmente. A assinatura não foi validada.");
  }catch{
    setStatus("Não foi possível decodificar este JWT. Verifique o token e os campos JSON.",true);
  }
}
async function copyPart(id){
  const text=$(id).textContent;
  if(!text)return;
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
    else{const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}
    setStatus("Conteúdo copiado.");
  }catch{setStatus("Não foi possível copiar automaticamente.",true)}
}
$("decode").addEventListener("click",decode);
$("sample").addEventListener("click",()=>{
  jwt.value="eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJuZXhhdXJlbiIsIm5hbWUiOiJTYW1wbGUiLCJpYXQiOjE3MDAwMDAwMDB9.signature";
  decode();
});
$("clear").addEventListener("click",()=>{jwt.value="";$("header").textContent="";$("payload").textContent="";$("signature").textContent="";setStatus("Campos limpos.");jwt.focus()});
document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",()=>copyPart(b.dataset.copy)));
jwt.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")decode()});
