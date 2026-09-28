import { auth, onAuthStateChanged } from "/account/account-client.js?v=20260926-2";

const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const form=$("#support-form-element");
const kind=$("#kind");
const subject=$("#subject");
const message=$("#message");
const email=$("#email");
const feedback=$("#support-feedback");
const button=$("#submit-support");
const count=$("#message-count");
const diagnostics=$("#include-diagnostics");
const toolContext=$("#tool-context");
let currentUser=null;
let currentTool=null;

const KIND_LABELS={
  problem:"Problem report",
  support:"Support request",
  suggestion:"Suggestion",
  feature:"Feature request",
  other:"Other feedback"
};

function setFeedback(text,type=""){feedback.textContent=text;feedback.className="support-feedback"+(type?" "+type:"");}
function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function context(){
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  return {
    page_url:location.href,
    referrer:document.referrer||"",
    language:document.documentElement.lang||window.NexaurenLanguage?.get?.()||"en",
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"",
    locale:navigator.language||"",
    user_agent:navigator.userAgent||"",
    platform:navigator.platform||"",
    screen:{width:screen.width,height:screen.height,colorDepth:screen.colorDepth,pixelRatio:window.devicePixelRatio||1},
    viewport:{width:window.innerWidth,height:window.innerHeight},
    touch_points:navigator.maxTouchPoints||0,
    cookies_enabled:navigator.cookieEnabled===true,
    online:navigator.onLine===true,
    color_scheme:window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light",
    connection:connection?{effectiveType:connection.effectiveType||"",downlink:connection.downlink??null,rtt:connection.rtt??null,saveData:!!connection.saveData}:{},
    client_time:new Date().toISOString()
  };
}
function setContextFromUrl(){
  const raw=params.get("kind");
  if(raw&&["problem","support","suggestion","feature","other"].includes(raw))kind.value=raw;
}
async function loadTool(){
  const toolId=params.get("tool_id")||params.get("tool");
  const fromPath=params.get("from");
  if(!toolId&&!fromPath)return;
  try{
    const response=await fetch("/api/tool-registry",{credentials:"same-origin"});
    const data=await response.json();
    currentTool=(data.tools||[]).find(t=>toolId?String(t.id)===String(toolId):String(t.path||"")===String(fromPath));
    if(currentTool){
      toolContext.hidden=false;
      toolContext.textContent="Tool: "+(currentTool.name_en||currentTool.name||currentTool.id);
      if(!subject.value)subject.value=kind.value==="problem"?"Problem with "+(currentTool.name_en||currentTool.name||currentTool.id):"Suggestion for "+(currentTool.name_en||currentTool.name||currentTool.id);
    }
  }catch{}
}
function prefillUser(user){
  currentUser=user||null;
  if(user?.email){email.value=user.email;email.readOnly=true}
  if(user&& !subject.value && kind.value==="support")subject.value="Support request";
}
async function submit(event){
  event.preventDefault();
  setFeedback("");
  const msg=message.value.trim(),sub=subject.value.trim(),mail=email.value.trim();
  if(!sub){setFeedback("Please add a subject.","error");subject.focus();return}
  if(msg.length<8){setFeedback("Please provide a little more detail.","error");message.focus();return}
  if(!validEmail(mail)){setFeedback("Enter a valid email address.","error");email.focus();return}
  if(msg.length>12000){setFeedback("Your message is too long.","error");return}
  button.disabled=true;button.textContent="Sending…";
  try{
    const headers={"content-type":"application/json"};
    if(currentUser)headers.Authorization="Bearer "+await currentUser.getIdToken();
    const payload={
      kind:kind.value,
      subject:sub,
      message:msg,
      email:mail,
      include_diagnostics:!!diagnostics?.checked,
      page_context:context(),
      tool_id:currentTool?.id||params.get("tool_id")||params.get("tool")||"",
      source_path:params.get("from")||location.pathname
    };
    const response=await fetch("/api/support/submit",{method:"POST",credentials:"same-origin",headers,body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"We could not send your message right now.");
    setFeedback("Your message was sent to Nexauren Support. Reference: "+(data.reference||"received"),"success");
    form.reset();count.textContent="0";if(currentUser?.email){email.value=currentUser.email;email.readOnly=true}
    if(currentTool){toolContext.hidden=false;toolContext.textContent="Tool: "+(currentTool.name_en||currentTool.name||currentTool.id)}
  }catch(error){
    setFeedback(error.message||"We could not send your message right now.","error");
  }finally{button.disabled=false;button.textContent=(kind.value==="suggestion"||kind.value==="feature")?"Send suggestion →":"Send message →"}
}
setContextFromUrl();
message.addEventListener("input",()=>{count.textContent=String(message.value.length)});
document.querySelectorAll("[data-kind-link]").forEach(el=>el.addEventListener("click",event=>{const target=el.dataset.kindLink;event.preventDefault();kind.value=target;document.querySelector("#support-form")?.scrollIntoView({behavior:"smooth",block:"start"});subject.focus()}));
kind.addEventListener("change",()=>{button.textContent=(kind.value==="suggestion"||kind.value==="feature")?"Send suggestion →":"Send message →";if(currentTool&&!subject.value)subject.value=(kind.value==="problem"?"Problem with ":"Request about ")+(currentTool.name_en||currentTool.name||currentTool.id)});
form.addEventListener("submit",submit);
onAuthStateChanged(auth,prefillUser);
loadTool();
window.NexaurenLanguage?.refresh?.();
