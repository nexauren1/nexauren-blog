(()=>{"use strict";
const root=document.getElementById("countdown-studio");
if(!root)return;
const params=new URLSearchParams(location.search);
const STANDALONE=params.get("view")==="event"||params.get("embed")==="1";
const EVENT_VIEW=params.get("view")==="event";
const LANG=()=>window.NexaurenLanguage?.get?.()==="en"?"en":"pt";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const THEMES=["classic","midnight","neon","aurora","sunset","forest","paper"];
const tr={
pt:{
brand:"COUNTDOWN STUDIO",subtitle:"Crie, personalize, partilhe e apresente timers profissionais.",
dashboard:"Dashboard",functions:"Funções",themes:"Temas",presets:"Presets",activity:"Atividade",settings:"Configurações",
countdown:"Countdown",event:"Evento",stopwatch:"Cronómetro",counter:"Contador",intervals:"Intervalos",pomodoro:"Pomodoro",
quickStart:"Início rápido",recent:"Recentes",saved:"guardados",runs:"execuções",completed:"concluídos",created:"criados",
title:"Título",duration:"Duração",days:"Dias",hours:"Horas",minutes:"Minutos",seconds:"Segundos",target:"Data e hora alvo",
timezone:"Fuso horário",localTime:"Hora local",utc:"UTC",description:"Descrição",location:"Local",link:"Link do evento",
repeat:"Repetição",none:"Não repetir",daily:"Diário",weekly:"Semanal",monthly:"Mensal",showSeconds:"Mostrar segundos",
step:"Incremento",minimum:"Mínimo",maximum:"Máximo",auto:"Auto tick",work:"Trabalho",rest:"Pausa",rounds:"Rondas",
sound:"Som",volume:"Volume",notification:"Notificação",progress:"Barra de progresso",loop:"Repetir",wake:"Manter ecrã ativo",
format:"Formato",theme:"Tema",onFinish:"Ao terminar",stop:"Parar",repeatTimer:"Repetir timer",countUp:"Continuar a contar",
classic:"Clássico",minimal:"Minimal",neon:"Neon",midnight:"Midnight",aurora:"Aurora",sunset:"Sunset",forest:"Forest",paper:"Paper",
start:"Iniciar",pause:"Pausar",resume:"Continuar",reset:"Repor",lap:"Volta",test:"Testar",savePreset:"Guardar preset",
saveEvent:"Criar evento",openViewer:"Abrir visualizador",share:"Partilhar",copyLink:"Copiar link",embed:"Embed",
copyCode:"Copiar código",downloadConfig:"Exportar JSON",importConfig:"Importar JSON",calendar:"Adicionar ao calendário",
fullscreen:"Ecrã inteiro",ready:"Pronto",running:"Em execução",finished:"Terminado",copied:"Copiado",invalid:"Verifique os valores.",
noPresets:"Ainda não há presets.",keyboard:"Atalhos",space:"Espaço: iniciar/pausar",r:"R: repor",f:"F: ecrã inteiro",
quick:"Presets rápidos",oneMin:"1 min",fiveMin:"5 min",tenMin:"10 min",fifteenMin:"15 min",twentyFiveMin:"25 min",thirtyMin:"30 min",
oneHour:"1 h",eventReady:"Evento pronto",eventViewNote:"Este é um visualizador público do evento.",backToEditor:"Voltar ao editor",
eventDetails:"Detalhes do evento",createdEvent:"Evento criado",noLocation:"Sem local indicado",openLink:"Abrir link",
shareHint:"O link público abre diretamente o visualizador. O dashboard fica oculto para quem recebe o evento.",
privateHint:"As configurações são guardadas localmente no navegador.",statLocal:"dados locais",daysShort:"d",hoursShort:"h",minutesShort:"m",secondsShort:"s",
liveEvent:"Evento ao vivo",until:"até",today:"Hoje",at:"às",createdCount:"Eventos e timers criados",session:"Nesta instalação"
},
en:{
brand:"COUNTDOWN STUDIO",subtitle:"Create, customize, share, and present professional timers.",
dashboard:"Dashboard",functions:"Functions",themes:"Themes",presets:"Presets",activity:"Activity",settings:"Settings",
countdown:"Countdown",event:"Event",stopwatch:"Stopwatch",counter:"Counter",intervals:"Intervals",pomodoro:"Pomodoro",
quickStart:"Quick start",recent:"Recent",saved:"saved",runs:"runs",completed:"completed",created:"created",
title:"Title",duration:"Duration",days:"Days",hours:"Hours",minutes:"Minutes",seconds:"Seconds",target:"Target date & time",
timezone:"Timezone",localTime:"Local time",utc:"UTC",description:"Description",location:"Location",link:"Event link",
repeat:"Repeat",none:"No repeat",daily:"Daily",weekly:"Weekly",monthly:"Monthly",showSeconds:"Show seconds",
step:"Step",minimum:"Minimum",maximum:"Maximum",auto:"Auto tick",work:"Work",rest:"Rest",rounds:"Rounds",
sound:"Sound",volume:"Volume",notification:"Notification",progress:"Progress bar",loop:"Loop",wake:"Keep screen awake",
format:"Format",theme:"Theme",onFinish:"On finish",stop:"Stop",repeatTimer:"Repeat timer",countUp:"Count up",
classic:"Classic",minimal:"Minimal",neon:"Neon",midnight:"Midnight",aurora:"Aurora",sunset:"Sunset",forest:"Forest",paper:"Paper",
start:"Start",pause:"Pause",resume:"Resume",reset:"Reset",lap:"Lap",test:"Test",savePreset:"Save preset",
saveEvent:"Create event",openViewer:"Open viewer",share:"Share",copyLink:"Copy link",embed:"Embed",
copyCode:"Copy code",downloadConfig:"Export JSON",importConfig:"Import JSON",calendar:"Add to calendar",
fullscreen:"Fullscreen",ready:"Ready",running:"Running",finished:"Finished",copied:"Copied",invalid:"Check your values.",
noPresets:"No saved presets yet.",keyboard:"Shortcuts",space:"Space: start/pause",r:"R: reset",f:"F: fullscreen",
quick:"Quick presets",oneMin:"1 min",fiveMin:"5 min",tenMin:"10 min",fifteenMin:"15 min",twentyFiveMin:"25 min",thirtyMin:"30 min",
oneHour:"1 h",eventReady:"Event ready",eventViewNote:"This is a public event viewer.",backToEditor:"Back to editor",
eventDetails:"Event details",createdEvent:"Event created",noLocation:"No location provided",openLink:"Open link",
shareHint:"The public link opens directly in the event viewer. The dashboard stays hidden for recipients.",
privateHint:"Settings are stored locally in your browser.",statLocal:"local data",daysShort:"d",hoursShort:"h",minutesShort:"m",secondsShort:"s",
liveEvent:"Live event",until:"until",today:"Today",at:"at",createdCount:"Timers and events created",session:"This installation"
}};
const T=()=>tr[LANG()];
const localZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||"Local";
const defaultTitle=()=>T().countdown;

let cfg={
mode:params.get("mode")||"countdown",
title:params.get("title")||defaultTitle(),
theme:THEMES.includes(params.get("theme"))?params.get("theme"):"midnight",
format:params.get("format")||"hhmmss",
sound:params.get("sound")||"beep",
volume:Math.max(0,Math.min(1,Number(params.get("volume")||.32))),
loop:params.get("loop")==="1",
notify:params.get("notify")==="1",
progress:params.get("progress")!=="0",
wake:params.get("wake")==="1",
onFinish:params.get("onFinish")||"stop",
days:Number(params.get("d")||0),
hours:Number(params.get("h")||0),
minutes:Number(params.get("m")||5),
seconds:Number(params.get("s")||0),
target:params.get("target")||"",
timezone:params.get("tz")||"local",
description:params.get("desc")||"",
location:params.get("location")||"",
eventLink:params.get("link")||"",
repeat:params.get("repeat")||"none",
eventShowSeconds:params.get("eventSeconds")!=="0",
counter:Number(params.get("counter")||0),
step:Number(params.get("step")||1),
min:Number(params.get("min")||0),
max:Number(params.get("max")||999),
auto:params.get("auto")==="1",
autoMs:Number(params.get("autoMs")||1000),
work:Number(params.get("work")||30),
rest:Number(params.get("rest")||10),
rounds:Number(params.get("rounds")||8),
pomoWork:Number(params.get("pwork")||25),
pomoRest:Number(params.get("prest")||5),
pomoRounds:Number(params.get("prounds")||4)
};

let timer={running:false,endAt:0,remaining:0,total:0,elapsed:0,startAt:0,phase:"work",round:1,phaseEnd:0,current:cfg.counter,laps:[],lastCounter:0};
let loopHandle=null,wakeLock=null;

function durationMs(){
return ((Number(cfg.days)||0)*86400+(Number(cfg.hours)||0)*3600+(Number(cfg.minutes)||0)*60+(Number(cfg.seconds)||0))*1000;
}
function formatDuration(ms){
let n=Math.max(0,Math.round(ms));
let d=Math.floor(n/86400000);n%=86400000;
let h=Math.floor(n/3600000);n%=3600000;
let m=Math.floor(n/60000);n%=60000;
let s=Math.floor(n/1000);
if(cfg.format==="ddhhmmss")return String(d).padStart(2,"0")+":"+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
if(cfg.format==="mmss")return String(d*1440+h*60+m).padStart(2,"0")+":"+String(s).padStart(2,"0");
if(cfg.format==="mss")return (d*1440+h*60+m)+":"+String(s).padStart(2,"0");
return String(d*24+h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function formatStopwatch(ms){
let n=Math.max(0,Math.floor(ms)),h=Math.floor(n/3600000);n%=3600000;
let m=Math.floor(n/60000);n%=60000;let s=Math.floor(n/1000);n%=1000;
let cs=Math.floor(n/10);
return h>0?String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(cs).padStart(2,"0"):String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(cs).padStart(2,"0");
}
function targetMs(){
if(!cfg.target)return 0;
if(cfg.timezone==="utc"){
const raw=cfg.target;
const d=new Date(raw+"Z");
return Number.isNaN(d.getTime())?0:d.getTime();
}
const d=new Date(cfg.target);
return Number.isNaN(d.getTime())?0:d.getTime();
}
function eventDateText(){
const t=targetMs();if(!t)return "";
return new Intl.DateTimeFormat(LANG()==="en"?"en-US":"pt-PT",{dateStyle:"full",timeStyle:"short",timeZone:cfg.timezone==="utc"?"UTC":undefined}).format(new Date(t));
}
function eventZoneText(){return cfg.timezone==="utc"?"UTC":localZone();}
function eventTargetForCurrentView(){
return cfg.target;
}
function tickSound(){
if(cfg.sound==="none"||cfg.volume<=0)return;
try{
const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
const a=new Ctx(),o=a.createOscillator(),g=a.createGain();
const freq=cfg.sound==="alarm"?880:cfg.sound==="chime"?660:520;
o.frequency.value=freq;g.gain.setValueAtTime(.0001,a.currentTime);
g.gain.exponentialRampToValueAtTime(Math.max(.02,cfg.volume*.7),a.currentTime+.02);
g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.22);
o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.24);
setTimeout(()=>a.close().catch(()=>{}),400);
}catch{}
}
async function requestNotify(){
if(cfg.notify&&"Notification" in window&&Notification.permission==="default"){try{await Notification.requestPermission()}catch{}}
}
function notify(){
if(!cfg.notify||!"Notification" in window||Notification.permission!=="granted")return;
try{new Notification(cfg.title||T().countdown,{body:cfg.mode==="event"?eventDateText():T().finished})}catch{}
}
async function setWake(on){
if(on&&"wakeLock" in navigator){try{wakeLock=await navigator.wakeLock.request("screen")}catch{}}
else if(wakeLock){try{await wakeLock.release()}catch{}wakeLock=null}
}
function stopLoop(){if(loopHandle){clearTimeout(loopHandle);loopHandle=null}}
async function copy(value){
try{await navigator.clipboard.writeText(value)}catch{
const ta=document.createElement("textarea");ta.value=value;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
}
toast(T().copied);
}
function toast(msg){
const el=document.querySelector("[data-toast]");if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),1400);
}
function stats(){
return JSON.parse(localStorage.getItem("nexauren:countdown-stats")||'{"created":0,"runs":0,"completed":0,"events":0}');
}
function saveStats(s){localStorage.setItem("nexauren:countdown-stats",JSON.stringify(s))}
function registerRun(){
const s=stats();s.runs++;saveStats(s);
}
function registerCompleted(){
const s=stats();s.completed++;saveStats(s);
}
function registerCreated(isEvent){
const s=stats();s.created++;if(isEvent)s.events=(s.events||0)+1;saveStats(s);
}
function presets(){
try{return JSON.parse(localStorage.getItem("nexauren:countdown-presets")||"[]")}catch{return[]}
}
function savePresets(list){localStorage.setItem("nexauren:countdown-presets",JSON.stringify(list.slice(0,20)))}

function applyTheme(){
document.body.className="nx-page cs-page cs-theme-"+cfg.theme+(STANDALONE?" cs-standalone":"");
}
function quickDuration(minutes){
cfg.mode="countdown";cfg.days=0;cfg.hours=Math.floor(minutes/60);cfg.minutes=minutes%60;cfg.seconds=0;timer={running:false,endAt:0,remaining:0,total:0,elapsed:0,startAt:0,phase:"work",round:1,phaseEnd:0,current:cfg.counter,laps:[],lastCounter:0};saveUrl();buildDashboard();
}
function themeName(key){return T()[key]||key.charAt(0).toUpperCase()+key.slice(1)}
function themeCards(){
return THEMES.map(k=>'<button type="button" class="cs-theme-card '+(cfg.theme===k?"active":"")+'" data-theme="'+k+'"><span class="cs-theme-swatch '+k+'"></span><strong>'+esc(themeName(k))+'</strong></button>').join("");
}
function functionCards(){
const items=[
["countdown","◷",T().countdown,"Timer rápido, presets e apresentação."],
["event","◉",T().event,"Datas, fuso, descrição, local e página pública."],
["stopwatch","◴",T().stopwatch,"Cronómetro de precisão com voltas."],
["counter","#",T().counter,"Contador manual ou automático com limites."],
["intervals","◫",T().intervals,"Trabalho, pausa e rondas configuráveis."],
["pomodoro","◒",T().pomodoro,"Foco com ciclos 25/5 personalizáveis."]
];
return items.map(x=>'<button type="button" class="cs-function-card" data-mode="'+x[0]+'"><span class="cs-ficon">'+x[1]+'</span><span><strong>'+esc(x[2])+'</strong><small>'+esc(x[3])+'</small></span><b>→</b></button>').join("");
}
function quickCards(){
const q=[
[1,T().oneMin],[5,T().fiveMin],[10,T().tenMin],[15,T().fifteenMin],[25,T().twentyFiveMin],[30,T().thirtyMin],[60,T().oneHour]
];
return q.map(x=>'<button type="button" class="cs-quick-chip" data-quick-min="'+x[0]+'">'+esc(x[1])+'</button>').join("");
}

function buildDashboard(){
applyTheme();
root.innerHTML=
'<div class="cs-app">'+
'<aside class="cs-sidebar">'+
'<div class="cs-sidebar-brand"><span class="cs-logo">◴</span><div><strong>NEXAUREN</strong><small>COUNTDOWN STUDIO</small></div></div>'+
'<button type="button" class="cs-nav active" data-dashboard>⌂ <span>'+esc(T().dashboard)+'</span></button>'+
'<div class="cs-side-label">'+esc(T().functions)+'</div><div class="cs-nav-group">'+
'<button type="button" class="cs-nav" data-mode="countdown">◷ <span>'+esc(T().countdown)+'</span></button>'+
'<button type="button" class="cs-nav" data-mode="event">◉ <span>'+esc(T().event)+'</span></button>'+
'<button type="button" class="cs-nav" data-mode="stopwatch">◴ <span>'+esc(T().stopwatch)+'</span></button>'+
'<button type="button" class="cs-nav" data-mode="counter"># <span>'+esc(T().counter)+'</span></button>'+
'<button type="button" class="cs-nav" data-mode="intervals">◫ <span>'+esc(T().intervals)+'</span></button>'+
'<button type="button" class="cs-nav" data-mode="pomodoro">◒ <span>'+esc(T().pomodoro)+'</span></button></div>'+
'<div class="cs-side-label">'+esc(T().themes)+'</div><div class="cs-side-themes" data-side-themes></div>'+
'<button type="button" class="cs-nav cs-nav-bottom" data-export>⇩ <span>'+esc(T().downloadConfig)+'</span></button>'+
'<button type="button" class="cs-nav" data-import>⇧ <span>'+esc(T().importConfig)+'</span></button><input hidden type="file" accept="application/json,.json" data-import-file></aside>'+
'<main class="cs-main">'+
'<header class="cs-main-head"><div><span class="cs-eyebrow">NEXAUREN / '+esc(T().dashboard).toUpperCase()+'</span><h1>'+esc(T().brand)+'</h1><p>'+esc(T().subtitle)+'</p></div><div class="cs-head-actions"><button type="button" class="cs-secondary" data-share>↗ '+esc(T().share)+'</button><button type="button" class="cs-primary" data-fullscreen>⛶</button></div></header>'+
'<section class="cs-stats-grid"><div class="cs-stat"><span>'+esc(T().created)+'</span><strong data-stat-created>0</strong><small>'+esc(T().session)+'</small></div><div class="cs-stat"><span>'+esc(T().runs)+'</span><strong data-stat-runs>0</strong><small>'+esc(T().session)+'</small></div><div class="cs-stat"><span>'+esc(T().completed)+'</span><strong data-stat-completed>0</strong><small>'+esc(T().session)+'</small></div><div class="cs-stat cs-stat-accent"><span>'+esc(T().saved)+'</span><strong data-stat-saved>0</strong><small>'+esc(T().presets)+'</small></div></section>'+
'<section class="cs-dash-grid"><div class="cs-panel"><div class="cs-panel-head"><div><span class="cs-eyebrow">'+esc(T().quickStart)+'</span><h2>'+esc(T().functions)+'</h2></div></div><div class="cs-function-grid">'+functionCards()+'</div></div>'+
'<div class="cs-panel"><div class="cs-panel-head"><div><span class="cs-eyebrow">'+esc(T().quick)+'</span><h2>'+esc(T().quickStart)+'</h2></div></div><div class="cs-quick-grid">'+quickCards()+'</div><div class="cs-private">'+esc(T().privateHint)+'</div></div></section>'+
'<section class="cs-panel"><div class="cs-panel-head"><div><span class="cs-eyebrow">'+esc(T().themes)+'</span><h2>'+esc(T().themes)+'</h2></div></div><div class="cs-theme-grid" data-theme-grid>'+themeCards()+'</div></section>'+
'<section class="cs-editor-wrap"><div class="cs-panel cs-builder-panel"><div class="cs-panel-head"><div><span class="cs-eyebrow">'+esc(T().settings)+'</span><h2 data-mode-title></h2></div><span class="cs-status" data-status>'+esc(T().ready)+'</span></div><div data-builder></div></div>'+
'<div class="cs-panel cs-display-panel"><div class="cs-display-head"><span data-live>'+esc(T().ready)+'</span><span data-now></span></div><div class="cs-display-wrap"><div class="cs-display" data-display>00:00:00</div><div class="cs-display-title" data-view-title>'+esc(cfg.title)+'</div><div class="cs-phase" data-view-sub>'+esc(T().countdown)+'</div></div><div class="cs-progress"><span data-progress></span></div><div class="cs-controls"><button class="cs-primary" data-start>'+esc(T().start)+'</button><button class="cs-secondary" data-reset>'+esc(T().reset)+'</button><button class="cs-secondary" data-fullscreen>'+esc(T().fullscreen)+'</button></div><div class="cs-quick-row">'+quickCards()+'</div></div></section>'+
'<section class="cs-panel cs-secondary-panel" data-secondary></section>'+
'<section class="cs-bottom-grid"><div class="cs-panel"><div class="cs-panel-head"><div><span class="cs-eyebrow">'+esc(T().presets)+'</span><h2>'+esc(T().recent)+'</h2></div><button class="cs-secondary" data-save-preset>'+esc(T().savePreset)+'</button></div><div data-presets class="cs-preset-list"></div></div>'+
'<div class="cs-panel cs-share-panel"><div class="cs-panel-head"><div><span class="cs-eyebrow">'+esc(T().share)+'</span><h2>'+esc(T().share)+'</h2></div></div><input class="cs-input" data-share-url readonly><div class="cs-copy-row"><button class="cs-primary" data-copy-link>'+esc(T().copyLink)+'</button><button class="cs-secondary" data-open-viewer>'+esc(T().openViewer)+'</button></div><textarea class="cs-input cs-code" data-embed-code readonly></textarea><div class="cs-copy-row"><button class="cs-secondary" data-copy-embed>'+esc(T().copyCode)+'</button><button class="cs-secondary" data-calendar hidden>'+esc(T().calendar)+'</button></div><p class="cs-note">'+esc(T().shareHint)+'</p></div></section>'+
'<div class="cs-toast" data-toast role="status"></div></main></div>';
bindDashboard();
renderDashboardStats();
renderBuilder();
renderPresets();
render();
}

function bindDashboard(){
applyTheme();
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.mode;resetTimer();saveUrl();renderBuilder();render()});
document.querySelector("[data-dashboard]")?.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})});
document.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));
document.querySelectorAll("[data-quick-min]").forEach(b=>b.onclick=()=>quickDuration(Number(b.dataset.quickMin)));
document.querySelector("[data-start]").onclick=toggleRun;
document.querySelector("[data-reset]").onclick=resetTimer;
document.querySelectorAll("[data-fullscreen]").forEach(b=>b.onclick=fullscreen);
document.querySelector("[data-share]").onclick=()=>copy(buildShareUrl(cfg.mode==="event"?"event":"embed"));
document.querySelector("[data-copy-link]").onclick=()=>copy(buildShareUrl(cfg.mode==="event"?"event":"embed"));
document.querySelector("[data-copy-embed]").onclick=()=>copy(document.querySelector("[data-embed-code]").value);
document.querySelector("[data-open-viewer]").onclick=()=>window.open(buildShareUrl(cfg.mode==="event"?"event":"embed"),"_blank","noopener,noreferrer");
document.querySelector("[data-save-preset]").onclick=savePreset;
document.querySelector("[data-export]").onclick=downloadConfig;
document.querySelector("[data-import]").onclick=()=>document.querySelector("[data-import-file]").click();
document.querySelector("[data-import-file]").onchange=importConfig;
document.querySelector("[data-calendar]").onclick=downloadICS;
document.querySelectorAll("[data-quick-min]").forEach(b=>b.addEventListener("click",()=>{if(document.querySelector("[data-builder]"))render()}));
}

function setTheme(theme){
if(!THEMES.includes(theme))return;
cfg.theme=theme;applyTheme();saveUrl();renderBuilder();render();
}

function inputNumber(label,key,value,min,max,step=1){
return '<div class="cs-field"><label>'+esc(label)+'</label><input class="cs-input" data-key="'+esc(key)+'" type="number" value="'+esc(value)+'" min="'+esc(min)+'" max="'+esc(max)+'" step="'+esc(step)+'"></div>';
}
function selectField(label,key,value,options){
return '<div class="cs-field"><label>'+esc(label)+'</label><select class="cs-input" data-key="'+esc(key)+'">'+options.map(x=>'<option value="'+esc(x[0])+'" '+(x[0]===value?"selected":"")+'>'+esc(x[1])+'</option>').join("")+'</select></div>';
}
function checkField(key,label,checked){
return '<label class="cs-check"><input type="checkbox" data-key="'+esc(key)+'" '+(checked?"checked":"")+'><span>'+esc(label)+'</span></label>';
}
function commonSettings(extra){
const themeOptions=THEMES.map(k=>'<option value="'+k+'" '+(cfg.theme===k?"selected":"")+'>'+esc(themeName(k))+'</option>').join("");
return '<details class="cs-settings" open><summary>'+esc(T().settings)+'</summary><div class="cs-form-grid">'+
'<div class="cs-field full"><label>'+esc(T().title)+'</label><input class="cs-input" data-key="title" value="'+esc(cfg.title)+'" maxlength="100"></div>'+
selectField(T().theme,"theme",cfg.theme,THEMES.map(k=>[k,themeName(k)]))+
selectField(T().format,"format",cfg.format,[["hhmmss","HH:MM:SS"],["ddhhmmss","DD:HH:MM:SS"],["mmss","MM:SS"],["mss","M:SS"]])+
'<div class="cs-checks">'+checkField("progress",T().progress,cfg.progress)+checkField("loop",T().loop,cfg.loop)+checkField("notify",T().notification,cfg.notify)+checkField("wake",T().wake,cfg.wake)+'</div>'+
selectField(T().sound,"sound",cfg.sound,[["none",T().stop],["beep","Beep"],["chime","Chime"],["alarm","Alarm"]])+
'<div class="cs-field"><label>'+esc(T().volume)+'</label><div class="cs-range-row"><input class="cs-range" data-key="volume" type="range" min="0" max="1" step=".01" value="'+cfg.volume+'"><output>'+Math.round(cfg.volume*100)+'%</output></div></div>'+
'<div class="cs-field full"><label>'+esc(T().theme)+'</label><div class="cs-theme-inline">'+themeCards()+'</div></div>'+
(extra||"")+
'<div class="cs-field"><button class="cs-secondary cs-full" data-test-sound type="button">'+esc(T().test)+'</button></div></div></details>';
}
function renderBuilder(){
const b=document.querySelector("[data-builder]");if(!b)return;
let form="";
if(cfg.mode==="countdown"){
form='<div class="cs-mode-intro"><span class="cs-mode-icon">◷</span><div><strong>'+esc(T().countdown)+'</strong><small>'+esc(T().subtitle)+'</small></div></div><div class="cs-form-grid">'+
inputNumber(T().days,"days",cfg.days,0,3650,1)+inputNumber(T().hours,"hours",cfg.hours,0,999,1)+inputNumber(T().minutes,"minutes",cfg.minutes,0,59,1)+inputNumber(T().seconds,"seconds",cfg.seconds,0,59,1)+
'</div>';
}else if(cfg.mode==="event"){
form='<div class="cs-mode-intro"><span class="cs-mode-icon">◉</span><div><strong>'+esc(T().event)+'</strong><small>'+esc(T().shareHint)+'</small></div></div><div class="cs-form-grid">'+
'<div class="cs-field full"><label>'+esc(T().target)+'</label><input class="cs-input" data-key="target" type="datetime-local" value="'+esc(cfg.target)+'"></div>'+
selectField(T().timezone,"timezone",cfg.timezone,[["local",T().localTime+" · "+localZone()],["utc","UTC"]])+
selectField(T().repeat,"repeat",cfg.repeat,[["none",T().none],["daily",T().daily],["weekly",T().weekly],["monthly",T().monthly]])+
'<div class="cs-field full"><label>'+esc(T().description)+'</label><textarea class="cs-input cs-textarea" data-key="description" maxlength="500">'+esc(cfg.description)+'</textarea></div>'+
'<div class="cs-field"><label>'+esc(T().location)+'</label><input class="cs-input" data-key="location" value="'+esc(cfg.location)+'" maxlength="160"></div>'+
'<div class="cs-field"><label>'+esc(T().link)+'</label><input class="cs-input" data-key="eventLink" type="url" value="'+esc(cfg.eventLink)+'" maxlength="300" placeholder="https://…"></div>'+
'<div class="cs-checks">'+checkField("eventShowSeconds",T().showSeconds,cfg.eventShowSeconds)+'</div>'+
'</div>';
}else if(cfg.mode==="stopwatch"){
form='<div class="cs-info-box"><strong>'+esc(T().stopwatch)+'</strong><span>'+esc(T().keyboard)+'</span></div>';
}else if(cfg.mode==="counter"){
form='<div class="cs-form-grid">'+inputNumber(T().title,"counter",cfg.counter,-999999999,999999999,1)+inputNumber(T().step,"step",cfg.step,-999999999,999999999,1)+inputNumber(T().minimum,"min",cfg.min,-999999999,999999999,1)+inputNumber(T().maximum,"max",cfg.max,-999999999,999999999,1)+
'<div class="cs-checks">'+checkField("auto",T().auto,cfg.auto)+checkField("loop",T().loop,cfg.loop)+'</div>'+inputNumber("Interval · ms","autoMs",cfg.autoMs,50,60000,50)+'</div>';
}else if(cfg.mode==="pomodoro"){
form='<div class="cs-mode-intro"><span class="cs-mode-icon">◒</span><div><strong>'+esc(T().pomodoro)+'</strong><small>25 / 5 · '+esc(T().rounds)+'</small></div></div><div class="cs-form-grid">'+inputNumber(T().work+" · min","pomoWork",cfg.pomoWork,1,240,1)+inputNumber(T().rest+" · min","pomoRest",cfg.pomoRest,0,120,1)+inputNumber(T().rounds,"pomoRounds",cfg.pomoRounds,1,99,1)+'</div>';
}else{
form='<div class="cs-form-grid">'+inputNumber(T().work+" · s","work",cfg.work,1,86400,1)+inputNumber(T().rest+" · s","rest",cfg.rest,0,86400,1)+inputNumber(T().rounds,"rounds",cfg.rounds,1,9999,1)+'</div>';
}
let extra="";
if(cfg.mode==="event"){
extra='<div class="cs-field full cs-event-actions"><button class="cs-primary" data-create-event type="button">'+esc(T().saveEvent)+'</button><button class="cs-secondary" data-calendar type="button">'+esc(T().calendar)+'</button></div>';
}
if(["countdown","intervals","pomodoro"].includes(cfg.mode)){
extra='<div class="cs-field full">'+selectField(T().onFinish,"onFinish",cfg.onFinish,[["stop",T().stop],["repeat",T().repeatTimer],["countup",T().countUp]])+'</div>';
}
b.innerHTML=form+commonSettings(extra)+'<div class="cs-builder-actions"><button class="cs-secondary" data-save-preset>'+esc(T().savePreset)+'</button></div>';
bindBuilder();
}
function bindBuilder(){
const b=document.querySelector("[data-builder]");if(!b)return;
 b.querySelectorAll("[data-theme]").forEach(btn=>btn.addEventListener("click",()=>setTheme(btn.dataset.theme)));
b.querySelectorAll("[data-key]").forEach(el=>{
const key=el.dataset.key;
const evt=el.type==="checkbox"||el.type==="range"||el.tagName==="SELECT"?"change":"input";
el.addEventListener(evt,()=>{
cfg[key]=el.type==="checkbox"?el.checked:el.type==="range"?Number(el.value):el.type==="number"?Number(el.value):el.value;
if(["minutes","seconds"].includes(key))cfg[key]=clamp(Number(cfg[key])||0,0,59);
if(key==="theme"){applyTheme();document.querySelectorAll("[data-theme]").forEach(x=>x.classList.toggle("active",x.dataset.theme===cfg.theme))}
saveUrl();resetTimer(false);render();
});
});
b.querySelector("[data-test-sound]")?.addEventListener("click",tickSound);
b.querySelector("[data-save-preset]")?.addEventListener("click",savePreset);
b.querySelector("[data-create-event]")?.addEventListener("click",createEvent);
b.querySelector("[data-calendar]")?.addEventListener("click",downloadICS);
}
function renderPresets(){
const wrap=document.querySelector("[data-presets]");if(!wrap)return;
const list=presets();
wrap.innerHTML=list.length?list.slice(0,10).map((p,i)=>'<div class="cs-preset-row"><button type="button" data-preset="'+i+'"><span>'+esc(p.name)+'</span><small>'+esc(p.mode)+'</small></button><button type="button" class="cs-preset-del" data-delete-preset="'+i+'" aria-label="Delete">×</button></div>').join(""):'<div class="cs-preset-empty">'+esc(T().noPresets)+'</div>';
wrap.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>{const p=list[Number(b.dataset.preset)];Object.assign(cfg,p.cfg||{});resetTimer();saveUrl();renderBuilder();render()});
wrap.querySelectorAll("[data-delete-preset]").forEach(b=>b.onclick=()=>{const next=list.filter((_,i)=>i!==Number(b.dataset.deletePreset));savePresets(next);renderPresets();renderDashboardStats()});
}
function savePreset(){
const name=prompt(LANG()==="en"?"Preset name:":"Nome do preset:");if(!name)return;
const list=presets();list.unshift({name:name.slice(0,50),mode:cfg.mode,cfg:{...cfg}});
savePresets(list);renderPresets();renderDashboardStats();toast(T().copied);
}
function buildShareUrl(view){
const u=new URL(location.href);u.search="";
const p=new URLSearchParams();
["mode","title","theme","format","sound"].forEach(k=>{if(cfg[k]!=null&&cfg[k]!=="")p.set(k,cfg[k])});
p.set("volume",String(cfg.volume));
if(cfg.loop)p.set("loop","1");if(cfg.notify)p.set("notify","1");if(cfg.progress)p.set("progress","1");if(cfg.wake)p.set("wake","1");if(cfg.onFinish!=="stop")p.set("onFinish",cfg.onFinish);
if(cfg.mode==="countdown"){p.set("d",cfg.days);p.set("h",cfg.hours);p.set("m",cfg.minutes);p.set("s",cfg.seconds)}
if(cfg.mode==="event"){
if(cfg.target)p.set("target",cfg.target);p.set("tz",cfg.timezone);p.set("desc",cfg.description);p.set("location",cfg.location);p.set("link",cfg.eventLink);p.set("repeat",cfg.repeat);if(!cfg.eventShowSeconds)p.set("eventSeconds","0");
}
if(cfg.mode==="counter"){p.set("counter",cfg.counter);p.set("step",cfg.step);p.set("min",cfg.min);p.set("max",cfg.max);if(cfg.auto)p.set("auto","1");p.set("autoMs",cfg.autoMs)}
if(cfg.mode==="intervals"){p.set("work",cfg.work);p.set("rest",cfg.rest);p.set("rounds",cfg.rounds)}
if(cfg.mode==="pomodoro"){p.set("pwork",cfg.pomoWork);p.set("prest",cfg.pomoRest);p.set("prounds",cfg.pomoRounds)}
p.set("view",view||"embed");
return u.origin+u.pathname+"?"+p.toString();
}
function embedUrl(){return buildShareUrl(cfg.mode==="event"?"event":"embed")}
function saveUrl(){
if(STANDALONE)return;
const u=new URL(location.href);u.search="";
const p=new URLSearchParams(new URL(buildShareUrl("dashboard")).search);p.delete("view");
history.replaceState(null,"",location.pathname+(p.toString()?"?"+p.toString():""));
}
function updateShareUi(){
const link=document.querySelector("[data-share-url]");const code=document.querySelector("[data-embed-code]");
if(link)link.value=embedUrl();
if(code)code.value='<iframe src="'+esc(embedUrl()).replace(/&amp;/g,"&")+'" title="Nexauren Countdown Studio" style="width:100%;min-height:320px;border:0" loading="lazy" allow="fullscreen"></iframe>';
const cal=document.querySelector("[data-calendar]");if(cal&&cfg.mode!=="event")cal.hidden=true;
}
function createEvent(){
if(cfg.mode!=="event")return;
if(!targetMs()||targetMs()<=Date.now()){toast(T().invalid);return}
registerCreated(true);saveUrl();updateShareUi();render();
window.open(buildShareUrl("event"),"_blank","noopener,noreferrer");
toast(T().createdEvent);
}
function downloadConfig(){
const blob=new Blob([JSON.stringify({nexauren:"countdown-studio",version:2,config:cfg},null,2)],{type:"application/json"});
const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nexauren-countdown-config.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
}
function importConfig(e){
const file=e.target.files?.[0];if(!file)return;
const reader=new FileReader();
reader.onload=()=>{
try{const data=JSON.parse(reader.result);if(!data?.config)throw new Error("bad");Object.assign(cfg,data.config);applyTheme();saveUrl();renderBuilder();renderPresets();render();toast(T().copied)}
catch{toast(T().invalid)}
e.target.value="";
};
reader.readAsText(file);
}
function downloadICS(){
if(cfg.mode!=="event"||!targetMs()){toast(T().invalid);return}
const t=new Date(targetMs());
const stamp=t.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
const uid=(location.host+"-"+targetMs()).replace(/[^a-z0-9_-]/gi,"");
const ics=[
"BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Nexauren//Countdown Studio//EN",
"BEGIN:VEVENT","UID:"+uid+"@nexaurenstory.com","DTSTAMP:"+stamp,"DTSTART:"+stamp,
"SUMMARY:"+escapeICS(cfg.title),"DESCRIPTION:"+escapeICS(cfg.description),
"LOCATION:"+escapeICS(cfg.location),"END:VEVENT","END:VCALENDAR"].join("\r\n");
const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nexauren-event.ics";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
}
function escapeICS(s){return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n")}

function resetTimer(renderNow=true){
stopLoop();setWake(false);
timer.running=false;timer.endAt=0;timer.remaining=0;timer.total=0;timer.elapsed=0;timer.startAt=0;timer.phase="work";timer.round=1;timer.phaseEnd=0;timer.current=cfg.counter;timer.laps=[];timer.lastCounter=Date.now();
if(cfg.mode==="countdown")timer.remaining=durationMs();
if(cfg.mode==="event")timer.remaining=Math.max(0,targetMs()-Date.now());
if(cfg.mode==="intervals"){timer.total=Math.max(1,Number(cfg.work)||30)*1000}
if(cfg.mode==="pomodoro"){timer.total=Math.max(1,Number(cfg.pomoWork)||25)*60000}
if(renderNow)render();
}
function startCountdown(){
const ms=timer.remaining>0?timer.remaining:durationMs();if(ms<=0){toast(T().invalid);return}
timer.remaining=ms;timer.total=Math.max(timer.total,ms);timer.endAt=Date.now()+ms;timer.running=true;registerRun();requestNotify();setWake(cfg.wake);loop();
}
function startEvent(){
const t=targetMs();if(!t||t<=Date.now()){toast(T().invalid);return}
timer.endAt=t;timer.remaining=t-Date.now();timer.total=timer.remaining;timer.running=true;registerRun();requestNotify();setWake(cfg.wake);loop();
}
function startStopwatch(){timer.startAt=Date.now()-timer.elapsed;timer.running=true;registerRun();setWake(cfg.wake);loop()}
function startCounter(){timer.running=true;registerRun();setWake(cfg.wake);loop()}
function startIntervals(){
const w=Math.max(1,Number(cfg.work)||30)*1000;timer.phase="work";timer.round=1;timer.phaseEnd=Date.now()+w;timer.total=w;timer.running=true;registerRun();setWake(cfg.wake);loop();
}
function startPomodoro(){
const w=Math.max(1,Number(cfg.pomoWork)||25)*60000;timer.phase="work";timer.round=1;timer.phaseEnd=Date.now()+w;timer.total=w;timer.running=true;registerRun();setWake(cfg.wake);loop();
}
function toggleRun(){
if(timer.running){pauseTimer();return}
if(cfg.mode==="countdown")startCountdown();
else if(cfg.mode==="event")startEvent();
else if(cfg.mode==="stopwatch")startStopwatch();
else if(cfg.mode==="counter")startCounter();
else if(cfg.mode==="pomodoro")startPomodoro();
else startIntervals();
}
function pauseTimer(){
if(!timer.running)return;
if(cfg.mode==="countdown"||cfg.mode==="event")timer.remaining=Math.max(0,timer.endAt-Date.now());
if(cfg.mode==="stopwatch")timer.elapsed=Date.now()-timer.startAt;
timer.running=false;stopLoop();setWake(false);render();
}
function addTime(ms){
if(!["countdown","intervals","pomodoro"].includes(cfg.mode))return;
if(cfg.mode==="countdown"){timer.remaining+=ms;if(!timer.running)timer.total=Math.max(timer.total,timer.remaining)}
else{timer.total+=ms;if(timer.running)timer.phaseEnd+=ms;else timer.remaining=ms}
render();
}
function nextEventTarget(base){
const d=new Date(base);
if(cfg.repeat==="daily")d.setDate(d.getDate()+1);
else if(cfg.repeat==="weekly")d.setDate(d.getDate()+7);
else if(cfg.repeat==="monthly")d.setMonth(d.getMonth()+1);
return d;
}
function finish(){
timer.running=false;stopLoop();setWake(false);registerCompleted();tickSound();notify();
if(cfg.mode==="event"&&cfg.repeat!=="none"){const next=nextEventTarget(targetMs());if(cfg.timezone==="utc"){cfg.target=next.toISOString().slice(0,16)}else{const p=n=>String(n).padStart(2,"0");cfg.target=next.getFullYear()+"-"+p(next.getMonth()+1)+"-"+p(next.getDate())+"T"+p(next.getHours())+":"+p(next.getMinutes());}resetTimer();startEvent();return}
if(cfg.onFinish==="repeatTimer"&&(cfg.mode==="countdown"||cfg.mode==="intervals"||cfg.mode==="pomodoro")){setTimeout(()=>{resetTimer(false);timer.remaining=cfg.mode==="countdown"?durationMs():0;if(cfg.mode==="countdown")startCountdown();else if(cfg.mode==="pomodoro")startPomodoro();else startIntervals()},250);return}
render();
}
function intervalAdvance(){
const now=Date.now();
if(cfg.mode==="pomodoro"){
const work=Math.max(1,Number(cfg.pomoWork)||25)*60000,rest=Math.max(0,Number(cfg.pomoRest)||5)*60000;
if(timer.phase==="work"){timer.phase="rest";timer.phaseEnd=now+rest;timer.total=rest}
else{timer.round++;if(timer.round>cfg.pomoRounds){finish();return}timer.phase="work";timer.phaseEnd=now+work;timer.total=work}
}else{
const rest=Math.max(0,Number(cfg.rest)||0)*1000,work=Math.max(1,Number(cfg.work)||30)*1000;
if(timer.phase==="work"){if(rest>0){timer.phase="rest";timer.phaseEnd=now+rest;timer.total=rest}else{timer.round++;if(timer.round>cfg.rounds){finish();return}timer.phase="work";timer.phaseEnd=now+work;timer.total=work}}
else{timer.round++;if(timer.round>cfg.rounds){finish();return}timer.phase="work";timer.phaseEnd=now+work;timer.total=work}
}
}
function loop(){
stopLoop();
const frame=()=>{
if(!timer.running)return;
const now=Date.now();
if(cfg.mode==="countdown"||cfg.mode==="event"){timer.remaining=Math.max(0,timer.endAt-now);if(timer.remaining<=0){finish();return}}
else if(cfg.mode==="stopwatch"){timer.elapsed=now-timer.startAt}
else if(cfg.mode==="counter"&&cfg.auto){
const every=Math.max(50,Number(cfg.autoMs)||1000);
if(!timer.lastCounter)timer.lastCounter=now;
while(now-timer.lastCounter>=every){timer.current+=Number(cfg.step)||1;timer.lastCounter+=every;if(timer.current>cfg.max||timer.current<cfg.min){if(cfg.loop)timer.current=cfg.counter;else{timer.running=false;stopLoop();break}}}
}
else if((cfg.mode==="intervals"||cfg.mode==="pomodoro")){while(timer.running&&now>=timer.phaseEnd)intervalAdvance()}
renderDisplay();loopHandle=setTimeout(frame,100);
};
frame();
}
function render(){
renderDisplay();renderSecondary();updateShareUi();renderDashboardStats();
}
function renderDisplay(){
const display=document.querySelector("[data-display]");if(!display)return;
let text="00:00:00",sub="",total=0,rem=0;
if(cfg.mode==="countdown"){rem=timer.running?Math.max(0,timer.endAt-Date.now()):timer.remaining;total=timer.total||durationMs();text=formatDuration(rem)}
else if(cfg.mode==="event"){rem=timer.running?Math.max(0,timer.endAt-Date.now()):Math.max(0,targetMs()-Date.now());total=timer.total||Math.max(1,targetMs()-Date.now());text=cfg.eventShowSeconds?formatDuration(rem):formatEventCompact(rem);sub=eventDateText()}
else if(cfg.mode==="stopwatch"){text=formatStopwatch(timer.elapsed);sub=timer.laps.length?timer.laps[timer.laps.length-1]:""}
else if(cfg.mode==="counter"){text=String(timer.current);sub=cfg.auto?T().auto:T().counter}
else{rem=Math.max(0,(timer.running?timer.phaseEnd:Date.now()+timer.total)-Date.now());total=timer.total;text=formatDuration(rem);const maxRounds=cfg.mode==="pomodoro"?cfg.pomoRounds:cfg.rounds;sub=(timer.phase==="work"?T().work:T().rest)+" · "+T().rounds+" "+timer.round+" / "+maxRounds}
display.textContent=text;
const vt=document.querySelector("[data-view-title]");if(vt)vt.textContent=cfg.title;
const vs=document.querySelector("[data-view-sub]");if(vs)vs.textContent=sub||modeLabel();
const live=document.querySelector("[data-live]");if(live)live.textContent=timer.running?T().running:(["countdown","event"].includes(cfg.mode)&&timer.remaining<=0?T().finished:T().ready);
const now=document.querySelector("[data-now]");if(now)now.textContent=new Date().toLocaleTimeString();
const bar=document.querySelector("[data-progress]");if(bar){let p=total>0?clamp(1-rem/total,0,1):0;bar.style.width=(p*100)+"%";bar.parentElement.hidden=!cfg.progress}
const start=document.querySelector("[data-start]");if(start)start.textContent=timer.running?T().pause:T().start;
if(EVENT_VIEW){
const standTitle=document.querySelector("[data-event-title]");const standDate=document.querySelector("[data-event-date]");const standDesc=document.querySelector("[data-event-desc]");const standLoc=document.querySelector("[data-event-location]");const standLink=document.querySelector("[data-event-link]");
if(standTitle)standTitle.textContent=cfg.title;
if(standDate)standDate.textContent=eventDateText()+" · "+eventZoneText();
if(standDesc)standDesc.textContent=cfg.description;
if(standLoc)standLoc.textContent=cfg.location;
if(standLink){standLink.href=cfg.eventLink||"#";standLink.hidden=!cfg.eventLink}
}
}
function formatEventCompact(ms){
let n=Math.max(0,Math.round(ms)),d=Math.floor(n/86400000);n%=86400000;
let h=Math.floor(n/3600000);n%=3600000;let m=Math.floor(n/60000);n%=60000;let s=Math.floor(n/1000);
return d+" "+T().daysShort+" "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function modeLabel(){return T()[cfg.mode]||T().countdown}
function renderSecondary(){
const s=document.querySelector("[data-secondary]");if(!s)return;
if(cfg.mode==="stopwatch"){
s.innerHTML='<div class="cs-mini-head"><span class="cs-eyebrow">'+esc(T().stopwatch)+'</span><strong>'+esc(T().lap)+'</strong></div><div class="cs-lap-actions"><button class="cs-secondary" data-lap>'+esc(T().lap)+'</button></div><div class="cs-laps">'+(timer.laps.length?timer.laps.map((x,i)=>'<div><span>#'+(i+1)+'</span><strong>'+esc(x)+'</strong></div>').reverse().join(""):'<p class="cs-note">'+esc(T().ready)+'</p>')+'</div>';
s.querySelector("[data-lap]")?.addEventListener("click",()=>{if(timer.running){timer.laps.push(formatStopwatch(timer.elapsed));renderSecondary()}});
}else if(cfg.mode==="counter"){
s.innerHTML='<div class="cs-mini-head"><span class="cs-eyebrow">'+esc(T().counter)+'</span><strong>'+esc(T().counter)+'</strong></div><div class="cs-counter-actions"><button class="cs-secondary" data-counter="-1">−</button><button class="cs-primary" data-counter="1">+1</button></div>';
s.querySelectorAll("[data-counter]").forEach(b=>b.onclick=()=>{timer.current=clamp(timer.current+Number(b.dataset.counter)*(Number(cfg.step)||1),cfg.min,cfg.max);renderDisplay()});
}else{
const p=cfg.mode==="pomodoro"?[cfg.pomoWork,cfg.pomoRest,cfg.pomoRounds]:[cfg.work,cfg.rest,cfg.rounds];
s.innerHTML='<div class="cs-shortcuts"><span>'+esc(T().keyboard)+'</span><b>'+esc(T().space)+'</b><b>'+esc(T().r)+'</b><b>'+esc(T().f)+'</b></div><div class="cs-summary">'+esc(String(p[0])+(cfg.mode==="pomodoro"?" / ":" · ")+String(p[1])+" · "+String(p[2]))+'</div>';
}
}
function renderDashboardStats(){
const s=stats();const saved=presets().length;
document.querySelector("[data-stat-created]")&&(document.querySelector("[data-stat-created]").textContent=s.created||0);
document.querySelector("[data-stat-runs]")&&(document.querySelector("[data-stat-runs]").textContent=s.runs||0);
document.querySelector("[data-stat-completed]")&&(document.querySelector("[data-stat-completed]").textContent=s.completed||0);
document.querySelector("[data-stat-saved]")&&(document.querySelector("[data-stat-saved]").textContent=saved);
}
function fullscreen(){
const el=document.querySelector("[data-display]")?.closest(".cs-display-panel")||document.documentElement;
if(!document.fullscreenElement)el.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{});
}
function restoreThemeSelection(){
document.querySelectorAll("[data-theme]").forEach(b=>b.classList.toggle("active",b.dataset.theme===cfg.theme));
}
function buildStandalone(){
applyTheme();
document.body.classList.add("cs-standalone");
if(EVENT_VIEW){
root.innerHTML='<div class="cs-event-view '+esc(cfg.theme)+'"><div class="cs-event-mark">NEXAUREN / EVENT</div><div class="cs-event-card"><div class="cs-event-top"><span class="cs-event-pill">'+esc(T().liveEvent)+'</span><span>'+esc(eventZoneText())+'</span></div><div class="cs-event-title" data-event-title>'+esc(cfg.title)+'</div><div class="cs-event-display" data-display>00:00:00</div><div class="cs-event-date" data-event-date></div><div class="cs-event-progress"><span data-progress></span></div><div class="cs-event-desc" data-event-desc></div><div class="cs-event-meta"><span data-event-location></span><a data-event-link target="_blank" rel="noopener" hidden>'+esc(T().openLink)+'</a></div><div class="cs-event-actions"><button class="cs-event-btn" type="button" data-calendar>'+esc(T().calendar)+'</button><button class="cs-event-btn" type="button" data-fullscreen>'+esc(T().fullscreen)+'</button></div></div><div class="cs-event-note">'+esc(T().eventViewNote)+'</div></div>';
document.querySelector("[data-calendar]")?.addEventListener("click",downloadICS);
document.querySelector("[data-fullscreen]")?.addEventListener("click",fullscreen);
startEvent();
}else{
root.innerHTML='<div class="cs-embed-view '+esc(cfg.theme)+'"><div class="cs-embed-title" data-view-title></div><div class="cs-embed-display" data-display>00:00:00</div><div class="cs-embed-sub" data-view-sub></div><div class="cs-progress"><span data-progress></span></div></div>';
if(cfg.mode==="countdown")startCountdown();else if(cfg.mode==="event")startEvent();else if(cfg.mode==="stopwatch")startStopwatch();else if(cfg.mode==="counter"){cfg.auto=true;startCounter()}else if(cfg.mode==="pomodoro")startPomodoro();else startIntervals();
}
}

function boot(){
if(STANDALONE){buildStandalone();return}
buildDashboard();
resetTimer();
restoreThemeSelection();
}
window.addEventListener("keydown",e=>{
if(STANDALONE)return;
if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;
if(e.code==="Space"){e.preventDefault();toggleRun()}else if(e.key.toLowerCase()==="r"){e.preventDefault();resetTimer()}else if(e.key.toLowerCase()==="f"){e.preventDefault();fullscreen()}
});
window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&timer.running&&cfg.wake)setWake(true)});
window.addEventListener("nexauren:language-changed",()=>location.reload());
boot();
})();