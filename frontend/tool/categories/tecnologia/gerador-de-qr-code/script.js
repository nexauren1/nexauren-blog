const QR_TYPES=["url","text","wifi","contact"];
const app=document.querySelector("#tool-app");
const canvas=document.querySelector("#qr-canvas");
const empty=document.querySelector("#qr-empty");
const status=document.querySelector("#status");
const payloadPreview=document.querySelector("#payload-preview");
const download=document.querySelector("#download");
const copyPayload=document.querySelector("#copy-payload");
const size=document.querySelector("#size");
const sizeValue=document.querySelector("#size-value");
const level=document.querySelector("#level");
let type="url";
let lastPayload="";
let generateTimer=0;

const $=id=>document.getElementById(id);
function value(id){return $(id)?.value?.trim()||""}
function wifiEscape(v){return String(v??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/:/g,"\\:")}
function contactEscape(v){return String(v??"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,")}
function buildPayload(){
  if(type==="url")return value("url");
  if(type==="text")return value("text");
  if(type==="wifi"){
    const security=value("wifi-security")||"WPA";
    const hidden=$("wifi-hidden").checked?"true":"false";
    return "WIFI:T:"+security+";S:"+wifiEscape(value("wifi-ssid"))+";P:"+wifiEscape(value("wifi-password"))+";H:"+hidden+";;";
  }
  const name=contactEscape(value("contact-name")),phone=contactEscape(value("contact-phone")),email=contactEscape(value("contact-email")),company=contactEscape(value("contact-company"));
  return ["BEGIN:VCARD","VERSION:3.0","FN:"+name,company?"ORG:"+company:"",phone?"TEL;TYPE=CELL:"+phone:"",email?"EMAIL:"+email:"","END:VCARD"].filter(Boolean).join("\n");
}
function setStatus(message,error=false){
  status.textContent=message;
  status.style.color=error?"#ff9f9a":"#7fdbd6";
}
function clearPreview(){
  lastPayload="";
  payloadPreview.textContent="—";
  download.disabled=true;
  copyPayload.disabled=true;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  empty.hidden=false;
}
function scheduleGenerate(){
  clearTimeout(generateTimer);
  generateTimer=setTimeout(generate,140);
}
async function generate(){
  const payload=buildPayload();
  if(!payload){
    clearPreview();
    setStatus("Introduza algum conteúdo para gerar o código.",true);
    return;
  }
  if(!window.QRCode){
    setStatus("O motor QR não ficou disponível. Verifique a ligação e tente novamente.",true);
    return;
  }
  try{
    const px=Number(size.value||320);
    canvas.width=px;
    canvas.height=px;
    await QRCode.toCanvas(canvas,payload,{
      width:px,
      errorCorrectionLevel:level.value,
      color:{dark:"#0b1220",light:"#ffffff"},
      margin:2
    });
    lastPayload=payload;
    payloadPreview.textContent=payload.length>900?payload.slice(0,900)+"…":payload;
    download.disabled=false;
    copyPayload.disabled=false;
    empty.hidden=true;
    setStatus("QR Code atualizado localmente.");
  }catch(error){
    clearPreview();
    setStatus("Não foi possível gerar este QR Code. Reduza o conteúdo e tente novamente.",true);
    console.error("QR generator",error);
  }
}
function activateType(next){
  if(!QR_TYPES.includes(next))return;
  type=next;
  document.querySelectorAll(".qr-type").forEach(button=>button.classList.toggle("active",button.dataset.type===type));
  document.querySelectorAll("[data-fields]").forEach(field=>{field.hidden=field.dataset.fields!==type});
  generate();
}
function reset(){
  $("url").value="https://nexaurenstory.com/";
  $("text").value="";
  $("wifi-ssid").value="";
  $("wifi-password").value="";
  $("wifi-security").value="WPA";
  $("wifi-hidden").checked=false;
  $("contact-name").value="";
  $("contact-phone").value="";
  $("contact-email").value="";
  $("contact-company").value="";
  size.value="320";
  sizeValue.textContent="320 px";
  level.value="M";
  activateType("url");
}
size.addEventListener("input",()=>{
  sizeValue.textContent=size.value+" px";
  scheduleGenerate();
});
document.querySelectorAll(".qr-type").forEach(button=>button.addEventListener("click",()=>activateType(button.dataset.type)));
["url","text","wifi-ssid","wifi-password","contact-name","contact-phone","contact-email","contact-company","wifi-security","wifi-hidden"].forEach(id=>$(id)?.addEventListener("input",scheduleGenerate));
$("generate").addEventListener("click",generate);
$("reset").addEventListener("click",reset);
level.addEventListener("change",generate);
download.addEventListener("click",()=>{
  if(!lastPayload)return;
  const link=document.createElement("a");
  link.download="nexauren-qr-code.png";
  link.href=canvas.toDataURL("image/png");
  link.click();
  setStatus("PNG guardado.");
});
copyPayload.addEventListener("click",async()=>{
  if(!lastPayload)return;
  try{
    await navigator.clipboard.writeText(lastPayload);
    setStatus("Conteúdo copiado.");
  }catch{
    setStatus("Não foi possível copiar automaticamente.",true);
  }
});
$("year").textContent=new Date().getFullYear();

generate();
