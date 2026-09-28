(()=>{"use strict";
const root=document.getElementById("countdown-studio");
const params=new URLSearchParams(location.search);
const EMBED=params.get("embed")==="1";
const EN=()=>window.NexaurenLanguage?.get?.()==="en";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-5);
const tr={
  pt:{
    brand:"COUNTDOWN STUDIO",back:"← Tempo & Contadores",title:"Countdown Studio",subtitle:"Countdowns, eventos, cronómetro, contador e intervalos num único painel profissional.",
    countdown:"Countdown",event:"Evento",stopwatch:"Cronómetro",counter:"Contador",intervals:"Intervalos",
    functions:"Funções",settings:"Configurações",share:"Partilhar",shareLink:"Copiar link",embed:"Embed",copyCode:"Copiar código",
    openViewer:"Abrir visualizador",downloadConfig:"Baixar configuração",saved:"Configuração copiada.",preset:"Presets",savePreset:"Guardar preset",
    titleLabel:"Título",duration:"Duração",target:"Data e hora alvo",start:"Início",step:"Incremento",min:"Mínimo",max:"Máximo",auto:"Auto tick",
    work:"Trabalho",rest:"Pausa",rounds:"Rondas",interval:"Intervalo",sound:"Som",notification:"Notificação",progress:"Barra de progresso",
    loop:"Repetir",wake:"Manter ecrã ativo",theme:"Tema",format:"Formato",showUnits:"Mostrar unidades",compact:"Compacto",classic:"Clássico",minimal:"Minimal",neon:"Neon",
    startBtn:"Iniciar",pause:"Pausar",resume:"Continuar",reset:"Repor",lap:"Volta",minus:"−",plus10:"+10s",plus30:"+30s",plus1:"+1m",test:"Testar",
    ready:"Pronto",running:"Em execução",finished:"Terminado",copied:"Copiado",savedPreset:"Preset guardado",deletePreset:"Eliminar",
    embedHelp:"Este código coloca apenas o visualizador no teu site.",shareHelp:"O link guarda a configuração no URL e pode ser aberto diretamente.",
    keyboard:"Atalhos",space:"espaço: iniciar/pausar",r:"R: repor",f:"F: ecrã inteiro",
    noPresets:"Ainda não há presets guardados.",mode:"Modo",manual:"Manual",automatic:"Automático",
    count:"Contagem",current:"Atual",soundOff:"Sem som",beep:"Beep",chime:"Chime",alarm:"Alarme",
    viewer:"Visualizador",live:"Ao vivo",next:"Próximo",phase:"Fase",round:"Ronda",of:"de",
    invalid:"Verifique os valores.",fullscreen:"Ecrã inteiro",exitFullscreen:"Sair do ecrã inteiro"
  },
  en:{
    brand:"COUNTDOWN STUDIO",back:"← Time & Counters",title:"Countdown Studio",subtitle:"Countdowns, events, stopwatch, counter, and intervals in one professional panel.",
    countdown:"Countdown",event:"Event",stopwatch:"Stopwatch",counter:"Counter",intervals:"Intervals",
    functions:"Functions",settings:"Settings",share:"Share",shareLink:"Copy link",embed:"Embed",copyCode:"Copy code",
    openViewer:"Open viewer",downloadConfig:"Download config",saved:"Configuration copied.",preset:"Presets",savePreset:"Save preset",
    titleLabel:"Title",duration:"Duration",target:"Target date & time",start:"Start",step:"Step",min:"Minimum",max:"Maximum",auto:"Auto tick",
    work:"Work",rest:"Rest",rounds:"Rounds",interval:"Interval",sound:"Sound",notification:"Notification",progress:"Progress bar",
    loop:"Loop",wake:"Keep screen awake",theme:"Theme",format:"Format",showUnits:"Show units",compact:"Compact",classic:"Classic",minimal:"Minimal",neon:"Neon",
    startBtn:"Start",pause:"Pause",resume:"Resume",reset:"Reset",lap:"Lap",minus:"−",plus10:"+10s",plus30:"+30s",plus1:"+1m",test:"Test",
    ready:"Ready",running:"Running",finished:"Finished",copied:"Copied",savedPreset:"Preset saved",deletePreset:"Delete",
    embedHelp:"This code places only the viewer on your website.",shareHelp:"The link stores the configuration in the URL and opens directly.",
    keyboard:"Shortcuts",space:"space: start/pause",r:"R: reset",f:"F: fullscreen",
    noPresets:"No saved presets yet.",mode:"Mode",manual:"Manual",automatic:"Automatic",
    count:"Count",current:"Current",soundOff:"No sound",beep:"Beep",chime:"Chime",alarm:"Alarm",
    viewer:"Viewer",live:"Live",next:"Next",phase:"Phase",round:"Round",of:"of",
    invalid:"Check your values.",fullscreen:"Fullscreen",exitFullscreen:"Exit fullscreen"
  }
};
const T=()=>tr[EN()?"en":"pt"];

let cfg={
  mode:params.get("mode")||"countdown",
  title:params.get("title")||"Countdown",
  theme:params.get("theme")||"classic",
  format:params.get("format")||"hhmmss",
  sound:params.get("sound")||"beep",
  loop:params.get("loop")==="1",
  notify:params.get("notify")==="1",
  progress:params.get("progress")!=="0",
  wake:params.get("wake")==="1",
  showUnits:params.get("units")!=="0",
  hours:Number(params.get("h")||5),
  minutes:Number(params.get("m")||0),
  seconds:Number(params.get("s")||0),
  target:params.get("target")||"",
  counter:Number(params.get("counter")||0),
  step:Number(params.get("step")||1),
  min:Number(params.get("min")||0),
  max:Number(params.get("max")||999),
  auto:params.get("auto")==="1",
  autoMs:Number(params.get("autoMs")||1000),
  work:Number(params.get("work")||30),
  rest:Number(params.get("rest")||10),
  rounds:Number(params.get("rounds")||8)
};

let timer={running:false,endAt:0,remaining:0,total:0,elapsed:0,startAt:0,intervalMs:1000,phase:"work",round:1,phaseEnd:0,current:cfg.counter,laps:[]};
let loopHandle=null;
let wakeLock=null;
let notified=false;

function durationMs(){
  return ((Number(cfg.hours)||0)*3600+(Number(cfg.minutes)||0)*60+(Number(cfg.seconds)||0))*1000;
}
function formatDuration(ms){
  let n=Math.max(0,Math.round(ms)),h=Math.floor(n/3600000);n%=3600000;
  let m=Math.floor(n/60000);n%=60000;let s=Math.floor(n/1000),cs=Math.floor((n%1000)/10);
  if(cfg.format==="mmss")return String(h*60+m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  if(cfg.format==="mss")return (h*60+m)+":"+String(s).padStart(2,"0");
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function formatStopwatch(ms){
  let n=Math.max(0,Math.floor(ms)),h=Math.floor(n/3600000);n%=3600000;
  let m=Math.floor(n/60000);n%=60000;let s=Math.floor(n/1000),cs=Math.floor((n%1000)/10);
  return h>0?String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(cs).padStart(2,"0"):String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(cs).padStart(2,"0");
}
function targetMs(){
  if(!cfg.target)return 0;
  const d=new Date(cfg.target);
  return Number.isNaN(d.getTime())?0:d.getTime();
}
function tickSound(){
  if(cfg.sound==="none")return;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    const a=new Ctx(),o=a.createOscillator(),g=a.createGain();
    const freq=cfg.sound==="alarm"?880:cfg.sound==="chime"?660:520;
    o.frequency.value=freq;g.gain.setValueAtTime(.0001,a.currentTime);
    g.gain.exponentialRampToValueAtTime(.22,a.currentTime+.015);
    g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.18);
    o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.2);
    setTimeout(()=>a.close().catch(()=>{}),400);
  }catch{}
}
function notify(){
  if(!cfg.notify||!"Notification" in window)return;
  if(Notification.permission==="granted")new Notification(cfg.title||"Countdown",{body:T().finished});
}
async function requestNotify(){if("Notification" in window&&Notification.permission==="default"){try{await Notification.requestPermission()}catch{}}}
async function setWake(on){
  if(on&&"wakeLock" in navigator){
    try{wakeLock=await navigator.wakeLock.request("screen")}catch{}
  }else if(wakeLock){try{await wakeLock.release()}catch{}wakeLock=null}
}
function stopLoop(){if(loopHandle){clearTimeout(loopHandle);loopHandle=null}}
function setProgress(ms,total){const bar=document.querySelector("[data-progress]");if(!bar)return;const p=total>0?clamp(1-ms/total,0,1):0;bar.style.width=(p*100)+"%";bar.parentElement.hidden=!cfg.progress}
function modeLabel(){return T()[cfg.mode]||T().countdown}

function build(){
  if(EMBED){
    document.body.classList.add("cs-embed-mode");
    root.innerHTML='<div class="cs-embed-view '+esc(cfg.theme)+'"><div class="cs-embed-title" data-view-title></div><div class="cs-embed-display" data-display>00:00:00</div><div class="cs-embed-sub" data-view-sub></div><div class="cs-progress"><span data-progress></span></div></div>';
    applyEmbedTheme();return;
  }
  root.innerHTML='<div class="cs-dashboard">'+
    '<aside class="cs-sidebar"><div class="cs-side-heading"><div><span class="cs-eyebrow">NEXAUREN</span><strong>'+esc(T().title)+'</strong></div></div>'+
    '<div class="cs-side-section"><span class="cs-side-label">'+esc(T().functions)+'</span><button data-mode="countdown">◷ <span>'+esc(T().countdown)+'</span></button><button data-mode="event">◉ <span>'+esc(T().event)+'</span></button><button data-mode="stopwatch">◴ <span>'+esc(T().stopwatch)+'</span></button><button data-mode="counter"># <span>'+esc(T().counter)+'</span></button><button data-mode="intervals">◫ <span>'+esc(T().intervals)+'</span></button></div>'+
    '<div class="cs-side-section"><span class="cs-side-label">'+esc(T().preset)+'</span><div class="cs-preset-mini" data-presets></div></div>'+
    '<div class="cs-side-foot"><button class="cs-sidebar-link" data-export-config>⇩ <span>'+esc(T().downloadConfig)+'</span></button></div></aside>'+
    '<section class="cs-workspace"><div class="cs-work-head"><div><span class="cs-eyebrow">'+esc(T().mode)+'</span><h1 data-mode-title></h1><p>'+esc(T().subtitle)+'</p></div><div class="cs-status" data-status>'+esc(T().ready)+'</div></div>'+
    '<div class="cs-layout"><div class="cs-card cs-builder" data-builder></div><div class="cs-card cs-display-card"><div class="cs-display-head"><span data-live>'+esc(T().ready)+'</span><span data-now></span></div><div class="cs-display-wrap"><div class="cs-display" data-display>00:00:00</div><div class="cs-display-title" data-view-title>'+esc(cfg.title)+'</div><div class="cs-phase" data-view-sub></div></div><div class="cs-progress"><span data-progress></span></div><div class="cs-controls"><button class="cs-primary" data-start>'+esc(T().startBtn)+'</button><button class="cs-secondary" data-reset>'+esc(T().reset)+'</button><button class="cs-secondary" data-fullscreen>'+esc(T().fullscreen)+'</button></div><div class="cs-quick"><button data-add="10000">'+esc(T().plus10)+'</button><button data-add="30000">'+esc(T().plus30)+'</button><button data-add="60000">'+esc(T().plus1)+'</button></div></div></div>'+
    '<div class="cs-bottom-grid"><div class="cs-card" data-secondary></div><div class="cs-card cs-share-card"><span class="cs-eyebrow">'+esc(T().share)+'</span><h3>'+esc(T().shareLink)+'</h3><div class="cs-copy-row"><input data-share-url readonly><button class="cs-primary" data-copy-link>Copy</button></div><h3>'+esc(T().embed)+'</h3><textarea data-embed-code readonly></textarea><div class="cs-copy-row"><button class="cs-secondary" data-copy-embed>'+esc(T().copyCode)+'</button><button class="cs-secondary" data-open-viewer>'+esc(T().openViewer)+'</button></div><p class="cs-note">'+esc(T().shareHelp)+'</p></div></div></section></div>';
  bindDashboard();
}
function applyEmbedTheme(){
  document.body.classList.add("cs-theme-"+cfg.theme);
  const title=document.querySelector("[data-view-title]"),sub=document.querySelector("[data-view-sub]");
  if(title)title.textContent=cfg.title;
  if(sub)sub.textContent=modeLabel();
}
function bindDashboard(){
  document.body.classList.add("cs-theme-"+cfg.theme);
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.mode;saveUrl();resetTimer();renderBuilder();});
  document.querySelector("[data-start]").onclick=toggleRun;
  document.querySelector("[data-reset]").onclick=resetTimer;
  document.querySelectorAll("[data-fullscreen]").forEach(b=>b.onclick=fullscreen);
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{if(["countdown","event","intervals"].includes(cfg.mode)){if(cfg.mode==="event")return;timer.remaining+=Number(b.dataset.add);if(!timer.running)timer.total=Math.max(timer.total,timer.remaining);render();}});
  document.querySelector("[data-copy-link]").onclick=()=>copy(location.href);
  document.querySelector("[data-copy-embed]").onclick=()=>copy(document.querySelector("[data-embed-code]").value);
  document.querySelector("[data-open-viewer]").onclick=()=>window.open(embedUrl(),"_blank","noopener");
  document.querySelector("[data-export-config]").onclick=downloadConfig;
  renderPresets();
  renderBuilder();
}
function inputNumber(label,key,value,min,max,step=1){
  return '<div class="cs-field"><label>'+esc(label)+'</label><input class="cs-input" data-key="'+esc(key)+'" type="number" value="'+esc(value)+'" min="'+esc(min)+'" max="'+esc(max)+'" step="'+esc(step)+'"></div>';
}
function commonSettings(){
  return '<details class="cs-settings" open><summary>'+esc(T().settings)+'</summary><div class="cs-form-grid">'+
    '<div class="cs-field full"><label>'+esc(T().titleLabel)+'</label><input class="cs-input" data-key="title" value="'+esc(cfg.title)+'" maxlength="80"></div>'+
    '<div class="cs-field"><label>'+esc(T().theme)+'</label><select class="cs-input" data-key="theme"><option value="classic">'+esc(T().classic)+'</option><option value="minimal">'+esc(T().minimal)+'</option><option value="neon">'+esc(T().neon)+'</option></select></div>'+
    '<div class="cs-field"><label>'+esc(T().format)+'</label><select class="cs-input" data-key="format"><option value="hhmmss">HH:MM:SS</option><option value="mmss">MM:SS</option><option value="mss">M:SS</option></select></div>'+
    '<div class="cs-checks"><label><input type="checkbox" data-key="progress" '+(cfg.progress?"checked":"")+'> '+esc(T().progress)+'</label><label><input type="checkbox" data-key="loop" '+(cfg.loop?"checked":"")+'> '+esc(T().loop)+'</label><label><input type="checkbox" data-key="notify" '+(cfg.notify?"checked":"")+'> '+esc(T().notification)+'</label><label><input type="checkbox" data-key="wake" '+(cfg.wake?"checked":"")+'> '+esc(T().wake)+'</label></div>'+
    '<div class="cs-field"><label>'+esc(T().sound)+'</label><select class="cs-input" data-key="sound"><option value="none">'+esc(T().soundOff)+'</option><option value="beep">'+esc(T().beep)+'</option><option value="chime">'+esc(T().chime)+'</option><option value="alarm">'+esc(T().alarm)+'</option></select></div>'+
    '<div class="cs-field"><button class="cs-secondary cs-full" data-test-sound type="button">'+esc(T().test)+'</button></div>'+
  '</div></details>';
}
function renderBuilder(){
  const b=document.querySelector("[data-builder]");if(!b)return;
  let form="";
  if(cfg.mode==="countdown"){
    form='<div class="cs-form-grid">'+inputNumber(T().duration+" · H", "hours",cfg.hours,0,999,1)+inputNumber(T().duration+" · M","minutes",cfg.minutes,0,59,1)+inputNumber(T().duration+" · S","seconds",cfg.seconds,0,59,1)+'</div>';
  }else if(cfg.mode==="event"){
    form='<div class="cs-form-grid"><div class="cs-field full"><label>'+esc(T().target)+'</label><input class="cs-input" data-key="target" type="datetime-local" value="'+esc(cfg.target||"")+'"></div><div class="cs-note-box">'+esc(new Intl.DateTimeFormat(undefined,{timeZoneName:"long"}).resolvedOptions().timeZone||"Local time")+'</div></div>';
  }else if(cfg.mode==="stopwatch"){
    form='<div class="cs-info-box">'+esc(T().stopwatch)+': '+esc(T().keyboard)+'</div>';
  }else if(cfg.mode==="counter"){
    form='<div class="cs-form-grid">'+inputNumber(T().start,"counter",cfg.counter,-999999999,999999999,1)+inputNumber(T().step,"step",cfg.step,-999999999,999999999,1)+inputNumber(T().min,"min",cfg.min,-999999999,999999999,1)+inputNumber(T().max,"max",cfg.max,-999999999,999999999,1)+'<div class="cs-field full"><label><input type="checkbox" data-key="auto" '+(cfg.auto?"checked":"")+'> '+esc(T().auto)+'</label></div>'+inputNumber(T().interval+" ms","autoMs",cfg.autoMs,50,60000,50)+'</div>';
  }else{
    form='<div class="cs-form-grid">'+inputNumber(T().work+" · s","work",cfg.work,1,86400,1)+inputNumber(T().rest+" · s","rest",cfg.rest,0,86400,1)+inputNumber(T().rounds,"rounds",cfg.rounds,1,9999,1)+'</div>';
  }
  b.innerHTML=form+commonSettings()+ '<div class="cs-builder-actions"><button class="cs-secondary" data-save-preset>'+esc(T().savePreset)+'</button></div>';
  b.querySelectorAll("[data-key]").forEach(el=>{
    const key=el.dataset.key;
    const evt=el.type==="checkbox"?"change":"input";
    el.addEventListener(evt,()=>{cfg[key]=el.type==="checkbox"?el.checked:(el.type==="number"?Number(el.value):el.value);if(key==="theme")document.body.className="nx-page cs-page cs-theme-"+cfg.theme;saveUrl();render();});
  });
  b.querySelector("[data-test-sound]").onclick=()=>{tickSound()};
  b.querySelector("[data-save-preset]").onclick=savePreset;
  updateShareUi();
  document.querySelector("[data-mode-title]").textContent=T()[cfg.mode];
}
function renderPresets(){
  const wrap=document.querySelector("[data-presets]");if(!wrap)return;
  const list=JSON.parse(localStorage.getItem("nexauren:countdown-presets")||"[]");
  wrap.innerHTML=list.length?list.slice(0,8).map((p,i)=>'<button type="button" class="cs-preset-item" data-preset="'+i+'"><span>'+esc(p.name)+'</span><small>'+esc(p.mode)+'</small></button>').join(""):'<div class="cs-preset-empty">'+esc(T().noPresets)+'</div>';
  wrap.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>{const p=list[Number(b.dataset.preset)];Object.assign(cfg,p.cfg||{});resetTimer();renderBuilder();render();});
}
function savePreset(){
  const list=JSON.parse(localStorage.getItem("nexauren:countdown-presets")||"[]");
  const name=prompt(EN()?"Preset name:":"Nome do preset:");if(!name)return;
  list.unshift({name:name.slice(0,40),mode:cfg.mode,cfg:{...cfg}});
  localStorage.setItem("nexauren:countdown-presets",JSON.stringify(list.slice(0,12)));
  renderPresets();
  document.querySelector("[data-status]").textContent=T().savedPreset;
}
function saveUrl(){
  if(EMBED)return;
  const u=new URL(location.href);
  const p=new URLSearchParams();
  ["mode","title","theme","format","sound"].forEach(k=>{if(cfg[k])p.set(k,cfg[k])});
  if(cfg.loop)p.set("loop","1");if(cfg.notify)p.set("notify","1");if(cfg.progress)p.set("progress","1");if(cfg.wake)p.set("wake","1");
  if(cfg.mode==="countdown"){p.set("h",cfg.hours);p.set("m",cfg.minutes);p.set("s",cfg.seconds);}
  if(cfg.mode==="event"&&cfg.target)p.set("target",cfg.target);
  if(cfg.mode==="counter"){p.set("counter",cfg.counter);p.set("step",cfg.step);p.set("min",cfg.min);p.set("max",cfg.max);if(cfg.auto)p.set("auto","1");p.set("autoMs",cfg.autoMs);}
  if(cfg.mode==="intervals"){p.set("work",cfg.work);p.set("rest",cfg.rest);p.set("rounds",cfg.rounds);}
  history.replaceState(null,"",location.pathname+"?"+p.toString());
  updateShareUi();
}
function shareUrl(){return location.origin+location.pathname+"?"+new URLSearchParams([...new URLSearchParams(location.search).entries()].filter(([k])=>k!=="embed")).toString()}
function embedUrl(){const u=new URL(location.href);u.searchParams.set("embed","1");return u.toString()}
function updateShareUi(){
  const link=document.querySelector("[data-share-url]"),code=document.querySelector("[data-embed-code]");
  if(!link||!code)return;
  const url=shareUrl();link.value=url;
  code.value='<iframe src="'+esc(embedUrl()).replace(/&amp;/g,"&")+'" title="'+esc(cfg.title)+'" width="100%" height="240" frameborder="0" loading="lazy" allowfullscreen></iframe>';
}
async function copy(text){try{await navigator.clipboard.writeText(text);flash(T().copied)}catch{}}
function flash(msg){const s=document.querySelector("[data-status]");if(s){s.textContent=msg;setTimeout(()=>{if(s.textContent===msg)s.textContent=timer.running?T().running:T().ready},1200)}}
function downloadConfig(){
  const blob=new Blob([JSON.stringify({nexauren:"countdown-studio",version:1,config:cfg},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nexauren-countdown-config.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function resetTimer(){
  stopLoop();timer={running:false,endAt:0,remaining:cfg.mode==="countdown"?durationMs():0,total:cfg.mode==="countdown"?durationMs():0,elapsed:0,startAt:0,intervalMs:Math.max(50,Number(cfg.autoMs)||1000),phase:"work",round:1,phaseEnd:0,current:cfg.counter,laps:[]};notified=false;setWake(false).catch(()=>{});render();
}
function startCountdown(){
  const ms=timer.remaining>0?timer.remaining:durationMs();if(ms<=0){flash(T().invalid);return}
  timer.remaining=ms;timer.total=Math.max(timer.total,ms);timer.endAt=Date.now()+ms;timer.running=true;setWake(cfg.wake);requestNotify();loop();
}
function startEvent(){
  const t=targetMs();if(!t||t<=Date.now()){flash(T().invalid);return}
  timer.endAt=t;timer.remaining=t-Date.now();timer.total=timer.remaining;timer.running=true;setWake(cfg.wake);requestNotify();loop();
}
function startStopwatch(){timer.startAt=Date.now();timer.running=true;setWake(cfg.wake);loop()}
function startCounter(){timer.running=true;setWake(cfg.wake);loop()}
function startIntervals(){
  const w=Math.max(1,Number(cfg.work)||30)*1000,r=Math.max(0,Number(cfg.rest)||10)*1000;
  timer.phase="work";timer.round=1;timer.phaseEnd=Date.now()+w;timer.total=w;timer.running=true;setWake(cfg.wake);loop();
}
function toggleRun(){
  if(timer.running){pauseTimer();return}
  if(cfg.mode==="countdown")startCountdown();else if(cfg.mode==="event")startEvent();else if(cfg.mode==="stopwatch"){if(timer.elapsed===0)startStopwatch();else{timer.startAt=Date.now()-timer.elapsed;timer.running=true;setWake(cfg.wake);loop()}}else if(cfg.mode==="counter")startCounter();else startIntervals();
}
function pauseTimer(){
  if(!timer.running)return;
  if(cfg.mode==="countdown"||cfg.mode==="event")timer.remaining=Math.max(0,timer.endAt-Date.now());
  if(cfg.mode==="stopwatch")timer.elapsed=Date.now()-timer.startAt;
  timer.running=false;stopLoop();setWake(false);render();
}
function finish(){
  timer.running=false;stopLoop();setWake(false);tickSound();notify();notified=true;
  if(cfg.mode==="countdown"&&cfg.loop){timer.remaining=durationMs();setTimeout(()=>startCountdown(),250);return}
  if(cfg.mode==="intervals"&&timer.phase==="rest"&&timer.round>=cfg.rounds){render();return}
  render();
}
function intervalAdvance(){
  const now=Date.now();
  if(timer.phase==="work"){
    if(Number(cfg.rest)>0){timer.phase="rest";timer.phaseEnd=now+Number(cfg.rest)*1000;timer.total=Number(cfg.rest)*1000}
    else {timer.round++;if(timer.round>cfg.rounds){finish();return}timer.phase="work";timer.phaseEnd=now+Number(cfg.work)*1000;timer.total=Number(cfg.work)*1000}
  }else{
    timer.round++;if(timer.round>cfg.rounds){finish();return}
    timer.phase="work";timer.phaseEnd=now+Number(cfg.work)*1000;timer.total=Number(cfg.work)*1000
  }
}
function loop(){
  stopLoop();
  const frame=()=>{
    if(!timer.running)return;
    const now=Date.now();
    if(cfg.mode==="countdown"||cfg.mode==="event"){timer.remaining=Math.max(0,timer.endAt-now);if(timer.remaining<=0){finish();return}}
    else if(cfg.mode==="stopwatch"){timer.elapsed=now-timer.startAt}
    else if(cfg.mode==="counter"){
      if(cfg.auto){const every=Math.max(50,Number(cfg.autoMs)||1000);if(!timer.lastCounter)timer.lastCounter=now;while(now-timer.lastCounter>=every){timer.current+=Number(cfg.step)||1;timer.lastCounter+=every;if(timer.current>cfg.max||timer.current<cfg.min){if(cfg.loop)timer.current=cfg.counter;else{timer.running=false;stopLoop();break}}}}
    }else if(cfg.mode==="intervals"){while(timer.running&&now>=timer.phaseEnd)intervalAdvance()}
    renderDisplay();
    loopHandle=setTimeout(frame,100);
  };
  frame();
}
function renderDisplay(){
  const display=document.querySelector("[data-display]");if(!display)return;
  let text="00:00:00",sub="",total=0,rem=0;
  if(cfg.mode==="countdown"){rem=timer.running?Math.max(0,timer.endAt-Date.now()):timer.remaining;total=timer.total||durationMs();text=formatDuration(rem)}
  else if(cfg.mode==="event"){rem=timer.running?Math.max(0,timer.endAt-Date.now()):Math.max(0,targetMs()-Date.now());total=timer.total||Math.max(1,targetMs()-Date.now());text=formatDuration(rem);sub=cfg.target?new Date(cfg.target).toLocaleString():""}
  else if(cfg.mode==="stopwatch"){text=formatStopwatch(timer.elapsed);sub=timer.laps.length?timer.laps[timer.laps.length-1]:""}
  else if(cfg.mode==="counter"){text=String(timer.current).padStart(Math.max(4,String(Math.abs(cfg.max)).length),"0");sub=cfg.auto?T().automatic:T().manual}
  else {rem=Math.max(0,(timer.running?timer.phaseEnd:Date.now()+timer.total)-Date.now());total=timer.total;text=formatDuration(rem);sub=T().phase+": "+(timer.phase==="work"?T().work:T().rest)+" · "+T().round+" "+timer.round+" "+T().of+" "+cfg.rounds}
  display.textContent=text;
  const vt=document.querySelector("[data-view-title]");if(vt)vt.textContent=cfg.title;
  const vs=document.querySelector("[data-view-sub]");if(vs)vs.textContent=sub||modeLabel();
  const live=document.querySelector("[data-live]");if(live)live.textContent=timer.running?T().running:(timer.remaining<=0&&["countdown","event"].includes(cfg.mode)?T().finished:T().ready);
  const now=document.querySelector("[data-now]");if(now)now.textContent=new Date().toLocaleTimeString();
  if(["countdown","event","intervals"].includes(cfg.mode))setProgress(rem,total);else setProgress(0,0);
  const start=document.querySelector("[data-start]");if(start)start.textContent=timer.running?T().pause:T().startBtn;
  renderSecondary();
}
function renderSecondary(){
  const s=document.querySelector("[data-secondary]");if(!s)return;
  if(cfg.mode==="stopwatch"){
    s.innerHTML='<div class="cs-section-head"><span class="cs-eyebrow">'+esc(T().stopwatch)+'</span><h3>'+esc(T().lap)+'</h3></div><div class="cs-lap-actions"><button class="cs-secondary" data-lap>'+esc(T().lap)+'</button></div><div class="cs-laps">'+(timer.laps.length?timer.laps.map((x,i)=>'<div><span>#'+(i+1)+'</span><strong>'+esc(x)+'</strong></div>').reverse().join(""):'<p class="cs-note">'+esc(T().ready)+'</p>')+'</div>';
    s.querySelector("[data-lap]").onclick=()=>{if(timer.running){timer.laps.push(formatStopwatch(timer.elapsed));renderSecondary()}};
  }else if(cfg.mode==="counter"){
    s.innerHTML='<div class="cs-section-head"><span class="cs-eyebrow">'+esc(T().counter)+'</span><h3>'+esc(T().current)+'</h3></div><div class="cs-counter-actions"><button class="cs-secondary" data-counter="-1">'+T().minus+'</button><button class="cs-primary" data-counter="1">+1</button></div>';
    s.querySelectorAll("[data-counter]").forEach(b=>b.onclick=()=>{timer.current+=Number(b.dataset.counter)*(Number(cfg.step)||1);timer.current=clamp(timer.current,cfg.min,cfg.max);renderDisplay()});
  }else{
    s.innerHTML='<div class="cs-section-head"><span class="cs-eyebrow">'+esc(T().keyboard)+'</span><h3>⌨</h3></div><div class="cs-shortcuts"><span>'+esc(T().space)+'</span><span>'+esc(T().r)+'</span><span>'+esc(T().f)+'</span></div>';
  }
}
function fullscreen(){
  const el=document.querySelector(".cs-display-card")||document.documentElement;
  if(!document.fullscreenElement)el.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{});
}
function exportState(){
  return {nexauren:"countdown-studio",version:1,config:{...cfg}};
}
function handleKeys(e){
  if(EMBED)return;
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;
  if(e.code==="Space"){e.preventDefault();toggleRun()}
  else if(e.key.toLowerCase()==="r"){e.preventDefault();resetTimer()}
  else if(e.key.toLowerCase()==="f"){e.preventDefault();fullscreen()}
}
window.addEventListener("keydown",handleKeys);
window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&timer.running&&cfg.wake)setWake(true)});
window.addEventListener("nexauren:language-changed",()=>location.reload());

function boot(){
  build();
  resetTimer();
  if(!EMBED){
    document.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>copy(shareUrl()));
    document.querySelectorAll("[data-fullscreen]").forEach(b=>b.onclick=fullscreen);
  }else{
    const canStart=cfg.mode==="countdown"||cfg.mode==="event"||cfg.mode==="intervals";
    if(canStart){if(cfg.mode==="event")startEvent();else if(cfg.mode==="countdown")startCountdown();else startIntervals()}
    else if(cfg.mode==="stopwatch")startStopwatch();
    else if(cfg.mode==="counter"){cfg.auto=true;startCounter()}
  }
}
boot();
})();