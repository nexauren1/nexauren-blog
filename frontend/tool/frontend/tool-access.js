import {auth,onAuthStateChanged,workerFetch} from "/account/account-client.js?v=20260923-tool-access-2";

const REGISTRY_KEY="nexauren:tool-registry:v2";
const PLAN_KEY="nexauren:tool-plan:v2";
const PLAN_TTL=60*1000;

function validRegistry(value){
  return !!value&&Array.isArray(value.categories)&&Array.isArray(value.tools);
}
function readCachedRegistry(){
  try{
    const raw=JSON.parse(localStorage.getItem(REGISTRY_KEY)||"null");
    return validRegistry(raw?.registry)?raw.registry:null;
  }catch{return null;}
}
function writeRegistry(registry){
  try{
    localStorage.setItem(REGISTRY_KEY,JSON.stringify({savedAt:Date.now(),registry}));
  }catch{}
}
async function refreshRegistry(){
  const response=await fetch("/api/tool-registry",{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw new Error("Não foi possível atualizar o catálogo.");
  const registry=await response.json();
  if(!validRegistry(registry))throw new Error("Catálogo inválido.");
  writeRegistry(registry);
  window.dispatchEvent(new CustomEvent("nexauren:tool-registry-updated",{detail:registry}));
  return registry;
}
async function loadRegistry(){
  const cached=readCachedRegistry();
  if(cached){
    refreshRegistry().catch(()=>{});
    return cached;
  }
  return refreshRegistry();
}
function readCachedPlan(user){
  if(!user)return null;
  try{
    const raw=JSON.parse(localStorage.getItem(PLAN_KEY)||"null");
    if(raw?.uid!==user.uid||Date.now()-Number(raw.savedAt||0)>PLAN_TTL)return null;
    return {authenticated:true,pro:!!raw.pro,status:raw.status||"UNKNOWN",plan:raw.plan||"free"};
  }catch{return null;}
}
async function getPlanState(options={}){
  const user=auth.currentUser;
  if(!user)return {authenticated:false,pro:false,status:"NO_ACCOUNT",plan:"free"};
  if(!options.force){
    const cached=readCachedPlan(user);
    if(cached)return cached;
  }
  try{
    const data=await workerFetch("/api/account/billing",{method:"GET"});
    const billing=data?.billing||{};
    const pro=String(billing.plan||"").toLowerCase()==="pro"&&String(billing.status||"").toUpperCase()==="ACTIVE";
    const state={authenticated:true,pro,status:String(billing.status||"FREE"),plan:String(billing.plan||"free")};
    try{localStorage.setItem(PLAN_KEY,JSON.stringify({uid:user.uid,savedAt:Date.now(),...state}));}catch{}
    window.dispatchEvent(new CustomEvent("nexauren:tool-plan-updated",{detail:state}));
    return state;
  }catch{
    return {authenticated:true,pro:false,status:"UNKNOWN",plan:"free"};
  }
}
async function verifyToolAccess(toolId){
  const user=auth.currentUser;
  if(!user)return {authenticated:false,unlocked:false,requiresPro:false};
  try{
    const result=await workerFetch("/api/tool/unlock?tool_id="+encodeURIComponent(toolId),{method:"GET"});
    return {
      authenticated:true,
      unlocked:!!result?.unlocked,
      requiresPro:!!result?.requires_pro
    };
  }catch{
    return {authenticated:true,unlocked:false,requiresPro:true,error:true};
  }
}
function upgradeUrl(){
  const params=new URLSearchParams({return_to:location.pathname+location.search});
  return "/account/upgrade/?"+params.toString();
}
export {auth,onAuthStateChanged,loadRegistry,readCachedRegistry,refreshRegistry,getPlanState,verifyToolAccess,upgradeUrl};
