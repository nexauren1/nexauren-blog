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
  return {
    page_url:location.href,
    language:document.documentElement.lang||window.NexaurenLanguage?.get?.()||"en",
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"",
    browser:navigator.userAgent||"",
    platform:navigator.platform||"",
    viewport:{width:window.innerWidth,height:window.innerHeight},
    connection:connection?{
      effectiveType:connection.effectiveType||"",
      downlink:connection.downlink??null,
      rtt:connection.rtt??null
    }:{},
    firebase_provider_ids:currentUser?.providerData?.map(p=>p?.providerId).filter(Boolean).slice(0,10)||[],
    firebase_email_verified:currentUser?.emailVerified===true
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

function makeReference(){
  const stamp=new Date().toISOString().slice(0,10).replace(/-/g,"");
  const random=Math.random().toString(36).slice(2,10).toUpperCase();
  return "NX-"+stamp+"-"+random;
}

function toolLines(){
  const fallbackId=params.get("tool_id")||params.get("tool")||"";
  const t=currentTool||{};
  const hasTool=!!(t.id||t.name_en||t.name||t.path||fallbackId);
  if(!hasTool)return "No specific tool was attached.";
  return [
    line("Tool ID",t.id||fallbackId),
    line("Tool name",t.name_en||t.name),
    line("Category",t.category_en||t.category),
    line("Access",t.access),
    line("Path",t.path)
  ].join("\n");
}function diagnosticLines(ctx){
  return [
    line("Browser",ctx.browser),
    line("Platform",ctx.platform),
    line("Viewport",ctx.viewport.width+" × "+ctx.viewport.height),
    line("Language",ctx.language),
    line("Timezone",ctx.timezone),
    line("Connection",ctx.connection.effectiveType||"unknown"),
    line("Page",ctx.page_url)
  ].join("\n");
}async function buildEmail(){
  const ctx=context();
  const reference=makeReference();
  const isProblem=kind.value==="problem";
  const subjectText="[Nexauren Support] "+(KIND_LABELS[kind.value]||"Support")+" — "+subject.value.trim();

  const accountBlock=currentUser?[
    line("Name",currentUser.displayName),
    line("Email",currentUser.email),
    line("Provider",ctx.firebase_provider_ids.map(v=>v.replace(".com","")).join(", ")||"Firebase"),
    line("Email verified",ctx.firebase_email_verified)
  ].join("\n"):"No authenticated account.";

  const sections=[
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
    "ACCOUNT",
    accountBlock,
    "",
    "TOOL",
    toolLines()
  ];

  if(isProblem&&diagnostics?.checked){
    sections.push(
      "",
      "TECHNICAL CONTEXT",
      diagnosticLines(ctx)
    );
  }

  sections.push(
    "",
    "NOTE",
    "Passwords, authentication tokens, refresh tokens, cookie contents, payment credentials and private file contents are not included."
  );

  return {reference,subjectText,body:sections.join("\n")};
}async function submit(event){
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
