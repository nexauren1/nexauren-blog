import {auth,onAuthStateChanged} from "/tool/frontend/tool-access.js?v=20260923-access-2";
const output=document.querySelector('#output');
const uuid=()=>crypto.randomUUID();
function generate(){const n=Math.min(100,Math.max(1,Number(document.querySelector('#amount').value)||1));output.textContent=Array.from({length:n},uuid).join('\n')}
document.querySelector('#generate').onclick=generate;
document.querySelector('#clear').onclick=()=>output.textContent='Nenhum UUID gerado.';
document.querySelector('#copy').onclick=()=>navigator.clipboard.writeText(output.textContent);
onAuthStateChanged(auth,user=>{if(!user)location.href='/conta/'})