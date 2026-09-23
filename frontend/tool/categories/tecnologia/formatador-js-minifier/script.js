const $=s=>document.querySelector(s),input=$("#input"),output=$("#output"),indent=$("#indent"),comments=$("#comments"),status=$("#status"),message=$("#message");
const TICK=String.fromCharCode(96);
function setMessage(t,c=""){message.textContent=t;message.className="message "+c}
function lex(code){
 const out=[];let buf="",quote="",template=false,comment="",i=0;
 const flush=()=>{if(buf.trim())out.push({type:"code",value:buf.trim()});buf=""};
 while(i<code.length){
  const c=code[i],n=code[i+1];
  if(comment){
   comment+=c;
   if(comment.startsWith("/*")&&c==="*"&&n==="/"){comment+="/";out.push({type:"comment",value:comment});comment="";i+=2;continue}
   if(comment.startsWith("//")&&c==="\n"){out.push({type:"comment",value:comment.trimEnd()});comment="";i++;continue}
   i++;continue
  }
  if(!quote&&!template&&c==="/"&&n==="*"){flush();comment="/*";i+=2;continue}
  if(!quote&&!template&&c==="/"&&n==="/"){flush();comment="//";i+=2;continue}
  if(template){
   buf+=c;
   if(c==="\\"){buf+=n||"";i+=2;continue}
   if(c===TICK)template=false;
   i++;continue
  }
  if(quote){
   buf+=c;
   if(c==="\\"){buf+=n||"";i+=2;continue}
   if(c===quote)quote="";
   i++;continue
  }
  if(c==='"'||c==="'"){quote=c;buf+=c;i++;continue}
  if(c===TICK){template=true;buf+=c;i++;continue}
  if("{};".includes(c)){flush();out.push({type:c,value:c});i++;continue}
  if(c==="\n"||c==="\r"||c==="\t"){buf+=" ";i++;continue}
  buf+=c;i++
 }
 flush();if(comment)out.push({type:"comment",value:comment.trimEnd()});return out
}
function stripComments(code){return lex(code).filter(t=>t.type!=="comment").map(t=>t.value).join("")}
function formatJs(compact=false){
 const source=input.value.trim();if(!source){setMessage("Insira JavaScript para processar.","error");return}
 try{
  const tokens=lex(source),u=indent.value==="tab"?"\t":" ".repeat(Number(indent.value)),keep=comments.checked;
  if(compact){
   let out="";for(const t of tokens){if(t.type==="comment"){if(keep)out+=t.value}else out+=t.value}
   output.value=out.replace(/\s+/g," ").replace(/\s*([{}();,:])\s*/g,"$1").trim()
  }else{
   let level=0,lines=[];
   for(const t of tokens){
    if(t.type==="comment"){if(keep)lines.push(u.repeat(level)+t.value.trim());continue}
    if(t.type==="{"){const last=lines.pop()||"";lines.push(u.repeat(level)+last.trim()+" {");level++;continue}
    if(t.type==="}"){level=Math.max(0,level-1);lines.push(u.repeat(level)+"}");continue}
    if(t.type===";"){const last=lines.pop();if(last!==undefined)lines.push(u.repeat(level)+last.trim()+";");continue}
    const txt=t.value.replace(/\s+/g," ").trim();if(txt)lines.push(u.repeat(level)+txt)
   }
   output.value=lines.join("\n")
  }
  const src=input.value.length,dst=output.value.length;
  $("#inCount").textContent=src+" chars";$("#outCount").textContent=dst+" chars";
  $("#saved").textContent=(src?Math.max(0,Math.round((1-dst/src)*100)):0)+"%";
  status.textContent=compact?"MINIFIED":"FORMATTED";
  setMessage(compact?"JavaScript compactado com sucesso.":"JavaScript formatado com sucesso.","ok")
 }catch(e){status.textContent="ERROR";setMessage("Não foi possível processar o JavaScript: "+e.message,"error")}
}
function validate(){
 const code=stripComments(input.value).trim();
 if(!code){setMessage("Insira JavaScript para validar.","error");status.textContent="ERROR";return false}
 try{
  const safe=code.replace(/^(\s*import\s+.*?;?\s*)+/gm,"").replace(/^\s*export\s+(default\s+)?/gm,"");
  new Function(safe);status.textContent="VALID";setMessage("Sintaxe JavaScript analisada sem erros.","ok");return true
 }catch(e){status.textContent="ERROR";setMessage("Possível erro de sintaxe: "+e.message,"error");return false}
}
$("#format").addEventListener("click",()=>formatJs(false));$("#minify").addEventListener("click",()=>formatJs(true));$("#validate").addEventListener("click",validate);
$("#sample").addEventListener("click",()=>{input.value='// Nexauren\nconst tools=["CSS","JS","Diff"];\nconst openTool=(name)=>{if(!name)return;console.log("Abrindo",name)};\nopenTool(tools[0]);';formatJs(false)});
$("#clear").addEventListener("click",()=>{input.value="";output.value="";$("#inCount").textContent="0 chars";$("#outCount").textContent="0 chars";$("#saved").textContent="0%";status.textContent="STANDBY";setMessage("Campos limpos.")});
$("#copy").addEventListener("click",async()=>{if(!output.value){setMessage("Não há saída para copiar.","error");return}try{await navigator.clipboard.writeText(output.value);setMessage("JavaScript copiado.","ok")}catch{setMessage("Não foi possível copiar neste navegador.","error")}});
input.addEventListener("input",()=>$("#inCount").textContent=input.value.length+" chars");$("#inCount").textContent="0 chars";$("#outCount").textContent="0 chars";