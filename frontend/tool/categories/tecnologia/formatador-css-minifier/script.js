const $=s=>document.querySelector(s);
const input=$("#input"),output=$("#output"),indent=$("#indent"),keepComments=$("#keepComments"),message=$("#message"),status=$("#status"),inCount=$("#inCount"),outCount=$("#outCount"),meterFill=$("#meterFill"),ruleCount=$("#ruleCount"),declCount=$("#declCount"),saved=$("#saved");
function setMessage(text,type=""){message.textContent=text;message.className="message "+type}
function unit(){return indent.value==="tab"?"\t":" ".repeat(Number(indent.value))}
function tokenize(css){
 const tokens=[];let buf="",quote="";
 const flush=()=>{if(buf.trim())tokens.push({type:"text",value:buf.trim()});buf=""};
 for(let i=0;i<css.length;i++){
  const c=css[i],n=css[i+1];
  if(!quote&&c==="/"&&n==="*"){flush();const end=css.indexOf("*/",i+2);if(end===-1){tokens.push({type:"comment",value:css.slice(i)});break}tokens.push({type:"comment",value:css.slice(i,end+2)});i=end+1;continue}
  if(quote){buf+=c;if(c==="\\"){buf+=n||"";i++}else if(c===quote)quote="";continue}
  if(c==='"'||c==="'"){quote=c;buf+=c;continue}
  if(c==="{"||c==="}"||c===";"){flush();tokens.push({type:c,value:c});continue}
  buf+=c
 }
 flush();return tokens
}
function formatCss(compact=false){
 const source=input.value.trim();if(!source){setMessage("Insira CSS para processar.","error");return}
 try{
  const tokens=tokenize(source).filter(t=>keepComments.checked||t.type!=="comment");let rules=0,decls=0;
  if(compact){
   let out="";
   for(const t of tokens){if(t.type==="comment")out+=t.value.replace(/\s+/g," ");else if(t.type==="text")out+=t.value.replace(/\s+/g," ").trim();else out+=t.value;if(t.type==="{")rules++;if(t.type===";")decls++}
   output.value=out.replace(/\s*([{}:;,>+~])\s*/g,"$1").replace(/;}/g,"}")
  }else{
   const u=unit(),lines=[];let level=0;
   for(const t of tokens){
    if(t.type==="comment"){lines.push(u.repeat(level)+t.value);continue}
    if(t.type==="{"){const last=lines.pop()||"";lines.push(u.repeat(level)+last.trim()+" {");level++;rules++;continue}
    if(t.type==="}"){level=Math.max(0,level-1);lines.push(u.repeat(level)+"}");continue}
    if(t.type===";"){const last=lines.pop();if(last!==undefined)lines.push(u.repeat(level)+last.trim()+";");decls++;continue}
    const text=t.value.replace(/\s+/g," ").trim();if(text)lines.push(u.repeat(level)+text)
   }
   output.value=lines.join("\n")
  }
  const src=input.value.length,dst=output.value.length;
  inCount.textContent=src+" chars";outCount.textContent=dst+" chars";
  saved.textContent=(src?Math.max(0,Math.round((1-dst/src)*100)):0)+"%";
  ruleCount.textContent=rules||((source.match(/\{/g)||[]).length);
  declCount.textContent=decls||((source.match(/;/g)||[]).length);
  meterFill.style.width=Math.min(100,src?dst/src*100:0)+"%";
  status.textContent=compact?"COMPACTADO":"FORMATADO";
  setMessage(compact?"CSS compactado com sucesso.":"CSS formatado com sucesso.","ok")
 }catch(e){status.textContent="ERRO";setMessage("Não foi possível processar o CSS: "+e.message,"error")}
}
$("#format").addEventListener("click",()=>formatCss(false));
$("#minify").addEventListener("click",()=>formatCss(true));
$("#sample").addEventListener("click",()=>{input.value='/* Nexauren */\n.dashboard, .card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; color: #e9fffa; }\n.card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.18); }';formatCss(false)});
$("#clear").addEventListener("click",()=>{input.value="";output.value="";inCount.textContent="0 chars";outCount.textContent="0 chars";saved.textContent="0%";ruleCount.textContent="0";declCount.textContent="0";meterFill.style.width="0%";status.textContent="PRONTO";setMessage("Campos limpos.")});
$("#copy").addEventListener("click",async()=>{if(!output.value){setMessage("Não há saída para copiar.","error");return}try{await navigator.clipboard.writeText(output.value);setMessage("CSS copiado para a área de transferência.","ok")}catch{setMessage("Não foi possível copiar neste navegador.","error")}});
input.addEventListener("input",()=>{inCount.textContent=input.value.length+" chars"});inCount.textContent="0 chars";outCount.textContent="0 chars";