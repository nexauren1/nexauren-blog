const input=document.querySelector("#input"),output=document.querySelector("#output"),status=document.querySelector("#status"),indent=document.querySelector("#indent"),stats=document.querySelector("#stats");
function show(value){output.textContent=value;output.scrollTop=0;stats.textContent=value?`${value.length.toLocaleString("pt-PT")} caracteres · ${value.split(/\n/).length.toLocaleString("pt-PT")} linhas`:""}
function setStatus(text,type){status.textContent=text;status.className=type||""}
function parse(){try{return JSON.parse(input.value)}catch(e){throw e}}
function format(){if(!input.value.trim()){setStatus("Introduza um JSON para continuar.","error");show("");return}try{show(JSON.stringify(parse(),null,Number(indent.value)));setStatus("JSON válido · formatado com sucesso.","success")}catch(e){show("");setStatus("JSON inválido: "+e.message,"error")}}
function minify(){if(!input.value.trim()){setStatus("Introduza um JSON para continuar.","error");show("");return}try{show(JSON.stringify(parse()));setStatus("JSON válido · compactado com sucesso.","success")}catch(e){show("");setStatus("JSON inválido: "+e.message,"error")}}
async function copy(){if(!output.textContent){setStatus("Não há resultado para copiar.","error");return}try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(output.textContent);else{const t=document.createElement("textarea");t.value=output.textContent;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}setStatus("Resultado copiado.","success")}catch{setStatus("Não foi possível copiar automaticamente.","error")}}
document.querySelector("#format").addEventListener("click",format);
document.querySelector("#minify").addEventListener("click",minify);
document.querySelector("#copy").addEventListener("click",copy);
document.querySelector("#clear").addEventListener("click",()=>{input.value="";show("");setStatus("Campos limpos.","");input.focus()});
document.querySelector("#example").addEventListener("click",()=>{input.value=JSON.stringify({name:"Nexauren Story",active:true,tools:["UUID","Hash","JSON"],meta:{country:"MZ",version:1}},null,2);show(input.value);setStatus("Exemplo inserido.","success");input.focus()});
document.querySelector("#use-output").addEventListener("click",()=>{if(!output.textContent){setStatus("Não há resultado para usar.","error");return}input.value=output.textContent;setStatus("Resultado colocado na entrada.","success");input.focus()});
input.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")format()});
show("");