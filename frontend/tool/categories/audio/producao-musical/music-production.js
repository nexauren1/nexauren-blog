(()=>{"use strict";
const path=location.pathname;
const id=(path.match(/producao-musical\/([^/]+)/)||[])[1]||"";
const rootEl=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const EN=()=>window.NexaurenLanguage?.get?.()==="en";
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const copyText=async text=>{
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    try{
      const ta=document.createElement("textarea");
      ta.value=text;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok;
    }catch{return false}
  }
};
const formatTime=s=>{
  const value=Math.max(0,Number(s)||0),m=Math.floor(value/60),sec=value%60;
  return m+":"+sec.toFixed(2).padStart(5,"0");
};
const common={
  pt:{brand:"PRODUÇÃO MUSICAL",back:"← Ferramentas de áudio",kicker:"NEXAUREN · PRODUÇÃO MUSICAL"},
  en:{brand:"MUSIC PRODUCTION",back:"← Audio tools",kicker:"NEXAUREN · MUSIC PRODUCTION"}
};
const BPM={
  pt:{
    title:"Calculadora de BPM & Tempo",
    lead:"Converta BPM em tempos úteis para delays, reverbs, chops, LFOs e automações.",
    bpm:"BPM",division:"Divisão",tap:"Tap tempo",clearTap:"Limpar taps",copy:"Copiar resultados",copied:"Copiado.",
    calc:"Calcular",reset:"Repor",ms:"Milissegundos",sec:"Segundos",hz:"Frequência",beat:"1 batida",
    bar:"1 barra (4/4)",selected:"Divisão selecionada",eighth:"1/8",sixteenth:"1/16",
    hint:"O tap tempo usa as últimas batidas estáveis. Valores são recalculados automaticamente."
  },
  en:{
    title:"BPM & Tempo Calculator",
    lead:"Convert BPM into useful timing values for delays, reverbs, chops, LFOs, and automation.",
    bpm:"BPM",division:"Division",tap:"Tap tempo",clearTap:"Clear taps",copy:"Copy results",copied:"Copied.",
    calc:"Calculate",reset:"Reset",ms:"Milliseconds",sec:"Seconds",hz:"Frequency",beat:"1 beat",
    bar:"1 bar (4/4)",selected:"Selected division",eighth:"1/8",sixteenth:"1/16",
    hint:"Tap tempo uses the latest stable taps. Values recalculate automatically."
  }
};
const PITCH={
  pt:{
    title:"Calculadora de Pitch & Time Stretch",
    lead:"Calcule a mudança de BPM, a nova duração, o playback rate e a transposição em semitons e cents.",
    source:"BPM original",target:"BPM alvo",duration:"Duração original",semi:"Semitons",centsInput:"Cents",
    calc:"Calcular",reset:"Repor",copy:"Copiar resultados",copied:"Copiado.",
    speed:"Playback rate",newDuration:"Nova duração",ratio:"Razão de pitch",change:"Mudança de tempo",
    totalCents:"Transposição",targetTime:"Duração resultante",hint:"Separar speed de pitch ajuda a configurar time-stretch e pitch-shift de forma independente."
  },
  en:{
    title:"Pitch & Time Stretch Calculator",
    lead:"Calculate BPM change, new duration, playback rate, and pitch transposition in semitones and cents.",
    source:"Source BPM",target:"Target BPM",duration:"Original duration",semi:"Semitones",centsInput:"Cents",
    calc:"Calculate",reset:"Reset",copy:"Copy results",copied:"Copied.",
    speed:"Playback rate",newDuration:"New duration",ratio:"Pitch ratio",change:"Tempo change",
    totalCents:"Transposition",targetTime:"Resulting duration",hint:"Keeping speed and pitch separate helps configure time-stretch and pitch-shift independently."
  }
};
const SCALE={
  pt:{
    title:"Finder de Escala & Tonalidade",
    lead:"Veja notas, fórmula, acordes diatónicos e acordes com sétima para qualquer tonalidade.",
    root:"Tónica",scale:"Escala",notes:"Notas",chords:"Acordes diatónicos",sevenths:"Acordes com 7ª",
    formula:"Fórmula em semitons",copy:"Copiar resumo",copied:"Resumo copiado.",quality:"Qualidade"
  },
  en:{
    title:"Key & Scale Finder",
    lead:"View notes, scale formula, diatonic triads, and seventh chords for any key.",
    root:"Root",scale:"Scale",notes:"Notes",chords:"Diatonic chords",sevenths:"7th chords",
    formula:"Semitone formula",copy:"Copy summary",copied:"Summary copied.",quality:"Quality"
  }
};
const CHORD={
  pt:{
    title:"Gerador de Progressões de Acordes",
    lead:"Gere progressões diatónicas para pop, trap, house, lo-fi, R&B e outros contextos.",
    root:"Tónica",scale:"Escala",mood:"Vibe",generate:"Gerar",random:"Aleatória",copy:"Copiar",
    copied:"Copiado.",hint:"As progressões são pontos de partida; experimente inversões, voicings, ritmo e baixo.",
    starter:"Starter",emotional:"Emocional",dark:"Dark",uplifting:"Uplifting",club:"Club",lofi:"Lo-fi",
    progression:"Progressão",degrees:"Graus",notes:"Notas",qualities:"Qualidades"
  },
  en:{
    title:"Chord Progression Generator",
    lead:"Generate diatonic progressions for pop, trap, house, lo-fi, R&B, and other contexts.",
    root:"Root",scale:"Scale",mood:"Vibe",generate:"Generate",random:"Random",copy:"Copy",
    copied:"Copied.",hint:"Use progressions as a starting point; try inversions, voicings, rhythm, and bass.",
    starter:"Starter",emotional:"Emotional",dark:"Dark",uplifting:"Uplifting",club:"Club",lofi:"Lo-fi",
    progression:"Progression",degrees:"Degrees",notes:"Notes",qualities:"Qualities"
  }
};
const DRUM={
  pt:{
    title:"Gerador de Drum Patterns",lead:"Construa grooves de 16 passos, aplique swing, gere variações e ouça o padrão no navegador.",
    bpm:"BPM",swing:"Swing",style:"Estilo",basic:"Basic",house:"House",trap:"Trap",boombap:"Boom bap",
    random:"Gerar variação",clear:"Limpar",play:"▶ Reproduzir",stop:"■ Parar",copy:"Copiar padrão",copied:"Copiado.",
    ready:"Pronto.",playing:"A reproduzir…",step:"Passo",kick:"Kick",snare:"Snare",hat:"Hi-Hat",clap:"Clap",
    hint:"O swing desloca os passos ímpares de cada par de semicolcheias. O áudio é sintetizado localmente no navegador."
  },
  en:{
    title:"Drum Pattern Generator",lead:"Build 16-step grooves, apply swing, generate variations, and audition the pattern in your browser.",
    bpm:"BPM",swing:"Swing",style:"Style",basic:"Basic",house:"House",trap:"Trap",boombap:"Boom bap",
    random:"Generate variation",clear:"Clear",play:"▶ Play",stop:"■ Stop",copy:"Copy pattern",copied:"Copied.",
    ready:"Ready.",playing:"Playing…",step:"Step",kick:"Kick",snare:"Snare",hat:"Hi-Hat",clap:"Clap",
    hint:"Swing offsets odd steps inside each pair of 16th notes. Audio is synthesized locally in the browser."
  }
};

function renderFrame(t){
  const lang=EN()?"en":"pt";
  document.title=t.title+" — Nexauren";
  const brand=document.querySelector("[data-brand]");
  const back=document.querySelector("[data-back]");
  if(brand)brand.textContent=common[lang].brand;
  if(back){back.textContent=common[lang].back;back.href="/tool/categories/audio/?lang="+lang}
  document.querySelector("[data-kicker]").textContent=common[lang].kicker;
  document.querySelector("[data-title]").textContent=t.title;
  document.querySelector("[data-lead]").textContent=t.lead;
}
function frame(){
  rootEl.innerHTML='<section class="mp-hero"><div class="mp-kicker" data-kicker></div><h1 data-title></h1><p data-lead></p></section><div id="tool-ui"></div>';
}
const notes=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const scales={
  major:{steps:[0,2,4,5,7,9,11],namePt:"Maior",nameEn:"Major"},
  minor:{steps:[0,2,3,5,7,8,10],namePt:"Menor natural",nameEn:"Natural minor"},
  dorian:{steps:[0,2,3,5,7,9,10],namePt:"Dórico",nameEn:"Dorian"},
  mixolydian:{steps:[0,2,4,5,7,9,10],namePt:"Mixolídio",nameEn:"Mixolydian"},
  phrygian:{steps:[0,1,3,5,7,8,10],namePt:"Frígio",nameEn:"Phrygian"},
  harmonic:{steps:[0,2,3,5,7,8,11],namePt:"Menor harmónica",nameEn:"Harmonic minor"},
  melodic:{steps:[0,2,3,5,7,9,11],namePt:"Menor melódica",nameEn:"Melodic minor"},
  majorPent:{steps:[0,2,4,7,9],namePt:"Pentatónica maior",nameEn:"Major pentatonic"},
  minorPent:{steps:[0,3,5,7,10],namePt:"Pentatónica menor",nameEn:"Minor pentatonic"},
  blues:{steps:[0,3,5,6,7,10],namePt:"Blues",nameEn:"Blues"}
};
const scaleNames=()=>Object.fromEntries(Object.entries(scales).map(([k,v])=>[k,EN()?v.nameEn:v.namePt]));
const roman=["I","II","III","IV","V","VI","VII"];
const romanLower=["i","ii","iii","iv","v","vi","vii"];

function quality3(a,b){
  const x=(a+12)%12,y=(b+12)%12;
  if(x===4&&y===7)return "";
  if(x===3&&y===7)return "m";
  if(x===3&&y===6)return "dim";
  if(x===4&&y===8)return "aug";
  return "";
}
function quality7(a,b,c){
  const x=[(a+12)%12,(b+12)%12,(c+12)%12].join(",");
  return ({
    "4,7,11":"maj7","4,7,10":"7","3,7,10":"m7","3,6,10":"m7♭5",
    "3,6,9":"dim7","4,8,10":"aug7"
  })[x]||"";
}
function degreeChord(rootIndex,steps,degree,want7=true){
  if(steps.length<7)return null;
  const indexes=[degree,(degree+2)%7,(degree+4)%7];
  const fourth=(degree+6)%7;
  const pcs=indexes.map(i=>(rootIndex+steps[i])%12);
  const intervals=[(pcs[1]-pcs[0]+12)%12,(pcs[2]-pcs[0]+12)%12];
  const seventhPc=(rootIndex+steps[fourth])%12;
  const i7=(seventhPc-pcs[0]+12)%12;
  return {
    degree,
    pcs,
    notes:pcs.map(p=>notes[p]),
    symbol:notes[pcs[0]]+quality3(intervals[0],intervals[1])+(want7?quality7(intervals[0],intervals[1],i7):""),
    triadQuality:quality3(intervals[0],intervals[1])||"—",
    seventhQuality:quality7(intervals[0],intervals[1],i7)||"—"
  };
}
function chordSymbol(rootIndex,steps,degree){
  const ch=degreeChord(rootIndex,steps,degree,false);
  return ch?ch.symbol:"—";
}

function bpmTool(){
  const t=BPM[EN()?"en":"pt"];renderFrame(t);
  const u=document.getElementById("tool-ui");
  u.innerHTML='<section class="mp-grid"><div class="mp-card"><div class="mp-row"><div class="mp-field"><label>'+t.bpm+'</label><input id="mp-bpm" class="mp-input" type="number" min="20" max="300" value="128" inputmode="decimal"></div><div class="mp-field"><label>'+t.division+'</label><select id="mp-division" class="mp-select"></select></div></div><div class="mp-actions"><button id="mp-tap" class="mp-button">'+t.tap+'</button><button id="mp-clear-tap" class="mp-button secondary">'+t.clearTap+'</button><button id="mp-reset" class="mp-button secondary">'+t.reset+'</button></div><p class="mp-note" id="mp-tap-status">'+t.hint+'</p></div><div class="mp-card"><div id="mp-bpm-result" class="mp-result"></div><div class="mp-actions mp-result-actions"><button id="mp-copy" class="mp-button secondary">'+t.copy+'</button></div></div></section>';
  const bpm=document.getElementById("mp-bpm");
  const division=document.getElementById("mp-division");
  const result=document.getElementById("mp-bpm-result");
  const tap=document.getElementById("mp-tap");
  const clearTap=document.getElementById("mp-clear-tap");
  const tapStatus=document.getElementById("mp-tap-status");
  const copy=document.getElementById("mp-copy");
  const divisions=[
    ["whole","1/1",4],["half","1/2",2],["quarter","1/4",1],["eighth","1/8",.5],
    ["dottedEighth","1/8 dotted",.75],["tripletEighth","1/8 triplet",1/3],["sixteenth","1/16",.25],
    ["dottedSixteenth","1/16 dotted",.375],["tripletSixteenth","1/16 triplet",1/6],["thirtySecond","1/32",.125],["sixtyFourth","1/64",.0625]
  ];
  divisions.forEach(x=>division.add(new Option(x[1],x[0])));
  division.value="quarter";
  let taps=[];
  let tapTimer=null;
  function calc(){
    const b=clamp(Number(bpm.value)||128,20,300);
    bpm.value=b;
    const beat=60000/b;
    const entry=divisions.find(x=>x[0]===division.value)||divisions[2];
    const ms=beat*entry[2];
    result.innerHTML='<div class="mp-stat-grid mp-stat-grid-compact">'+
      '<div class="mp-stat"><small>'+t.selected+'</small><strong>'+ms.toFixed(2)+' ms</strong></div>'+
      '<div class="mp-stat"><small>'+t.beat+'</small><strong>'+beat.toFixed(2)+' ms</strong></div>'+
      '<div class="mp-stat"><small>'+t.bar+'</small><strong>'+(beat*4).toFixed(2)+' ms</strong></div>'+
      '<div class="mp-stat"><small>'+t.eighth+'</small><strong>'+(beat*.5).toFixed(2)+' ms</strong></div>'+
      '<div class="mp-stat"><small>'+t.sixteenth+'</small><strong>'+(beat*.25).toFixed(2)+' ms</strong></div>'+
      '<div class="mp-stat"><small>'+t.hz+'</small><strong>'+(1000/ms).toFixed(4)+' Hz</strong></div>'+
      '<div class="mp-stat"><small>'+t.sec+'</small><strong>'+(ms/1000).toFixed(4)+' s</strong></div>'+
      '<div class="mp-stat"><small>BPM</small><strong>'+b.toFixed(2)+'</strong></div>'+
      '</div>';
  }
  function clearTaps(){
    taps=[];clearTimeout(tapTimer);tapStatus.textContent=t.hint;
  }
  function doTap(){
    const now=performance.now();
    if(taps.length&&now-taps[taps.length-1]>2000)taps=[];
    taps.push(now);
    if(taps.length>6)taps.shift();
    if(taps.length>=2){
      const intervals=[];
      for(let i=1;i<taps.length;i++)intervals.push(taps[i]-taps[i-1]);
      const avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;
      bpm.value=clamp(60000/avg,20,300).toFixed(2);
      tapStatus.textContent=""+(EN()?"Tap tempo: ":"Tap tempo: ")+Number(bpm.value).toFixed(2)+" BPM";
      calc();
    }
    clearTimeout(tapTimer);tapTimer=setTimeout(clearTaps,2200);
  }
  bpm.oninput=calc;division.onchange=calc;tap.onclick=doTap;clearTap.onclick=clearTaps;
  document.getElementById("mp-reset").onclick=()=>{bpm.value=128;division.value="quarter";clearTaps();calc()};
  const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();calc()}};
  window.addEventListener("keydown",onKey);
  copy.onclick=async()=>{const ok=await copyText(result.innerText);if(ok){copy.textContent=t.copied;setTimeout(()=>copy.textContent=t.copy,1000)}};
  calc();
  return ()=>{clearTimeout(tapTimer);window.removeEventListener("keydown",onKey)};
}

function pitchTool(){
  const t=PITCH[EN()?"en":"pt"];renderFrame(t);
  const u=document.getElementById("tool-ui");
  u.innerHTML='<section class="mp-grid"><div class="mp-card"><div class="mp-row"><div class="mp-field"><label>'+t.source+'</label><input id="mp-source" class="mp-input" type="number" min="20" max="300" value="100"></div><div class="mp-field"><label>'+t.target+'</label><input id="mp-target" class="mp-input" type="number" min="20" max="300" value="128"></div></div><div class="mp-row"><div class="mp-field"><label>'+t.duration+'</label><input id="mp-duration" class="mp-input" type="number" min=".01" step=".01" value="16"></div><div class="mp-field"><label>'+t.semi+'</label><input id="mp-semi" class="mp-input" type="number" min="-24" max="24" step="1" value="0"></div></div><div class="mp-row"><div class="mp-field"><label>'+t.centsInput+'</label><input id="mp-cents" class="mp-input" type="number" min="-99" max="99" step="1" value="0"></div></div><div class="mp-actions"><button id="mp-pitch-calc" class="mp-button">'+t.calc+'</button><button id="mp-pitch-reset" class="mp-button secondary">'+t.reset+'</button></div><p class="mp-note">'+t.hint+'</p></div><div class="mp-card"><div id="mp-pitch-result" class="mp-result"></div><div class="mp-actions mp-result-actions"><button id="mp-pitch-copy" class="mp-button secondary">'+t.copy+'</button></div></div></section>';
  const source=document.getElementById("mp-source"),target=document.getElementById("mp-target"),duration=document.getElementById("mp-duration");
  const semi=document.getElementById("mp-semi"),cents=document.getElementById("mp-cents"),result=document.getElementById("mp-pitch-result"),copy=document.getElementById("mp-pitch-copy");
  function calc(){
    const s=clamp(Number(source.value)||100,20,300),tg=clamp(Number(target.value)||128,20,300),du=Math.max(.01,Number(duration.value)||1);
    const sem=clamp(Number(semi.value)||0,-24,24),ct=clamp(Number(cents.value)||0,-99,99),total=sem*100+ct;
    source.value=s;target.value=tg;duration.value=du;
    const rate=tg/s,change=(rate-1)*100,newDur=du/rate,ratio=Math.pow(2,total/1200);
    result.innerHTML='<div class="mp-stat-grid mp-stat-grid-compact">'+
      '<div class="mp-stat"><small>'+t.speed+'</small><strong>'+(rate*100).toFixed(3)+'%</strong></div>'+
      '<div class="mp-stat"><small>'+t.change+'</small><strong>'+((change>=0?"+":"")+change.toFixed(2))+'%</strong></div>'+
      '<div class="mp-stat"><small>'+t.newDuration+'</small><strong>'+formatTime(newDur)+'</strong></div>'+
      '<div class="mp-stat"><small>'+t.targetTime+'</small><strong>'+newDur.toFixed(3)+' s</strong></div>'+
      '<div class="mp-stat"><small>'+t.ratio+'</small><strong>'+ratio.toFixed(6)+'×</strong></div>'+
      '<div class="mp-stat"><small>'+t.totalCents+'</small><strong>'+((total>=0?"+":"")+total)+' ct</strong></div>'+
      '</div>';
  }
  [source,target,duration,semi,cents].forEach(el=>el.oninput=calc);
  document.getElementById("mp-pitch-calc").onclick=calc;
  document.getElementById("mp-pitch-reset").onclick=()=>{source.value=100;target.value=128;duration.value=16;semi.value=0;cents.value=0;calc()};
  const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();calc()}};
  window.addEventListener("keydown",onKey);
  copy.onclick=async()=>{const ok=await copyText(result.innerText);if(ok){copy.textContent=t.copied;setTimeout(()=>copy.textContent=t.copy,1000)}};
  calc();
  return ()=>window.removeEventListener("keydown",onKey);
}

function fillScaleSelect(select){
  const names=scaleNames();
  Object.entries(names).forEach(([key,name])=>select.add(new Option(name,key)));
}
function scaleTool(){
  const t=SCALE[EN()?"en":"pt"];renderFrame(t);
  const u=document.getElementById("tool-ui");
  u.innerHTML='<section class="mp-grid"><div class="mp-card"><div class="mp-row"><div class="mp-field"><label>'+t.root+'</label><select id="mp-scale-root" class="mp-select"></select></div><div class="mp-field"><label>'+t.scale+'</label><select id="mp-scale-type" class="mp-select"></select></div></div><div class="mp-actions"><button id="mp-scale-copy" class="mp-button">'+t.copy+'</button></div></div><div class="mp-card" id="mp-scale-out"></div></section>';
  const root=document.getElementById("mp-scale-root"),type=document.getElementById("mp-scale-type"),out=document.getElementById("mp-scale-out"),copy=document.getElementById("mp-scale-copy");
  notes.forEach(n=>root.add(new Option(n,n)));fillScaleSelect(type);root.value="C";type.value="major";
  function calc(){
    const ri=notes.indexOf(root.value),spec=scales[type.value],st=spec.steps,ns=st.map(x=>notes[(ri+x)%12]);
    const triads=st.length===7?st.map((_,i)=>degreeChord(ri,st,i,false)):[],sevenths=st.length===7?st.map((_,i)=>degreeChord(ri,st,i,true)):[];
    const formula=st.map((n,i)=>i===0?0:n-st[i-1]).join(" · ");
    const triadHtml=triads.map((ch,i)=>'<tr><td>'+roman[i]+'</td><td>'+esc(ch.symbol)+'</td><td>'+esc(ch.notes.join(" – "))+'</td><td>'+esc(ch.triadQuality)+'</td></tr>').join("");
    const seventhHtml=sevenths.map((ch,i)=>'<tr><td>'+roman[i]+'</td><td>'+esc(ch.symbol)+'</td><td>'+esc(ch.notes.join(" – "))+'</td><td>'+esc(ch.seventhQuality)+'</td></tr>').join("");
    out.innerHTML='<h3>'+t.notes+'</h3><div class="mp-scale">'+ns.map((n,i)=>'<span class="mp-note-box '+(i===0?"root":"")+'">'+n+'</span>').join("")+'</div><p class="mp-note mp-formula">'+t.formula+': '+formula+'</p>'+
      '<h3>'+t.chords+'</h3><div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>°</th><th>'+t.chords+'</th><th>'+t.notes+'</th><th>'+t.quality+'</th></tr></thead><tbody>'+triadHtml+'</tbody></table></div>'+
      (sevenths.length?'<h3 class="mp-section-title">'+t.sevenths+'</h3><div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>°</th><th>'+t.sevenths+'</th><th>'+t.notes+'</th><th>'+t.quality+'</th></tr></thead><tbody>'+seventhHtml+'</tbody></table></div>':"");
  }
  root.onchange=calc;type.onchange=calc;
  copy.onclick=async()=>{const ok=await copyText(out.innerText);if(ok){copy.textContent=t.copied;setTimeout(()=>copy.textContent=t.copy,1000)}};
  calc();
}

const progressionPatterns={
  starter:[[0,4,5,3],[5,3,0,4],[0,3,4,0]],
  emotional:[[5,3,0,4],[0,4,5,3],[1,4,0,5]],
  dark:[[0,6,5,6],[5,6,0,0],[1,5,6,0]],
  uplifting:[[0,3,4,0],[0,4,3,5],[3,0,4,5]],
  club:[[0,4,5,3],[0,3,5,4],[5,3,0,4]],
  lofi:[[1,4,0,5],[3,2,1,4],[0,2,3,1]]
};

function chordTool(){
  const t=CHORD[EN()?"en":"pt"];renderFrame(t);
  const u=document.getElementById("tool-ui");
  u.innerHTML='<section class="mp-grid"><div class="mp-card"><div class="mp-row"><div class="mp-field"><label>'+t.root+'</label><select id="mp-chord-root" class="mp-select"></select></div><div class="mp-field"><label>'+t.scale+'</label><select id="mp-chord-scale" class="mp-select"></select></div></div><div class="mp-field"><label>'+t.mood+'</label><select id="mp-chord-mood" class="mp-select"></select></div><div class="mp-actions"><button id="mp-chord-generate" class="mp-button">'+t.generate+'</button><button id="mp-chord-random" class="mp-button secondary">'+t.random+'</button></div><p class="mp-note">'+t.hint+'</p></div><div class="mp-card"><div id="mp-chord-out" class="mp-progressions"></div><div class="mp-actions mp-result-actions"><button id="mp-chord-copy" class="mp-button secondary">'+t.copy+'</button></div></div></section>';
  const root=document.getElementById("mp-chord-root"),scale=document.getElementById("mp-chord-scale"),mood=document.getElementById("mp-chord-mood"),out=document.getElementById("mp-chord-out"),copy=document.getElementById("mp-chord-copy");
  notes.forEach(n=>root.add(new Option(n,n)));
  const scaleOptions=["major","minor","dorian","mixolydian","phrygian","harmonic","melodic"];
  scaleOptions.forEach(k=>scale.add(new Option(scales[k][EN()?"nameEn":"namePt"],k)));
  const moodNames=EN()?{starter:t.starter,emotional:t.emotional,dark:t.dark,uplifting:t.uplifting,club:t.club,lofi:t.lofi}:{starter:t.starter,emotional:t.emotional,dark:t.dark,uplifting:t.uplifting,club:t.club,lofi:t.lofi};
  Object.entries(moodNames).forEach(([k,v])=>mood.add(new Option(v,k)));
  root.value="C";scale.value="major";mood.value="starter";
  let generated=[];
  function generate(selected){
    const ri=notes.indexOf(root.value),st=scales[scale.value].steps,patterns=progressionPatterns[mood.value],pattern=patterns[selected??Math.floor(Math.random()*patterns.length)]||patterns[0];
    generated=pattern.map(deg=>degreeChord(ri,st,deg,false)).filter(Boolean);
    const seventh=pattern.map(deg=>degreeChord(ri,st,deg,true)).filter(Boolean);
    out.innerHTML='<div class="mp-prog-main"><div class="mp-chips">'+generated.map((ch,i)=>'<span class="mp-chip mp-chip-large">'+roman[ch.degree]+' · '+esc(ch.symbol)+'</span>').join("")+'</div><div class="mp-note">'+t.notes+': '+generated.map(ch=>ch.notes.join("–")).join("  |  ")+'</div></div>'+
      '<div class="mp-prog-list">'+generated.map((ch,i)=>'<div class="mp-prog"><strong>'+t.progression+' '+(i+1)+': '+esc(ch.symbol)+'</strong><span>'+roman[ch.degree]+' · '+esc(ch.notes.join(" – "))+' · '+esc(ch.triadQuality)+'</span></div>').join("")+'</div>';
    out.dataset.text=[t.progression,generated.map(ch=>roman[ch.degree]+" "+ch.symbol).join(" → "),generated.map(ch=>ch.notes.join("-")).join(" | ")].join("\n");
    void seventh;
  }
  document.getElementById("mp-chord-generate").onclick=()=>generate();
  document.getElementById("mp-chord-random").onclick=()=>generate(Math.floor(Math.random()*(progressionPatterns[mood.value].length)));
  [root,scale,mood].forEach(el=>el.onchange=()=>generate());
  copy.onclick=async()=>{const ok=await copyText(out.dataset.text||"");if(ok){copy.textContent=t.copied;setTimeout(()=>copy.textContent=t.copy,1000)}};
  generate(0);
}

function drumTool(){
  const t=DRUM[EN()?"en":"pt"];renderFrame(t);
  const u=document.getElementById("tool-ui");
  u.innerHTML='<section class="mp-grid single"><div class="mp-card"><div class="mp-row"><div class="mp-field"><label>'+t.bpm+'</label><input id="mp-drum-bpm" class="mp-input" type="number" min="40" max="220" value="128"></div><div class="mp-field"><label>'+t.style+'</label><select id="mp-drum-style" class="mp-select"><option value="basic">'+t.basic+'</option><option value="house">'+t.house+'</option><option value="trap">'+t.trap+'</option><option value="boombap">'+t.boombap+'</option></select></div></div><div class="mp-field"><label>'+t.swing+' <span id="mp-swing-value">0%</span></label><input id="mp-drum-swing" class="mp-range" type="range" min="0" max="60" value="0"></div><div class="mp-pattern-scroll"><div id="mp-drum-grid" class="mp-pattern"></div></div><div class="mp-actions"><button id="mp-drum-random" class="mp-button">'+t.random+'</button><button id="mp-drum-clear" class="mp-button secondary">'+t.clear+'</button><button id="mp-drum-play" class="mp-button secondary">'+t.play+'</button><button id="mp-drum-stop" class="mp-button secondary">'+t.stop+'</button><button id="mp-drum-copy" class="mp-button secondary">'+t.copy+'</button></div><p id="mp-drum-status" class="mp-note">'+t.ready+'</p><p class="mp-note">'+t.hint+'</p></div></section>';
  const bpm=document.getElementById("mp-drum-bpm"),style=document.getElementById("mp-drum-style"),swing=document.getElementById("mp-drum-swing"),swingValue=document.getElementById("mp-swing-value"),grid=document.getElementById("mp-drum-grid"),status=document.getElementById("mp-drum-status"),copy=document.getElementById("mp-drum-copy");
  const labels={kick:t.kick,snare:t.snare,hat:t.hat,clap:t.clap};
  const presets={
    basic:{kick:[0,4,8,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14],clap:[12]},
    house:{kick:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],clap:[4,12]},
    trap:{kick:[0,3,7,10,14],snare:[4,12],hat:[0,2,4,6,8,10,12,14],clap:[12]},
    boombap:{kick:[0,7,8,10,14],snare:[4,12],hat:[0,2,4,6,8,10,12,14],clap:[12]}
  };
  let pattern=typeof structuredClone==="function"?structuredClone(presets.basic):JSON.parse(JSON.stringify(presets.basic));
  let playing=false,currentStep=-1,timer=null,audio=null,noiseBuffer=null;
  const clone=o=>JSON.parse(JSON.stringify(o));
  function draw(){
    const head='<div></div>'+Array.from({length:16},(_,i)=>'<div class="mp-step-number">'+(i+1)+'</div>').join("");
    const body=Object.keys(labels).map(row=>{
      return '<div class="mp-row-label">'+esc(labels[row])+'</div>'+Array.from({length:16},(_,i)=>'<button type="button" aria-label="'+esc(labels[row])+" "+t.step+" "+(i+1)+'" class="mp-step '+(pattern[row].includes(i)?"active ":"")+(currentStep===i?"playing":"")+'" data-row="'+row+'" data-step="'+i+'"></button>').join("");
    }).join("");
    grid.innerHTML=head+body;
    grid.querySelectorAll(".mp-step").forEach(btn=>btn.onclick=()=>{
      const row=btn.dataset.row,step=Number(btn.dataset.step);
      pattern[row]=pattern[row].includes(step)?pattern[row].filter(x=>x!==step):pattern[row].concat(step).sort((a,b)=>a-b);
      draw();
    });
  }
  function setStatus(text){status.textContent=text}
  function buildNoise(){
    if(noiseBuffer||!audio)return noiseBuffer;
    const buffer=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    noiseBuffer=buffer;return buffer;
  }
  function kick(time){
    const o=audio.createOscillator(),g=audio.createGain();
    o.type="sine";o.frequency.setValueAtTime(150,time);o.frequency.exponentialRampToValueAtTime(48,time+.13);
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.9,time+.004);g.gain.exponentialRampToValueAtTime(.0001,time+.2);
    o.connect(g).connect(audio.destination);o.start(time);o.stop(time+.21);
  }
  function noiseHit(time,opts={}){
    const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),g=audio.createGain();
    src.buffer=buildNoise();filter.type=opts.filter||"highpass";filter.frequency.value=opts.freq||2500;
    const d=opts.d||.08;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(opts.gain||.3,time+.002);g.gain.exponentialRampToValueAtTime(.0001,time+d);
    src.connect(filter).connect(g).connect(audio.destination);src.start(time);src.stop(time+d+.01);
  }
  function snare(time){
    noiseHit(time,{freq:1300,gain:.35,d:.12});
    const o=audio.createOscillator(),g=audio.createGain();o.type="triangle";o.frequency.value=180;
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.22,time+.002);g.gain.exponentialRampToValueAtTime(.0001,time+.09);
    o.connect(g).connect(audio.destination);o.start(time);o.stop(time+.1);
  }
  function hat(time){noiseHit(time,{freq:5000,gain:.16,d:.045})}
  function clap(time){
    [0,.014,.028].forEach((offset,i)=>noiseHit(time+offset,{freq:1500,gain:.2/(i+1),d:.055}));
  }
  function ensureAudio(){
    if(!audio){
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return false;
      audio=new Ctx();
    }
    if(audio.state==="suspended")audio.resume();
    return true;
  }
  function hitStep(step,time){
    if(pattern.kick.includes(step))kick(time);
    if(pattern.snare.includes(step))snare(time);
    if(pattern.hat.includes(step))hat(time);
    if(pattern.clap.includes(step))clap(time);
  }
  function showStep(step){currentStep=step;grid.querySelectorAll(".mp-step.playing").forEach(el=>el.classList.remove("playing"));grid.querySelectorAll('.mp-step[data-step="'+step+'"]').forEach(el=>el.classList.add("playing"))}
  function play(){
    if(playing)return;
    if(!ensureAudio()){setStatus(EN()?"Web Audio is not available in this browser.":"Web Audio não está disponível neste navegador.");return}
    playing=true;let step=0;setStatus(t.playing);
    const loop=()=>{
      if(!playing)return;
      showStep(step);
      const now=audio.currentTime+.005;hitStep(step,now);
      const beatMs=60000/clamp(Number(bpm.value)||128,40,220)/4;
      const sw=Number(swing.value)||0;
      const factor=step%2===1?1+(sw/100)*.55:1-(sw/100)*.55;
      const delay=Math.max(15,beatMs*factor);
      step=(step+1)%16;timer=setTimeout(loop,delay);
    };
    loop();
  }
  function stop(){
    playing=false;clearTimeout(timer);timer=null;currentStep=-1;
    grid.querySelectorAll(".mp-step.playing").forEach(el=>el.classList.remove("playing"));
    setStatus(t.ready);
  }
  function randomize(){
    const base=presets[style.value]||presets.basic;
    pattern=clone(base);
    for(const row of Object.keys(pattern)){
      if(row==="snare")continue;
      const additions=Array.from({length:16},(_,i)=>i).filter(i=>!pattern[row].includes(i)&&Math.random()<.13);
      pattern[row]=Array.from(new Set(pattern[row].concat(additions))).sort((a,b)=>a-b);
    }
    draw();
  }
  function applyStyle(){pattern=clone(presets[style.value]||presets.basic);draw()}
  function clear(){pattern={kick:[],snare:[],hat:[],clap:[]};draw()}
  function exportPattern(){
    const lines=Object.keys(labels).map(row=>labels[row].padEnd(7," ")+" | "+Array.from({length:16},(_,i)=>pattern[row].includes(i)?"●":"·").join(" "));
    return "BPM: "+bpm.value+" | "+t.swing+": "+swing.value+"%\n"+lines.join("\n");
  }
  bpm.oninput=()=>{bpm.value=clamp(Number(bpm.value)||128,40,220)};
  swing.oninput=()=>{swingValue.textContent=swing.value+"%"};
  style.onchange=applyStyle;
  document.getElementById("mp-drum-random").onclick=randomize;
  document.getElementById("mp-drum-clear").onclick=clear;
  document.getElementById("mp-drum-play").onclick=play;
  document.getElementById("mp-drum-stop").onclick=stop;
  copy.onclick=async()=>{const ok=await copyText(exportPattern());if(ok){copy.textContent=t.copied;setTimeout(()=>copy.textContent=t.copy,1000)}};
  draw();
  return ()=>{stop();if(audio){try{audio.close()}catch{}audio=null;noiseBuffer=null}};
}

let cleanupActive=()=>{};
function mount(){
  cleanupActive();
  frame();
  if(id==="calculadora-de-bpm")cleanupActive=bpmTool()||(()=>{});
  else if(id==="calculadora-de-pitch-time")cleanupActive=pitchTool()||(()=>{});
  else if(id==="finder-de-escala-e-tonalidade")cleanupActive=scaleTool()||(()=>{});
  else if(id==="gerador-de-progressao-de-acordes")cleanupActive=chordTool()||(()=>{});
  else if(id==="gerador-de-drum-pattern")cleanupActive=drumTool()||(()=>{});
}
mount();
window.addEventListener("nexauren:language-changed",mount);
})();