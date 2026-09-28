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
const SUPPORT_EMAIL="nexaurenx@gmail.com";
let currentUser=null;
let currentTool=null;

const AUTH_READY=new Promise(resolve=>{
  onAuthStateChanged(auth,user=>{
    currentUser=user||null;
    prefillUser(currentUser);
    resolve(currentUser);
  });
});

const KIND_LABELS={
  problem:"Problem report",
  support:"Support request",
  suggestion:"Suggestion",
  feature:"Feature request",
  other:"Other feedback"
};

const line=(label,value)=>label+": "+(value===undefined||value===null||value===""?"—":String(value));

function setFeedback(text,type=""){feedback.textContent=text;feedback.className="support-feedback"+(type?" "+type:"");}
function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}

function context(){
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const user=currentUser;
  return {
    page_url:location.href,
    page_title:document.title||"",
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
    firebase_provider_ids:user?.providerData?.map(p=>p?.providerId).filter(Boolean).slice(0,20)||[],
    firebase_uid:user?.uid||"",
    firebase_email:user?.email||"",
    firebase_display_name:user?.displayName||"",
    firebase_photo_url:user?.photoURL||"",
    firebase_email_verified:user?.emailVerified===true,
    firebase_creation_time:user?.metadata?.creationTime||"",
    firebase_last_sign_in_time:user?.metadata?.lastSignInTime||"",
    client_time:new Date().toISOString()
  };
}

function setContextFromUrl(){
  const raw=params.get("kind");
  if(raw&&["problem","support","suggestion","feature","other"].includes(raw))kind.value=raw;
}

let toolReady=Promise.resolve();
async function loadTool(){
  const toolId=params.get("tool_id")||params.get("tool");
  const fromPath=params.get("from");
  if(!toolId&&!fromPath)return null;
  try{
    const response=await fetch("/api/tool-registry",{credentials:"same-origin"});
    const data=await response.json();
    currentTool=(data.tools||[]).find(t=>toolId?String(t.id)===String(toolId):String(t.path||"")===String(fromPath))||null;
    if(currentTool){
      toolContext.hidden=false;
      toolContext.textContent="Tool: "+(currentTool.name_en||currentTool.name||currentTool.id);
      if(!subject.value)subject.value=kind.value==="problem"?"Problem with "+(currentTool.name_en||currentTool.name||currentTool.id):"Suggestion for "+(currentTool.name_en||currentTool.name||currentTool.id);
    }
    return currentTool;
  }catch{return null}
}

function prefillUser(user){
  if(user?.email){email.value=user.email;email.readOnly=true}
  else email.readOnly=false;
  if(user&&!subject.value&&kind.value==="support")subject.value="Support request";
}

async function firebaseClaims(){
  if(!currentUser)return {};
  try{
    const result=await currentUser.getIdTokenResult();
    const claims=result?.claims||{};
    return {
      sign_in_provider:claims.firebase?.sign_in_provider||"",
      auth_time:claims.auth_time||""
    };
  }catch{return {}}
}

function makeReference(){
  const stamp=new Date().toISOString().slice(0,10).replace(/-/g,"");
  const random=Math.random().toString(36).slice(2,10).toUpperCase();
  return "NX-"+stamp+"-"+random;
}

function toolLines(){
  const fallbackId=params.get("tool_id")||params.get("tool")||"";
  const fallbackPath=params.get("from")||location.pathname||"";
  const t=currentTool||{};
  return [
    line("Tool ID",t.id||fallbackId),
    line("Tool name",t.name_en||t.name),
    line("Tool description",t.description_en||t.description),
    line("Category",t.category_en||t.category),
    line("Access",t.access),
    line("Tool path",t.path),
    line("Source path",t.source_path),
    line("Source page",fallbackPath)
  ].join("\n");
}

function diagnosticLines(ctx){
  return [
    line("Page URL",ctx.page_url),
    line("Page title",ctx.page_title),
    line("Referrer",ctx.referrer),
    line("Language",ctx.language),
    line("Locale",ctx.locale),
    line("Timezone",ctx.timezone),
    line("User agent",ctx.user_agent),
    line("Platform",ctx.platform),
    line("Screen",JSON.stringify(ctx.screen)),
    line("Viewport",JSON.stringify(ctx.viewport)),
    line("Touch points",ctx.touch_points),
    line("Online",ctx.online),
    line("Cookies enabled",ctx.cookies_enabled),
    line("Color scheme",ctx.color_scheme),
    line("Connection",JSON.stringify(ctx.connection)),
    line("Client time",ctx.client_time)
  ].join("\n");
}

async function buildEmail(){
  const ctx=context();
  const claims=await firebaseClaims();
  const reference=makeReference();
  const subjectText="[Nexauren Support] "+(KIND_LABELS[kind.value]||"Support")+" — "+subject.value.trim();
  const accountBlock=currentUser?[
    line("Firebase UID",currentUser.uid),
    line("Firebase email",currentUser.email),
    line("Display name",currentUser.displayName),
    line("Photo URL",currentUser.photoURL),
    line("Email verified",currentUser.emailVerified===true),
    line("Provider IDs",ctx.firebase_provider_ids.join(", ")),
    line("Sign-in provider",claims.sign_in_provider),
    line("Auth time",claims.auth_time),
    line("Account created",currentUser.metadata?.creationTime),
    line("Last sign-in",currentUser.metadata?.lastSignInTime)
  ].join("\n"):"No authenticated Firebase user.";
  const body=[
    "NEXAUREN SUPPORT",
    "Reference: "+reference,
    "",
    "REQUEST",
    line("Type",KIND_LABELS[kind.value]||kind.value),
    line("Subject",subject.value.trim()),
    line("Reply email",email.value.trim()),
    "",
    "MESSAGE",
    message.value.trim(),
    "",
    "TOOL CONTEXT",
    toolLines(),
    "",
    "FIREBASE / ACCOUNT",
    accountBlock,
    "",
    "TECHNICAL CONTEXT",
    diagnostics?.checked?diagnosticLines(ctx):"Technical diagnostics were not requested.",
    "",
    "PRIVACY NOTE",
    "This email includes support context that helps diagnose or answer the request. It does not include passwords, authentication tokens, refresh tokens, cookie contents, payment credentials or private file contents."
  ].join("\n");
  return {reference,subjectText,body};
}

async function submit(event){
  event.preventDefault();
  setFeedback("");
  const msg=message.value.trim(),sub=subject.value.trim(),mail=email.value.trim();
  if(!sub){setFeedback("Please add a subject.","error");subject.focus();return}
  if(msg.length<8){setFeedback("Please provide a little more detail.","error");message.focus();return}
  if(!validEmail(mail)){setFeedback("Enter a valid email address.","error");email.focus();return}
  if(msg.length>12000){setFeedback("Your message is too long.","error");return}
  button.disabled=true;
  button.textContent="Opening email…";
  try{
    await AUTH_READY;
    await toolReady;
    const {reference,subjectText,body}=await buildEmail();
    const mailto="mailto:"+SUPPORT_EMAIL+"?subject="+encodeURIComponent(subjectText)+"&body="+encodeURIComponent(body);
    window.location.href=mailto;
    setFeedback("Your email app should now open with the complete message prepared. Reference: "+reference,"success");
  }catch(error){
    setFeedback(error?.message||"We could not prepare the email right now.","error");
  }finally{
    button.disabled=false;
    button.textContent="Open email →";
  }
}

setContextFromUrl();
message.addEventListener("input",()=>{count.textContent=String(message.value.length)});
document.querySelectorAll("[data-kind-link]").forEach(el=>el.addEventListener("click",event=>{
  const target=el.dataset.kindLink;
  event.preventDefault();
  kind.value=target;
  document.querySelector("#support-form")?.scrollIntoView({behavior:"smooth",block:"start"});
  subject.focus();
}));
kind.addEventListener("change",()=>{
  button.textContent="Open email →";
  if(currentTool&&!subject.value)subject.value=(kind.value==="problem"?"Problem with ":"Request about ")+(currentTool.name_en||currentTool.name||currentTool.id);
});
form.addEventListener("submit",submit);
toolReady=loadTool();
