import {auth,onAuthStateChanged} from "/tool/frontend/tool-access.js?v=20260923-access-2";

const gate=document.querySelector("#account-gate");
const app=document.querySelector("#tool-app");
const video=document.querySelector("#camera");
const canvas=document.querySelector("#scan-canvas");
const ctx=canvas.getContext("2d",{willReadFrequently:true});
const placeholder=document.querySelector("#scan-placeholder");
const state=document.querySelector("#scan-state");
const status=document.querySelector("#status");
const resultEmpty=document.querySelector("#result-empty");
const resultContent=document.querySelector("#result-content");
const resultText=document.querySelector("#result-text");
const resultType=document.querySelector("#result-type");
const openButton=document.querySelector("#open");
const startButton=document.querySelector("#start-camera");
const stopButton=document.querySelector("#stop-camera");
const imageInput=document.querySelector("#image-input");
const copyButton=document.querySelector("#copy");
let stream=null;
let scanning=false;
let animationId=0;
let lastResult="";

const setStatus=(message,error=false)=>{status.textContent=message;status.style.color=error?"#ff9e9e":"#b6fffb"};
const showGate=show=>{gate.hidden=!show;app.hidden=show};

function classify(value){
  try{
    const url=new URL(value);
    if(url.protocol==="http:"||url.protocol==="https:")return "URL";
  }catch{}
  if(/^WIFI:/i.test(value))return "WI-FI";
  if(/^BEGIN:VCARD/i.test(value))return "CONTACTO";
  return "TEXTO";
}
function showResult(value){
  lastResult=value;
  resultEmpty.hidden=true;
  resultContent.hidden=false;
  resultText.textContent=value;
  resultType.textContent=classify(value);
  let safeUrl=null;
  try{const url=new URL(value);if(url.protocol==="http:"||url.protocol==="https:")safeUrl=url.href}catch{}
  openButton.hidden=!safeUrl;
  openButton.dataset.url=safeUrl||"";
  setStatus("QR Code detetado com sucesso.");
  stopCamera();
}
function scanFrame(){
  if(!scanning)return;
  if(video.readyState>=2&&video.videoWidth){
    const max=900;
    const scale=Math.min(1,max/video.videoWidth);
    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
    canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(typeof window.jsQR!=="function"){
      stopCamera();setStatus("O motor de leitura não ficou disponível. Verifique a ligação e tente novamente.",true);return;
    }
    const code=window.jsQR(image.data,image.width,image.height,{inversionAttempts:"attemptBoth"});
    if(code?.data){showResult(code.data);return}
  }
  animationId=requestAnimationFrame(scanFrame);
}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setStatus("Este navegador não disponibiliza acesso à câmara.",true);return}
  if(typeof window.jsQR!=="function"){setStatus("O motor de leitura ainda não ficou disponível. Verifique a ligação e tente novamente.",true);return}
  stopCamera();
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream;
    await video.play();
    scanning=true;placeholder.hidden=true;video.style.display="block";startButton.disabled=true;stopButton.disabled=false;
    state.textContent="A procurar um QR Code…";setStatus("Câmara ativa. Aponte para o código.");
    scanFrame();
  }catch(error){
    const denied=error?.name==="NotAllowedError"||error?.name==="SecurityError";
    setStatus(denied?"Permissão da câmara recusada. Autorize a câmara nas definições do navegador.":"Não foi possível iniciar a câmara. Tente selecionar uma imagem.",true);
  }
}
function stopCamera(){
  scanning=false;cancelAnimationFrame(animationId);animationId=0;
  if(stream){stream.getTracks().forEach(track=>track.stop());stream=null}
  video.pause();video.srcObject=null;video.style.display="none";placeholder.hidden=false;startButton.disabled=false;stopButton.disabled=true;state.textContent="A aguardar câmara…";
}
async function readImage(file){
  if(!file)return;
  if(typeof window.jsQR!=="function"){setStatus("O motor de leitura não ficou disponível. Verifique a ligação e tente novamente.",true);return}
  stopCamera();setStatus("A analisar a imagem…");state.textContent="A analisar imagem…";
  const url=URL.createObjectURL(file);const image=new Image();
  image.onload=()=>{
    try{
      const max=1800;const scale=Math.min(1,max/image.naturalWidth,max/image.naturalHeight);
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height);
      const code=window.jsQR(data.data,data.width,data.height,{inversionAttempts:"attemptBoth"});
      if(code?.data){showResult(code.data)}else{setStatus("Não foi encontrado nenhum QR Code nesta imagem.",true);state.textContent="Nenhum QR detetado"}
    }catch(error){setStatus("Não foi possível analisar esta imagem.",true)}finally{URL.revokeObjectURL(url)}
  };
  image.onerror=()=>{URL.revokeObjectURL(url);setStatus("Não foi possível abrir a imagem escolhida.",true)};
  image.src=url;
}
copyButton.addEventListener("click",async()=>{
  if(!lastResult)return;
  try{await navigator.clipboard.writeText(lastResult);setStatus("Resultado copiado para a área de transferência.")}catch{setStatus("Não foi possível copiar automaticamente. Selecione o resultado manualmente.",true)}});
openButton.addEventListener("click",()=>{const url=openButton.dataset.url;if(url)window.open(url,"_blank","noopener,noreferrer")});
startButton.addEventListener("click",startCamera);
stopButton.addEventListener("click",()=>{stopCamera();setStatus("Câmara parada.")});
imageInput.addEventListener("change",()=>{const file=imageInput.files?.[0];readImage(file);imageInput.value=""});
window.addEventListener("pagehide",stopCamera);
document.querySelector("#year").textContent=new Date().getFullYear();

onAuthStateChanged(auth,user=>{showGate(!user);if(user)setStatus("Pronto. Use a câmara ou escolha uma imagem.")});