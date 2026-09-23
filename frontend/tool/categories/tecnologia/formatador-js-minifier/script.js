const $=s=>document.querySelector(s),input=$("#input"),output=$("#output"),indent=$("#indent"),comments=$("#comments"),status=$("#status"),message=$("#message");
function setMessage(t,c=""){message.textContent=t;message.className="message "+c}
function stripComments(code,keep){
 if(keep)return code;
 return code.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/.*$/gm,"$1")
}
function lex(code){
 const out=[];let buf="",quote="",template=false,comment="",i=0;
 const flush=()=>{if(buf.trim())out.push({type:"code",value:buf.trim()});buf=""};
 while(i<code.length){
  const c=code[i],n=code[i+1];
  if(comment){comment+=c;if((comment.startsWith("/*")&&c==="*"&&n==="/")||(comment.startsWith("//")&&c==="\n")){if(comment.startsWith("/*"))comment+="/";out.push({type:"comment",value:comment});comment="" ;if(c==="*")i++;}i++;continue}
  if(!quote&&c==="/"&&n==="*"){flush();comment="/*";i+=2;continue}
  if(!quote&&c==="/"&&n==="/"){flush();comment="//";i+=2;continue}
  if(quote||template){
   buf+=c;
   if(c==="\\"){buf+=n||"";i+=2;continue}
   if(template&&c==="`")template=false;
   else if(!template&&c===quote)quote="";
   i++;continue
  }
  if(c==="""||c==="'"){quote=c;buf+=c;i++;continue}
  if(c==="`"){template=true;buf+=c;i++;continue}
  if("{};".includes(c)){flush();out.push({type:c,value:c});i++;continue}
  if(c==="\n"||c==="\r"||c==="\t"){buf+=" ";i++;continue}
  buf+=c;i++
 }
 flush();if(comment)out.push({type:"comment",value:comment});return out
}
function formatJs(compact=false){
 let code=stripComments(input.value,comments.checked).trim();
 if(!code){setMessage("Insira JavaScript para processar.","error");return}
 try{
  if(compact){
   let out="";
   for(const t of lex(code)){if(t.type==="comment"){if(comments.checked)out+=t.value.trim()}else out+=t.value}
   output.value=out.replace(/\s+/g," ").replace(/\s*([{}();,:])\s*/g,"$1").replace(/\s*([=+*\-/%<>])\s*/g,"$1").trim()
  }else{
   const tokens=lex(code),u=indent.value==="tab"?"\t":" ".repeat(Number(indent.value));let level=0,lines=[];
   for(const t of tokens){
    if(t.type==="comment"){lines.push(u.repeat(level)+t.value.trim());continue}
    if(t.type==="{"){const last=lines.pop()||"";lines.push(u.repeat(level)+last.trim()+" {");level++;continue}
    if(t.type==="}"){level=Math.max(0,level-1);lines.push(u.repeat(level)+"}");continue}
    if(t.type===";"){const last=lines.pop();if(last!==undefined)lines.push(u.repeat(level)+last.trim()+";");continue}
    const txt=t.value.replace(/\s+/g," ").trim();if(txt)lines.push(u.repeat(level)+txt)
   }
   output.value=lines.join("\n")
  }
  const src=input.value.length,dst=output.value.length;$("#inCount").textContent=src+" chars";$("#outCount").textContent=dst+" chars";$("#saved").textContent=(src?Math.max(0,Math.round((1-dst/src)*100)):0)+"%";status.textContent=compact?"MINIFIED":"FORMATTED";setMessage(compact?"JavaScript compactado com sucesso.":"JavaScript formatado com sucesso.","ok")
 }catch(e){status.textContent="ERROR";setMessage("Não foi possível processar o JavaScript: "+e.message,"error")}
}
function validate(){
 const code=stripComments(input.value,false).trim();if(!code){setMessage("Insira JavaScript para validar.","error");status.textContent="ERROR";return false}
 try{new Function(code.replace(/^(\s*import\s+.*?;?\s*)+/gm,"").replace(/^\s*export\s+(default\s+)?/gm,""));status.textContent="VALID";setMessage("Sintaxe executável analisada sem erros.","ok");return true}
 catch(e){status.textContent="ERROR";setMessage("Possível erro de sintaxe: "+e.message,"error");return false}
}
$("#format").addEventListener("click",()=>formatJs(false));$("#minify").addEventListener("click",()=>formatJs(true));$("#validate").addEventListener("click",validate);
$("#sample").addEventListener("click",()=>{input.value='// Nexauren\nconst tools=["CSS","JS","Diff"];\nconst openTool=(name)=>{if(!name)return;console.log("Abrindo",name)};\nopenTool(tools[0]);';formatJs(false)});
$("#clear").addEventListener("click",()=>{input.value="";output.value="";["inCount","outCount"].forEach(id=>$("#"+id).textContent="0 chars");$("#saved").textContent="0%";status.textContent="STANDBY";setMessage("Campos limpos.")});
$("#copy").addEventListener("click",async()=>{if(!output.value){setMessage("Não há saída para copiar.","error");return}try{await navigator.clipboard.writeText(output.value);setMessage("JavaScript copiado.","ok")}catch{setMessage("Não foi possível copiar neste navegador.","error")}});
input.addEventListener("input",()=>$("#inCount").textContent=input.value.length+" chars");$("#inCount").textContent="0 chars";$("#outCount").textContent="0 chars";