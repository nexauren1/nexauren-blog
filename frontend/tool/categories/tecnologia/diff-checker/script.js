const $=s=>document.querySelector(s),a=$("#a"),b=$("#b"),diff=$("#diff"),message=$("#message");
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
 message.textContent=add+remove?"Diferenças encontradas.":"Os conteúdos são idênticos.";message.className="message "+(add+remove?"":"ok");
}
$("#compareBtn").addEventListener("click",render);
$("#swap").addEventListener("click",()=>{const v=a.value;a.value=b.value;b.value=v;updateCounts();render()});
$("#sample").addEventListener("click",()=>{a.value='const app = "Nexauren";\nconsole.log(app);\nconst version = "1.0";';b.value='const app = "Nexauren";\nconsole.log(app);\nconst version = "1.1";\nconsole.log("ready");';updateCounts();render()});
$("#clear").addEventListener("click",()=>{a.value="";b.value="";updateCounts();diff.innerHTML='<div class="empty">Compare dois textos para ver as diferenças.</div>';["added","removed","same","changes"].forEach(id=>$("#"+id).textContent="0");$("#resultStatus").textContent="Aguardando";message.textContent="O resultado é processado localmente.";message.className="message"});
$("#copy").addEventListener("click",async()=>{const text=[...diff.querySelectorAll(".line")].map(row=>row.innerText).join("\n");if(!text){message.textContent="Não há resultado para copiar.";message.className="message error";return}try{await navigator.clipboard.writeText(text);message.textContent="Resultado copiado.";message.className="message ok"}catch{message.textContent="Não foi possível copiar.";message.className="message error"}});
function updateCounts(){$("#aCount").textContent=count(a);$("#bCount").textContent=count(b)}
a.addEventListener("input",updateCounts);b.addEventListener("input",updateCounts);updateCounts();