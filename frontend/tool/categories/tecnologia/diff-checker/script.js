const $=s=>document.querySelector(s),a=$("#a"),b=$("#b"),diff=$("#diff"),message=$("#message"),copy=$("#copy"),download=$("#download");let lastDiffText="";
function lines(v){return v.replace(/\r\n?/g,"\n").split("\n")}
function count(el){const n=el.value?lines(el.value).length:0;return n+" linhas"}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function lcs(a,b){
 const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const out=[];let i=0,j=0;
 while(i<n&&j<m){if(a[i]===b[j]){out.push({type:"same",value:a[i],a:i+1,b:j+1});i++;j++}else if(dp[i+1][j]>=dp[i][j+1]){out.push({type:"remove",value:a[i],a:i+1,b:""});i++}else{out.push({type:"add",value:b[j],a:"",b:j+1});j++}}
 while(i<n){out.push({type:"remove",value:a[i],a:i+1,b:""});i++}
 while(j<m){out.push({type:"add",value:b[j],a:"",b:j+1});j++}
 return out
}
function render(){
 const av=lines(a.value),bv=lines(b.value);
 if(!a.value.trim()&&!b.value.trim()){diff.innerHTML='<div class="empty">Introduza conteúdo nos dois lados.</div>';$("#resultStatus").textContent="Aguardando";return}
 const rows=lcs(av,bv);let add=0,remove=0,same=0;
 diff.innerHTML=rows.map(r=>{if(r.type==="add")add++;else if(r.type==="remove")remove++;else same++;const num=r.type==="add"?"+ "+r.b:r.type==="remove"?"− "+r.a:"  "+r.a;return '<div class="line '+r.type+'"><span class="num">'+num+'</span><span class="code">'+(r.type==="add"?"+ ":"- ")+(esc(r.value)||" ")+'</span></div>'}).join("");
 $("#added").textContent=add;$("#removed").textContent=remove;$("#same").textContent=same;$("#changes").textContent=add+remove;$("#resultStatus").textContent=(add+remove)+" alterações";
 lastDiffText=rows.map(r=>(r.type==="add"?"+ ":r.type==="remove"?"- ":"  ")+r.value).join("\n");message.textContent=add+remove?"Diferenças encontradas.":"Os conteúdos são idênticos.";message.className="message "+(add+remove?"":"ok");
}
$("#compareBtn").addEventListener("click",render);
$("#swap").addEventListener("click",()=>{const v=a.value;a.value=b.value;b.value=v;updateCounts();render()});
$("#sample").addEventListener("click",()=>{a.value='const app = "Nexauren";\nconsole.log(app);\nconst version = "1.0";';b.value='const app = "Nexauren";\nconsole.log(app);\nconst version = "1.1";\nconsole.log("ready");';updateCounts();render()});
$("#clear").addEventListener("click",()=>{a.value="";b.value="";updateCounts();diff.innerHTML='<div class="empty">Compare dois textos para ver as diferenças.</div>';["added","removed","same","changes"].forEach(id=>$("#"+id).textContent="0");$("#resultStatus").textContent="Aguardando";message.textContent="O resultado é processado localmente.";message.className="message"});
async function copyText(value){if(!value)return false;try{await navigator.clipboard.writeText(value);return true}catch{try{const ta=document.createElement("textarea");ta.value=value;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok}catch{return false}}}copy.addEventListener("click",async()=>{if(!lastDiffText){message.textContent="Não há resultado para copiar.";message.className="message error";return}const ok=await copyText(lastDiffText);message.textContent=ok?"Resultado copiado.":"Não foi possível copiar.";message.className=ok?"message ok":"message error"});download.addEventListener("click",()=>{if(!lastDiffText){message.textContent="Compare os textos antes de baixar.";message.className="message error";return}const u=URL.createObjectURL(new Blob([lastDiffText],{type:"text/plain;charset=utf-8"})),a=document.createElement("a");a.href=u;a.download="nexauren-diff.txt";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);message.textContent="Diff baixado.";message.className="message ok"});
function updateCounts(){$("#aCount").textContent=count(a);$("#bCount").textContent=count(b)}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(a.value||b.value)render()},180)}a.addEventListener("input",()=>{updateCounts();schedule()});b.addEventListener("input",()=>{updateCounts();schedule()});document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();render()}});updateCounts();