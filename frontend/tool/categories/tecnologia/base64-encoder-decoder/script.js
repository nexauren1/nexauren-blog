const input=document.getElementById("input"),output=document.getElementById("output"),status=document.getElementById("status");
const bytesToBase64=bytes=>{let binary="";const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(binary)};
const base64ToBytes=value=>{const clean=value.replace(/\s/g,"");if(!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)||clean.length%4!==0)throw new Error("Base64 inválido");const binary=atob(clean);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes};
const setStatus=(message,error=false)=>{status.textContent=message;status.dataset.error=error?"true":"false"};
function encode(){try{const text=new TextEncoder().encode(input.value);output.value=bytesToBase64(text);setStatus("Codificado com sucesso.")}catch{output.value="";setStatus("Não foi possível codificar o conteúdo.",true)}}
function decode(){try{const bytes=base64ToBytes(input.value);output.value=new TextDecoder("utf-8",{fatal:true}).decode(bytes);setStatus("Descodificado com sucesso.")}catch{output.value="";setStatus("Base64 inválido ou não está em UTF-8.",true)}}
async function copy(){if(!output.value){setStatus("Não há resultado para copiar.",true);return}try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(output.value);else{const t=document.createElement("textarea");t.value=output.value;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}setStatus("Resultado copiado.")}catch{setStatus("Não foi possível copiar automaticamente.",true)}}
document.getElementById("encode").addEventListener("click",encode);
document.getElementById("decode").addEventListener("click",decode);
document.getElementById("copy").addEventListener("click",copy);
document.getElementById("use-output").addEventListener("click",()=>{if(!output.value){setStatus("Não há resultado para usar.",true);return}input.value=output.value;output.value="";setStatus("Resultado colocado na entrada.")});
document.getElementById("sample").addEventListener("click",()=>{input.value="Olá, Nexauren Story!";output.value="";setStatus("Exemplo inserido.");input.focus()});
document.getElementById("clear").addEventListener("click",()=>{input.value="";output.value="";setStatus("Campos limpos.");input.focus()});
input.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")encode()});
