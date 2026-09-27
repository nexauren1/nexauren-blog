(() => {
"use strict";

const ZIPJS_URL="https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.18.2/+esm";
const TOOL_URL="https://nexaurenstory.com/tool/categories/audio/gerador-de-sample-pack/";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={
  lang:"en",mode:null,source:null,sourceBuffer:null,generated:[],organized:[],zipBlob:null,
  orgFiles:[],orgZipBlob:null,toastTimer:null,zipLib:null,selectedEffects:[],effectPreset:"diverse",modalOpen:null
};

const I18N={
  en:{
    backAudio:"Audio tools",title:"Sample Pack Studio",lead:"Create a sample pack from one source sound, or organize a messy folder of samples into a clean pack.",
    createModeTitle:"Create a Pack",createModeCopy:"Upload one sample, choose the type and quantity, generate variations, then download a structured ZIP.",
    organizeModeTitle:"Organize a Pack",organizeModeCopy:"Upload many samples, review their categories, and let Nexauren build the folder structure for you.",
    choose:"Choose →",backChoose:"Back to mode selection",createKicker:"CREATE PACK",createTitle:"Turn one sample into a pack.",
    sourceTitle:"Source sample",sourceHint:"One audio file",dropOne:"Drop one sample here",dropFormats:"WAV, MP3, M4A, OGG, FLAC and other browser-supported audio",browse:"Browse file",
    packInfoTitle:"Pack information",zipTitle:"ZIP package",packName:"Pack name",author:"Author",genre:"Genre / style",bpm:"BPM",key:"Key",
    sampleSettings:"Sample settings",generatedLocally:"Processed in your browser",sampleType:"Sample type",customType:"Custom type",quantity:"Number of samples",
    variation:"Variation amount",includeOriginal:"Include the original sample",randomize:"Randomize small differences between variations",
    securityTitle:"ZIP & security",optional:"Optional",protectZip:"Protect ZIP with a password",zipPassword:"ZIP password",includeCover:"Include pack cover (SVG)",
    ready:"Ready when you are.",createStatusHint:"The source audio stays on this device while the pack is generated.",generatePack:"Generate Pack",
    previewKicker:"PREVIEW",generatedSamples:"Generated samples",downloadZip:"Download ZIP",organizeKicker:"ORGANIZE PACK",
    organizeTitle:"Turn loose files into a clean pack.",uploadMany:"Upload samples",multiHint:"Multiple audio files",dropMany:"Drop your samples here",
    dropManyHint:"Kick, snare, clap, guitar, pad, FX, vocals and more",browseFiles:"Browse files",organizeInfo:"Pack information",metadata:"Metadata included",
    normalizeNames:"Rename files consistently",organizeSecurity:"ZIP & security",reviewFiles:"Review categories",autoDetected:"Auto-detected from filenames",
    organizeStatusHint:"You can adjust every category before creating the ZIP.",organizeButton:"Organize & Download ZIP",doneKicker:"DONE",packReady:"Your pack is ready.",
    kick:"Kick",snare:"Snare",clap:"Clap",hihat:"Hi-Hat",percussion:"Percussion",bass:"Bass",guitar:"Guitar",pad:"Pad",melody:"Melody",vocal:"Vocal",fx:"FX",custom:"Custom",
    chooseFile:"Choose a source audio file first.",chooseMany:"Add at least one audio file first.",generateError:"The audio could not be processed in this browser.",
    wrongPassword:"Use a password with at least 4 characters.",zipError:"The ZIP could not be created.",doneCreate:"Pack created with {n} samples.",doneOrg:"Organized pack created with {n} files.",
    categoryOther:"Other",fileCount:"{n} files",sourceLoaded:"Source loaded · {name}",readyFiles:"{n} files ready",creating:"Creating samples…",zipping:"Building ZIP…",
    generatedSummary:"{n} samples · {type} · {duration}s source · browser-local processing.",orgSummary:"{n} files organized into {cats} folders.",coverTitle:"Nexauren Sample Pack",
    coverMade:"Made with Nexauren Sample Pack Studio",readmeTitle:"Pack information",readmeBack:"Open Nexauren Sample Pack Studio",
    noAudio:"Please choose audio files only."
  },
  pt:{
    backAudio:"Ferramentas de áudio",title:"Gerador de Sample Pack",lead:"Crie um sample pack a partir de um som ou organize vários ficheiros numa estrutura limpa e pronta para ZIP.",
    createModeTitle:"Criar um Pack",createModeCopy:"Envie um sample, escolha o tipo e a quantidade, gere variações e baixe um ZIP organizado.",
    organizeModeTitle:"Organizar um Pack",organizeModeCopy:"Envie vários samples, reveja as categorias e deixe o Nexauren criar a estrutura de pastas.",
    choose:"Escolher →",backChoose:"Voltar à escolha de modo",createKicker:"CRIAR PACK",createTitle:"Transforme um sample num pack.",
    sourceTitle:"Sample de origem",sourceHint:"Um ficheiro de áudio",dropOne:"Arraste um sample para aqui",dropFormats:"WAV, MP3, M4A, OGG, FLAC e outros formatos suportados pelo navegador",browse:"Escolher ficheiro",
    packInfoTitle:"Informações do pack",zipTitle:"Pacote ZIP",packName:"Nome do pack",author:"Autor",genre:"Género / estilo",bpm:"BPM",key:"Tonalidade",
    sampleSettings:"Definições do sample",generatedLocally:"Processado no navegador",sampleType:"Tipo de sample",customType:"Tipo personalizado",quantity:"Número de samples",
    variation:"Quantidade de variação",includeOriginal:"Incluir o sample original",randomize:"Adicionar pequenas diferenças aleatórias",
    securityTitle:"ZIP e segurança",optional:"Opcional",protectZip:"Proteger o ZIP com uma senha",zipPassword:"Senha do ZIP",includeCover:"Incluir capa do pack (SVG)",
    ready:"Pronto quando estiver.",createStatusHint:"O áudio de origem permanece neste dispositivo enquanto o pack é gerado.",generatePack:"Gerar Pack",
    previewKicker:"PRÉ-VISUALIZAÇÃO",generatedSamples:"Samples gerados",downloadZip:"Baixar ZIP",organizeKicker:"ORGANIZAR PACK",
    organizeTitle:"Transforme ficheiros soltos num pack organizado.",uploadMany:"Enviar samples",multiHint:"Vários ficheiros de áudio",dropMany:"Arraste os seus samples para aqui",
    dropManyHint:"Kick, snare, clap, guitarra, pad, FX, voz e muito mais",browseFiles:"Escolher ficheiros",organizeInfo:"Informações do pack",metadata:"Metadados incluídos",
    normalizeNames:"Renomear ficheiros de forma consistente",organizeSecurity:"ZIP e segurança",reviewFiles:"Rever categorias",autoDetected:"Detetado automaticamente pelo nome",
    organizeStatusHint:"Pode alterar cada categoria antes de criar o ZIP.",organizeButton:"Organizar e baixar ZIP",doneKicker:"CONCLUÍDO",packReady:"O seu pack está pronto.",
    kick:"Kick",snare:"Snare",clap:"Clap",hihat:"Hi-Hat",percussion:"Percussão",bass:"Bass",guitar:"Guitarra",pad:"Pad",melody:"Melodia",vocal:"Voz",fx:"FX",custom:"Personalizado",
    chooseFile:"Escolha primeiro um ficheiro de áudio.",chooseMany:"Adicione pelo menos um ficheiro de áudio.",generateError:"Não foi possível processar o áudio neste navegador.",
    wrongPassword:"Use uma senha com pelo menos 4 caracteres.",zipError:"Não foi possível criar o ZIP.",doneCreate:"Pack criado com {n} samples.",doneOrg:"Pack organizado criado com {n} ficheiros.",
    categoryOther:"Outros",fileCount:"{n} ficheiros",sourceLoaded:"Origem carregada · {name}",readyFiles:"{n} ficheiros prontos",creating:"A gerar samples…",zipping:"A criar ZIP…",
    generatedSummary:"{n} samples · {type} · origem com {duration}s · processamento local.",orgSummary:"{n} ficheiros organizados em {cats} pastas.",coverTitle:"Nexauren Sample Pack",
    coverMade:"Criado com o Nexauren Sample Pack Studio",readmeTitle:"Informações do pack",readmeBack:"Abrir o Nexauren Sample Pack Studio",
    noAudio:"Escolha apenas ficheiros de áudio."
  }
};
const types=["kick","snare","clap","hi-hat","percussion","bass","guitar","pad","melody","vocal","fx","other","custom"];Object.assign(I18N.en,{
  effectsTitle:"Effects",optionsTitle:"Generation options",effectsSelected:"{n} effects selected · up to {max} per sample",optionsSummary:"{n} samples · {intensity}% intensity · {length}",
  effectsApply:"Apply effects",cancel:"Cancel",presets:"Professional presets",presetDiverse:"Diverse Lab",presetDrum:"Drum Impact",presetMotion:"Motion Lab",presetSpace:"Space & Echo",presetLofi:"Lo-Fi Lab",presetTight:"Short & Tight",presetLong:"Long & Wide",
  effectGroupsMovement:"Movement & Shape",effectGroupsSpace:"Space & Stereo",effectGroupsTiming:"Timing & Repetition",effectGroupsTone:"Tone & Texture",effectGroupsDynamics:"Dynamics & Length",
  effectOriginal:"Original",effectReverse:"Reverse",effectPitchUp:"Pitch Up",effectPitchDown:"Pitch Down",effectRise:"Rise · Low → High",effectFall:"Fall · High → Low",effectRiseFall:"Rise & Fall",effectFallRise:"Fall & Rise",effectPingPong:"Ping-Pong",effectOrbit:"Orbit · 360° stereo",effectBounce:"Bounce · forward ↔ reverse",effectStutter:"Stutter · micro repeats",effectChop:"Chop · rhythmic cuts",effectEcho:"Echo",effectDelay:"Delay",effectReverb:"Reverb",effectTremolo:"Tremolo",effectLowpass:"Low-Pass Sweep",effectHighpass:"High-Pass Sweep",effectDistortion:"Distortion",effectLofi:"Lo-Fi / Bitcrush",effectFadeIn:"Fade In",effectFadeOut:"Fade Out",effectShort:"Short",effectLong:"Long",
  quantity:"Number of samples",variation:"Variation intensity",maxEffects:"Maximum effects per variation",lengthMode:"Length",lengthPreserve:"Preserve",lengthMixed:"Mixed",lengthShort:"Shorter",lengthLong:"Longer",
  sampleType:"Sample type",customType:"Custom type",includeOriginal:"Include the original sample",randomize:"Randomize variation parameters",effectNaming:"Put effect names in filenames",outputNormalize:"Normalize output level",saved:"Saved",effectsHelp:"Select the effects you want available to the generator. Each variation uses a different combination.",optionsHelp:"Fine-tune the generation without cluttering the main workspace.",chooseEffects:"Choose effects"
});
Object.assign(I18N.pt,{
  effectsTitle:"Efeitos",optionsTitle:"Opções de geração",effectsSelected:"{n} efeitos selecionados · até {max} por sample",optionsSummary:"{n} samples · {intensity}% intensidade · {length}",
  effectsApply:"Aplicar efeitos",cancel:"Cancelar",presets:"Presets profissionais",presetDiverse:"Laboratório Diverso",presetDrum:"Impacto de Drum",presetMotion:"Laboratório de Movimento",presetSpace:"Espaço & Echo",presetLofi:"Laboratório Lo-Fi",presetTight:"Curto & Tight",presetLong:"Longo & Aberto",
  effectGroupsMovement:"Movimento & Forma",effectGroupsSpace:"Espaço & Stereo",effectGroupsTiming:"Tempo & Repetição",effectGroupsTone:"Timbre & Textura",effectGroupsDynamics:"Dinâmica & Duração",
  effectOriginal:"Original",effectReverse:"Reverse",effectPitchUp:"Pitch Up",effectPitchDown:"Pitch Down",effectRise:"Subida · Baixo → Alto",effectFall:"Descida · Alto → Baixo",effectRiseFall:"Subida & Descida",effectFallRise:"Descida & Subida",effectPingPong:"Ping-Pong",effectOrbit:"Orbit · stereo 360°",effectBounce:"Bounce · frente ↔ reverse",effectStutter:"Stutter · micro repetições",effectChop:"Chop · cortes rítmicos",effectEcho:"Echo",effectDelay:"Delay",effectReverb:"Reverb",effectTremolo:"Tremolo",effectLowpass:"Low-Pass Sweep",effectHighpass:"High-Pass Sweep",effectDistortion:"Distortion",effectLofi:"Lo-Fi / Bitcrush",effectFadeIn:"Fade In",effectFadeOut:"Fade Out",effectShort:"Curto",effectLong:"Longo",
  quantity:"Número de samples",variation:"Intensidade da variação",maxEffects:"Máximo de efeitos por variação",lengthMode:"Duração",lengthPreserve:"Manter",lengthMixed:"Mista",lengthShort:"Mais curta",lengthLong:"Mais longa",
  sampleType:"Tipo de sample",customType:"Tipo personalizado",includeOriginal:"Incluir o sample original",randomize:"Variar os parâmetros aleatoriamente",effectNaming:"Colocar os efeitos no nome dos ficheiros",outputNormalize:"Normalizar o nível de saída",saved:"Guardado",effectsHelp:"Escolha os efeitos disponíveis para o gerador. Cada variação usa uma combinação diferente.",optionsHelp:"Ajuste a geração sem encher a área principal.",chooseEffects:"Escolher efeitos"
});
const EFFECT_CATALOG=[
  {id:"rise",group:"movement",icon:"↗",key:"effectRise",descEn:"Controlled low-to-high pitch movement.",descPt:"Movimento controlado de baixo para alto."},
  {id:"fall",group:"movement",icon:"↘",key:"effectFall",descEn:"Controlled high-to-low pitch movement.",descPt:"Movimento controlado de alto para baixo."},
  {id:"rise-fall",group:"movement",icon:"⌁",key:"effectRiseFall",descEn:"Rises then falls in one continuous sweep.",descPt:"Sobe e depois desce numa única varredura."},
  {id:"fall-rise",group:"movement",icon:"⌁",key:"effectFallRise",descEn:"Falls then rises in one continuous sweep.",descPt:"Desce e depois sobe numa única varredura."},
  {id:"pitch-up",group:"movement",icon:"↑",key:"effectPitchUp",descEn:"Transposes the sample upward.",descPt:"Transpõe o sample para cima."},
  {id:"pitch-down",group:"movement",icon:"↓",key:"effectPitchDown",descEn:"Transposes the sample downward.",descPt:"Transpõe o sample para baixo."},
  {id:"reverse",group:"movement",icon:"↶",key:"effectReverse",descEn:"Plays the sample backwards.",descPt:"Reproduz o sample ao contrário."},
  {id:"ping-pong",group:"movement",icon:"↔",key:"effectPingPong",descEn:"Moves left to right and back again.",descPt:"Move da esquerda para a direita e volta."},
  {id:"orbit",group:"space",icon:"◌",key:"effectOrbit",descEn:"Continuous stereo orbit movement.",descPt:"Movimento stereo contínuo em órbita."},
  {id:"bounce",group:"movement",icon:"↕",key:"effectBounce",descEn:"Forward and reverse bounce.",descPt:"Bounce para frente e para trás."},
  {id:"stutter",group:"timing",icon:"⫶",key:"effectStutter",descEn:"Rapid repeated micro-slices.",descPt:"Micro cortes repetidos rapidamente."},
  {id:"chop",group:"timing",icon:"▥",key:"effectChop",descEn:"Rhythmic gated cuts across the sample.",descPt:"Cortes rítmicos em diferentes partes."},
  {id:"echo",group:"space",icon:"◍",key:"effectEcho",descEn:"Longer repeating echoes.",descPt:"Ecos repetidos e longos."},
  {id:"delay",group:"space",icon:"◒",key:"effectDelay",descEn:"Shorter cleaner repeats.",descPt:"Repetições mais curtas e limpas."},
  {id:"reverb",group:"space",icon:"✺",key:"effectReverb",descEn:"Synthetic room and hall tail.",descPt:"Cauda de sala e hall sintetizada."},
  {id:"tremolo",group:"space",icon:"≋",key:"effectTremolo",descEn:"Pulsing amplitude movement.",descPt:"Movimento pulsante de amplitude."},
  {id:"lowpass",group:"tone",icon:"⌄",key:"effectLowpass",descEn:"Sweeping low-pass filter.",descPt:"Filtro low-pass em varredura."},
  {id:"highpass",group:"tone",icon:"⌃",key:"effectHighpass",descEn:"Sweeping high-pass filter.",descPt:"Filtro high-pass em varredura."},
  {id:"distortion",group:"tone",icon:"∿",key:"effectDistortion",descEn:"Harmonic drive and saturation.",descPt:"Drive harmónico e saturação."},
  {id:"lofi",group:"tone",icon:"▦",key:"effectLofi",descEn:"Bitcrush-style degradation.",descPt:"Degradação digital estilo bitcrush."},
  {id:"fade-in",group:"dynamics",icon:"◢",key:"effectFadeIn",descEn:"Builds from silence.",descPt:"Entra gradualmente a partir do silêncio."},
  {id:"fade-out",group:"dynamics",icon:"◣",key:"effectFadeOut",descEn:"Drops gradually into silence.",descPt:"Desaparece gradualmente até ao silêncio."},
  {id:"short",group:"dynamics",icon:"−",key:"effectShort",descEn:"Tight shorter cut.",descPt:"Corte curto e apertado."},
  {id:"long",group:"dynamics",icon:"＋",key:"effectLong",descEn:"Longer slower transformation.",descPt:"Transformação mais longa e lenta."}
];
const EFFECT_GROUPS=[{id:"movement",key:"effectGroupsMovement"},{id:"space",key:"effectGroupsSpace"},{id:"timing",key:"effectGroupsTiming"},{id:"tone",key:"effectGroupsTone"},{id:"dynamics",key:"effectGroupsDynamics"}];
const EFFECT_PRESETS={
  diverse:["rise","fall","rise-fall","fall-rise","reverse","ping-pong","orbit","bounce","stutter","chop","echo","reverb","pitch-up","pitch-down"],
  drum:["pitch-down","stutter","chop","short","distortion","lowpass","bounce","fade-out"],
  motion:["rise","fall","rise-fall","fall-rise","ping-pong","orbit","bounce","tremolo","pitch-up","pitch-down"],
  space:["echo","delay","reverb","orbit","ping-pong","tremolo","rise","fall"],
  lofi:["lofi","distortion","lowpass","short","reverse","stutter","echo"],
  tight:["short","chop","stutter","pitch-down","fade-in","fade-out"],
  long:["long","echo","delay","reverb","rise","fall","orbit","tremolo"]
};
const DEFAULT_EFFECTS=EFFECT_PRESETS.diverse.slice();
state.selectedEffects=DEFAULT_EFFECTS.slice();
state.generation={quantity:8,variation:55,includeOriginal:true,randomize:true,maxEffects:2,lengthMode:"mixed",effectNaming:true,normalize:true};

function t(key,vars={}){
  let value=I18N[state.lang][key]??I18N.en[key]??key;
  for(const [k,v] of Object.entries(vars))value=value.replaceAll("{"+k+"}",String(v));
  return value;
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
function bytes(n){if(!Number.isFinite(n))return "—";const u=["B","KB","MB","GB"];let i=0,x=n;while(x>=1024&&i<u.length-1){x/=1024;i++}return x.toFixed(x>=100?0:x>=10?1:2)+" "+u[i]}
function slug(v){return String(v||"pack").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)||"pack"}
function safeFileName(v){return String(v||"sample").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim().slice(0,90)||"sample"}
function notify(message,error=false){const el=$("#toast");el.textContent=message;el.className="sp-toast show"+(error?" error":"");clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.className="sp-toast",3200)}
function setMode(mode){state.mode=mode;$("#mode-picker").hidden=!!mode;$("#create-mode").hidden=mode!=="create";$("#organize-mode").hidden=mode!=="organize";if(mode)window.scrollTo({top:0,behavior:"smooth"})}
function setLanguage(){
  document.documentElement.lang=state.lang;
  $("#language-toggle").textContent=state.lang==="en"?"PT":"EN";
  $$("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  $$("[data-i18n-opt]").forEach(el=>el.textContent=t(el.dataset.i18nOpt));
  $("#quantity-value").textContent=$("#quantity").value;
  $("#variation-value").textContent=$("#variation").value+"%";
  if(state.source)renderCreateSource();
  if(state.orgFiles.length)renderOrganizerList();
}
function fileKey(file){return [file.name,file.size,file.lastModified].join("::")}
function categoryFromName(name){
  const n=name.toLowerCase();
  const checks=[
    ["kick",["kick","bassdrum","bd"]],["snare",["snare","snr"]],["clap",["clap","snap"]],["hi-hat",["hi-hat","hihat","hat","hh_","_hh"]],
    ["percussion",["perc","percussion","tom","shaker","rim","cowbell","bongo"]],["bass",["bass","sub"]],["guitar",["guitar","gtr"]],["pad",["pad","texture","drone"]],
    ["vocal",["vocal","voice","vox","chant"]],["fx",["fx","sfx","impact","riser","whoosh","sweep"]],["melody",["melody","lead","arp","piano","keys","pluck"]]
  ];
  for(const [type,words] of checks)if(words.some(w=>n.includes(w)))return type;
  return "other";
}
function typeLabel(type){return t(type==="other"?"categoryOther":type)}
function getCustomType(){return safeFileName($("#custom-type")?.value||"Custom")}
function createTypeFolder(){const type=$("#sample-type").value;return type==="custom"?getCustomType():typeLabel(type)}
function formatSeconds(value){return Number(value||0).toFixed(2)}
function copyBuffer(buffer){
  const out=new AudioBuffer({length:buffer.length,numberOfChannels:buffer.numberOfChannels,sampleRate:buffer.sampleRate});
  for(let c=0;c<buffer.numberOfChannels;c++)out.copyToChannel(buffer.getChannelData(c),c);
  return out;
}
function reverseBuffer(buffer){
  const out=copyBuffer(buffer);
  for(let c=0;c<out.numberOfChannels;c++)out.getChannelData(c).reverse();
  return out;
}
function sliceBuffer(buffer,startRatio,endRatio){
  const start=Math.floor(buffer.length*Math.max(0,Math.min(1,startRatio)));
  const end=Math.max(start+1,Math.floor(buffer.length*Math.max(0,Math.min(1,endRatio))));
  const out=new AudioBuffer({length:end-start,numberOfChannels:buffer.numberOfChannels,sampleRate:buffer.sampleRate});
  for(let c=0;c<buffer.numberOfChannels;c++)out.copyToChannel(buffer.getChannelData(c).slice(start,end),c);
  return out;
}
function normalizeBuffer(buffer){
  let peak=0;
  for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]))}
  if(peak<.0001)return buffer;
  const gain=Math.min(1.4,.96/peak),out=copyBuffer(buffer);
  for(let c=0;c<out.numberOfChannels;c++){const data=out.getChannelData(c);for(let i=0;i<data.length;i++)data[i]*=gain}
  return out;
}

function concatBuffers(parts){
  const valid=parts.filter(Boolean);
  if(!valid.length)return null;
  const channels=Math.max(...valid.map(function(b){return b.numberOfChannels;}));
  const rate=valid[0].sampleRate;
  const length=valid.reduce(function(total,b){return total+b.length;},0);
  const out=new AudioBuffer({length,numberOfChannels:channels,sampleRate:rate});
  let offset=0;
  valid.forEach(function(b){
    for(let c=0;c<channels;c++)out.getChannelData(c).set(b.getChannelData(Math.min(c,b.numberOfChannels-1)),offset);
    offset+=b.length;
  });
  return out;
}
function repeatSlice(buffer,start,end,count){
  const slice=sliceBuffer(buffer,start,end);
  const parts=[];
  for(let i=0;i<count;i++)parts.push(i%2?reverseBuffer(slice):slice);
  return concatBuffers(parts);
}
function bounceBuffer(buffer){
  const a=sliceBuffer(buffer,0,.62);
  const b=sliceBuffer(buffer,.18,1);
  const parts=[];
  for(let i=0;i<4;i++)parts.push(i%2?reverseBuffer(b):a);
  return sliceBuffer(concatBuffers(parts),0,.78);
}
function chopBuffer(buffer){
  const a=sliceBuffer(buffer,0,.2);
  const b=sliceBuffer(buffer,.42,.58);
  const c=sliceBuffer(buffer,.78,1);
  return concatBuffers([a,b,reverseBuffer(a),c,b]);
}
function bitcrushBuffer(buffer,bits,hold){
  const out=copyBuffer(buffer);
  const levels=Math.pow(2,bits-1);
  for(let c=0;c<out.numberOfChannels;c++){
    const data=out.getChannelData(c);
    let held=0;
    for(let i=0;i<data.length;i++){
      if(i%hold===0)held=Math.round(data[i]*levels)/levels;
      data[i]=held;
    }
  }
  return out;
}
function distortionCurve(amount){
  const curve=new Float32Array(8192);
  const drive=1+amount/16;
  for(let i=0;i<curve.length;i++){
    const x=i*2/curve.length-1;
    curve[i]=(3+drive)*x*20*Math.PI/180/(Math.PI+drive*Math.abs(x));
  }
  return curve;
}
function makeImpulse(context,duration,decay){
  const length=Math.floor(context.sampleRate*duration);
  const buffer=context.createBuffer(2,length,context.sampleRate);
  for(let c=0;c<2;c++){
    const data=buffer.getChannelData(c);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,decay);
  }
  return buffer;
}
async function offlineEffect(buffer,effect,amount,randomize){
  const source=buffer;
  const sampleRate=source.sampleRate;
  const intensity=Math.max(0,Math.min(100,amount));
  let outputDuration=source.duration;
  if(effect==="pitch-up")outputDuration/=1.18;
  if(effect==="pitch-down")outputDuration/=.84;
  if(effect==="long")outputDuration/=.72;
  if(effect==="echo")outputDuration+=source.duration*.8;
  if(effect==="delay")outputDuration+=source.duration*.5;
  if(effect==="reverb")outputDuration+=1.2;
  const context=new OfflineAudioContext(Math.max(1,Math.min(2,source.numberOfChannels)),Math.max(1,Math.ceil(sampleRate*outputDuration)),sampleRate);
  const sourceNode=context.createBufferSource();
  sourceNode.buffer=source;
  const jitter=randomize?(Math.random()-.5)*(intensity/100)*.08:0;
  let node=sourceNode;

  if(effect==="pitch-up")sourceNode.playbackRate.value=1.18+jitter;
  if(effect==="pitch-down")sourceNode.playbackRate.value=.84+jitter;
  if(effect==="long")sourceNode.playbackRate.value=.72+jitter;

  if(effect==="rise"||effect==="fall"||effect==="rise-fall"||effect==="fall-rise"){
    let first=.66,last=1.34;
    if(effect==="fall"||effect==="fall-rise"){first=1.34;last=.66;}
    sourceNode.playbackRate.setValueAtTime(first,0);
    if(effect==="rise-fall"||effect==="fall-rise"){
      sourceNode.playbackRate.linearRampToValueAtTime(last,source.duration*.5);
      sourceNode.playbackRate.linearRampToValueAtTime(first,source.duration);
    }else{
      sourceNode.playbackRate.linearRampToValueAtTime(last,source.duration);
    }
  }

  if(effect==="lowpass"||effect==="highpass"){
    const filter=context.createBiquadFilter();
    filter.type=effect==="lowpass"?"lowpass":"highpass";
    if(effect==="lowpass"){
      filter.frequency.setValueAtTime(9000,0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(700,7000-intensity*55),source.duration*.72);
    }else{
      filter.frequency.setValueAtTime(80,0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(900,900+intensity*55),source.duration*.72);
    }
    filter.Q.value=.7+intensity/120;
    node.connect(filter);node=filter;
  }

  if(effect==="distortion"){
    const shaper=context.createWaveShaper();
    shaper.curve=distortionCurve(20+intensity);
    shaper.oversample="4x";
    node.connect(shaper);node=shaper;
  }

  if(effect==="echo"||effect==="delay"){
    const delay=context.createDelay(2);
    const feedback=context.createGain();
    const wet=context.createGain();
    const dry=context.createGain();
    delay.delayTime.value=effect==="echo"?.32:.16;
    feedback.gain.value=effect==="echo"?.48:.30;
    wet.gain.value=.45+(intensity/100)*.22;
    dry.gain.value=.82;
    node.connect(dry);node.connect(delay);delay.connect(wet);delay.connect(feedback);feedback.connect(delay);
    dry.connect(context.destination);wet.connect(context.destination);
    sourceNode.start();
    return normalizeBuffer(await context.startRendering());
  }

  if(effect==="reverb"){
    const convolver=context.createConvolver();
    const wet=context.createGain();
    const dry=context.createGain();
    convolver.buffer=makeImpulse(context,.7+(intensity/100)*1.2,2.6-(intensity/100)*.8);
    wet.gain.value=.35+(intensity/100)*.3;
    dry.gain.value=.78;
    node.connect(dry);node.connect(convolver);convolver.connect(wet);
    dry.connect(context.destination);wet.connect(context.destination);
    sourceNode.start();
    return normalizeBuffer(await context.startRendering());
  }

  if(effect==="tremolo"){
    const gain=context.createGain();
    const oscillator=context.createOscillator();
    const depth=context.createGain();
    gain.gain.value=1;
    oscillator.frequency.value=4+(intensity/100)*7;
    depth.gain.value=.22+(intensity/100)*.42;
    oscillator.connect(depth);depth.connect(gain.gain);node.connect(gain);gain.connect(context.destination);
    oscillator.start();sourceNode.start();
    return normalizeBuffer(await context.startRendering());
  }

  if(effect==="orbit"||effect==="ping-pong"){
    const panner=context.createStereoPanner();
    const cycles=effect==="orbit"?3:1.6;
    panner.pan.setValueAtTime(-1,0);
    for(let i=1;i<=32;i++)panner.pan.linearRampToValueAtTime(Math.sin(i/32*Math.PI*2*cycles),source.duration*i/32);
    node.connect(panner);panner.connect(context.destination);sourceNode.start();
    return normalizeBuffer(await context.startRendering());
  }

  if(effect==="fade-in"||effect==="fade-out"){
    const gain=context.createGain();
    if(effect==="fade-in"){
      gain.gain.setValueAtTime(0,0);
      gain.gain.linearRampToValueAtTime(1,Math.min(.8,source.duration*.35));
    }else{
      gain.gain.setValueAtTime(1,source.duration*.55);
      gain.gain.linearRampToValueAtTime(0,source.duration);
    }
    node.connect(gain);gain.connect(context.destination);sourceNode.start();
    return normalizeBuffer(await context.startRendering());
  }

  node.connect(context.destination);
  sourceNode.start();
  return normalizeBuffer(await context.startRendering());
}
async function renderEffectOnce(buffer,effect,amount,randomize){
  if(effect==="original")return copyBuffer(buffer);
  if(effect==="reverse")return reverseBuffer(buffer);
  if(effect==="bounce")return bounceBuffer(buffer);
  if(effect==="stutter")return repeatSlice(buffer,.12,.3,4);
  if(effect==="chop")return chopBuffer(buffer);
  if(effect==="lofi")return bitcrushBuffer(await offlineEffect(buffer,"lowpass",amount,randomize),5,5);
  if(effect==="short")return sliceBuffer(buffer,.05,.68);
  return offlineEffect(buffer,effect,amount,randomize);
}
async function renderEffectPipeline(buffer,effects,amount,randomize){
  let out=copyBuffer(buffer);
  for(const effect of effects)out=await renderEffectOnce(out,effect,amount,randomize);
  return normalizeBuffer(out);
}
function effectLabel(effect){
  const item=EFFECT_CATALOG.find(function(entry){return entry.id===effect;});
  return item?I18N[state.lang][item.key]:effect;
}
function shuffle(array){
  const out=array.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const temp=out[i];out[i]=out[j];out[j]=temp;}
  return out;
}
function lengthModifier(){
  const mode=state.generation.lengthMode||"mixed";
  if(mode==="short")return "short";
  if(mode==="long")return "long";
  if(mode==="mixed"&&Math.random()<.42)return Math.random()<.5?"short":"long";
  return null;
}
function makeVariationPlan(quantity,includeOriginal){
  const plan=[];
  if(includeOriginal)plan.push({effects:["original"]});
  const pool=shuffle(state.selectedEffects.length?state.selectedEffects:DEFAULT_EFFECTS);
  const wanted=Math.max(1,Math.min(3,Number(state.generation.maxEffects)||2));
  let cursor=0;
  for(let i=plan.length;i<quantity;i++){
    const count=Math.min(wanted,1+(state.generation.randomize&&Math.random()<.72?Math.floor(Math.random()*wanted):0));
    const chosen=[];
    while(chosen.length<count){
      const effect=pool[cursor%pool.length];
      cursor++;
      if(!chosen.includes(effect))chosen.push(effect);
    }
    const modifier=lengthModifier();
    if(modifier&&!chosen.includes(modifier)&&chosen.length<wanted)chosen.push(modifier);
    plan.push({effects:chosen.length?chosen:["reverse"]});
  }
  return plan;
}
async function decodeAudio(file){
  const ctx=new AudioContext();try{return await ctx.decodeAudioData(await file.arrayBuffer())}finally{await ctx.close().catch(()=>{})}
}
function renderCreateSource(){
  const el=$("#create-source");if(!state.source){el.hidden=true;return}
  el.hidden=false;el.innerHTML='<div class="sp-file-name">'+esc(state.source.name)+'</div><div class="sp-file-meta">'+bytes(state.source.size)+' · '+esc(state.source.type||"audio")+' · '+formatSeconds(state.sourceBuffer?.duration||0)+'s</div>';
}
function setGenerateState(){
  $("#generate-pack").disabled=!state.sourceBuffer||state.sourceBuffer.length<1;
}
async function loadCreateFile(file){
  if(!file||!file.type.startsWith("audio/")){notify(t("noAudio"),true);return}
  try{state.source=file;state.sourceBuffer=await decodeAudio(file);renderCreateSource();setGenerateState();$("#create-status").textContent=t("sourceLoaded",{name:file.name})}catch{state.source=null;state.sourceBuffer=null;notify(t("generateError"),true);setGenerateState()}
}
function setCustomField(){const show=$("#sample-type").value==="custom";$("#custom-type-field").hidden=!show}
function makeVariationPlan(quantity,includeOriginal){
  const plan=[];if(includeOriginal)plan.push("original");
  for(let i=plan.length;i<quantity;i++)plan.push(EFFECTS[i%EFFECTS.length]);
  return plan;
}
async function generateSamples(){
  if(!state.sourceBuffer){notify(t("chooseFile"),true);return}
  const quantity=Number($("#quantity").value)||8,amount=Number($("#variation").value)||55,includeOriginal=$("#include-original").checked,randomize=$("#randomize").checked,type=createTypeFolder();
  if(quantity>1&&!includeOriginal&&quantity<2)return;
  $("#generate-pack").disabled=true;$("#create-status").textContent=t("creating");state.generated.forEach(x=>x.url&&URL.revokeObjectURL(x.url));state.generated=[];
  const plan=makeVariationPlan(quantity,includeOriginal);
  try{
    for(let i=0;i<plan.length;i++){
      const effect=plan[i];
      const buffer=effect==="original"?normalizeBuffer(state.sourceBuffer):await renderEffect(state.sourceBuffer,effect,amount,randomize);
      const blob=audioToWav(buffer),num=String(i+1).padStart(3,"0");
      const filename=safeFileName(type).toLowerCase().replace(/\s+/g,"-")+"_"+num+".wav";
      state.generated.push({name:filename,blob,url:URL.createObjectURL(blob),effect,duration:buffer.duration,size:blob.size,type});
    }
    renderGenerated();
    $("#create-results").hidden=false;$("#create-status").textContent=t("doneCreate",{n:state.generated.length});
  }catch(e){console.error(e);notify(t("generateError"),true)}finally{setGenerateState()}
}
function renderGenerated(){
  $("#generated-list").innerHTML=state.generated.map(item=>'<div class="sp-audio-row"><div><div class="sp-audio-name">'+esc(item.name)+'</div><div class="sp-audio-meta">'+esc(effectLabel(item.effect))+' · '+formatSeconds(item.duration)+'s · '+bytes(item.size)+'</div></div><audio controls preload="none" src="'+esc(item.url)+'"></audio></div>').join("");
  $("#created-summary").textContent=t("generatedSummary",{n:state.generated.length,type:state.generated[0]?.type||"Sample",duration:formatSeconds(state.sourceBuffer?.duration||0)});
  $("#download-created").disabled=!state.generated.length;
}
function makeCoverSvg(info){
  const title=esc(info.packName),subtitle=esc(info.mode==="create"?info.typeName:"Organized sample pack");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#75e0ff"/><stop offset="1" stop-color="#9b7cff"/></linearGradient></defs><rect width="1600" height="900" fill="#090b0f"/><circle cx="1280" cy="170" r="330" fill="url(#g)" opacity=".12"/><circle cx="220" cy="740" r="300" fill="#75e0ff" opacity=".06"/><text x="120" y="150" fill="#75e0ff" font-family="Arial,sans-serif" font-weight="700" font-size="28" letter-spacing="7">NEXAUREN · AUDIO</text><text x="120" y="420" fill="#ffffff" font-family="Arial,sans-serif" font-weight="800" font-size="92">'+title+'</text><text x="120" y="505" fill="#aeb7c4" font-family="Arial,sans-serif" font-size="34">'+subtitle+'</text><text x="120" y="810" fill="#7f8a9a" font-family="Arial,sans-serif" font-size="24">Sample Pack Studio · Nexauren</text></svg>';
}
function makeReadme(info,items){
  const rows=items.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.folder)+'</td><td>'+esc(x.kind)+'</td><td>'+esc(bytes(x.size))+'</td></tr>').join("");
  return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(t("readmeTitle"))+'</title><style>body{font-family:Arial,sans-serif;background:#0b0e13;color:#eef2f7;max-width:900px;margin:40px auto;padding:20px;line-height:1.6}a{color:#75e0ff}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:9px;border-bottom:1px solid #27303a;text-align:left}small{color:#9da7b5}</style></head><body><h1>'+esc(info.packName)+'</h1><p>'+esc(info.description||"")+'</p><h2>'+esc(t("readmeTitle"))+'</h2><p><strong>Author:</strong> '+esc(info.author||"—")+'<br><strong>Genre:</strong> '+esc(info.style||"—")+'<br><strong>BPM:</strong> '+esc(info.bpm||"—")+'<br><strong>Key:</strong> '+esc(info.key||"—")+'<br><strong>Samples:</strong> '+items.length+'<br><strong>Created:</strong> '+esc(info.createdAt)+'</p><p><a href="'+TOOL_URL+'">'+esc(t("readmeBack"))+' ↗</a></p><table><thead><tr><th>File</th><th>Folder</th><th>Type</th><th>Size</th></tr></thead><tbody>'+rows+'</tbody></table><p><small>'+esc(t("coverMade"))+'</small></p></body></html>';
}
async function zipPack(info,items,password,includeCover=true){
  if(!state.zipLib)state.zipLib=await import(ZIPJS_URL);
  const {ZipWriter,BlobWriter,BlobReader,TextReader}=state.zipLib;
  const writer=new ZipWriter(new BlobWriter("application/zip"),password?{password,encryptionStrength:3,level:6}:{level:6});
  await writer.add("README.html",new TextReader(makeReadme(info,items)));
  await writer.add("README.txt",new TextReader(makeReadmeText(info,items)));
  await writer.add("pack-info.json",new TextReader(JSON.stringify(info,null,2)));
  if(includeCover)await writer.add("cover.svg",new TextReader(makeCoverSvg(info)));
  for(const item of items)await writer.add(item.folder+"/"+item.name,new BlobReader(item.blob));
  return await writer.close();
}
function packInfoBase(name,author,style,bpm,key,mode){
  return {packName:name,author,style,bpm,key,mode,createdAt:new Date().toISOString(),tool:"Nexauren Sample Pack Studio",toolUrl:TOOL_URL,language:state.lang};
}
function trackUse(){fetch("/api/tools/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tool_id:"gerador-de-sample-pack"})}).catch(()=>{})}
function makeReadmeText(info,items){return [info.packName,"","Created with Nexauren Sample Pack Studio","",`Author: ${info.author||"—"}`,`Genre: ${info.style||"—"}`,`BPM: ${info.bpm||"—"}`,`Key: ${info.key||"—"}`,`Files: ${items.length}`,`Created: ${info.createdAt}`,"",`Nexauren: ${TOOL_URL}`,"",...items.map(x=>`${x.folder}/${x.name} · ${x.kind} · ${bytes(x.size)}`)].join("\n")}
function getCreateItems(){
  const type=createTypeFolder();
  return state.generated.map(item=>({name:item.name,folder:safeFileName(type).replace(/\s+/g,"-").toUpperCase(),kind:item.effect,size:item.blob.size,blob:item.blob}));
}
async function createZip(){
  if(!state.generated.length){notify(t("chooseFile"),true);return}
  const passwordEnabled=$("#protect-zip").checked,password=$("#zip-password").value;
  if(passwordEnabled&&password.length<4){notify(t("wrongPassword"),true);return}
  $("#download-created").disabled=true;$("#create-status").textContent=t("zipping");
  try{
    const info=packInfoBase($("#pack-name").value.trim()||"Nexauren Sample Pack",$("#pack-author").value.trim(),$("#pack-style").value.trim(),$("#pack-bpm").value.trim(),$("#pack-key").value.trim(),"create");
    info.typeName=createTypeFolder();info.sampleCount=state.generated.length;info.outputFormat="WAV";info.sampleRate=state.sourceBuffer.sampleRate;info.channels=state.sourceBuffer.numberOfChannels;info.sourceFile=state.source.name;info.sourceDuration=state.sourceBuffer.duration;
    info.description="Generated locally from one source sample.";
    const items=getCreateItems();state.zipBlob=await zipPack(info,items,passwordEnabled?password:"",$("#include-cover").checked);
    $("#download-created").disabled=false;trackUse();downloadBlob(state.zipBlob,slug(info.packName)+".zip");notify(t("doneCreate",{n:items.length}));
    $("#created-summary").textContent=t("generatedSummary",{n:items.length,type:info.typeName,duration:formatSeconds(info.sourceDuration)});
  }catch(e){console.error(e);notify(t("zipError"),true)}finally{$("#download-created").disabled=!state.zipBlob;$("#create-status").textContent=t("doneCreate",{n:state.generated.length})}
}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function renderOrganizerList(){
  const card=$("#organize-table-card");card.hidden=!state.orgFiles.length;
  $("#org-status").textContent=state.orgFiles.length?t("readyFiles",{n:state.orgFiles.length}):t("ready");
  $("#organize-pack").disabled=!state.orgFiles.length;
  $("#organize-list").innerHTML=state.orgFiles.map((item,i)=>'<div class="sp-org-row"><div><div class="sp-org-name" title="'+esc(item.file.name)+'">'+esc(item.file.name)+'</div><div class="sp-org-size">'+bytes(item.file.size)+'</div></div><select data-org-index="'+i+'">'+types.map(type=>'<option value="'+type+'" '+(item.category===type?"selected":"")+'>'+esc(typeLabel(type))+'</option>').join("")+'</select><span class="sp-org-num">#'+String(i+1).padStart(3,"0")+'</span></div>').join("");
  $$("#organize-list [data-org-index]").forEach(select=>select.addEventListener("change",e=>{state.orgFiles[Number(e.target.dataset.orgIndex)].category=e.target.value}));
}
function loadOrganizer(files){
  const audio=[...files].filter(f=>f.type.startsWith("audio/"));
  if(!audio.length){notify(t("noAudio"),true);return}
  state.orgFiles=audio.map(file=>({file,category:categoryFromName(file.name)}));
  if(audio.length<files.length)notify(t("noAudio"),true);
  renderOrganizerList();
}
function orgInfo(){return packInfoBase($("#org-pack-name").value.trim()||"Nexauren Organized Pack",$("#org-author").value.trim(),$("#org-style").value.trim(),"","", "organize")}
async function organizeZip(){
  if(!state.orgFiles.length){notify(t("chooseMany"),true);return}
  const passwordEnabled=$("#org-protect-zip").checked,password=$("#org-password").value;
  if(passwordEnabled&&password.length<4){notify(t("wrongPassword"),true);return}
  $("#organize-pack").disabled=true;$("#org-status").textContent=t("zipping");
  try{
    const info=orgInfo(),normalize=$("#org-normalize-names").checked,counts=new Map();
    const items=state.orgFiles.map(item=>{
      const folder=safeFileName(item.category==="other"?t("categoryOther"):item.category==="custom"?getCustomType():typeLabel(item.category)).replace(/\s+/g,"-").toUpperCase();
      const ext=(item.file.name.match(/\.([a-z0-9]{2,6})$/i)||[])[1]||"bin";
      const next=(counts.get(folder)||0)+1;counts.set(folder,next);
      const base=normalize?folder.toLowerCase()+"_"+String(next).padStart(3,"0"):safeFileName(item.file.name).replace(/\.[^/.]+$/,"");
      return {name:base+"."+ext,folder,kind:item.category,size:item.file.size,blob:item.file};
    });
    info.fileCount=items.length;info.folders=Object.fromEntries([...counts.entries()]);info.description="Organized locally from uploaded audio files.";
    state.orgZipBlob=await zipPack(info,items,passwordEnabled?password:"",false);
    $("#org-results").hidden=false;$("#download-organized").disabled=false;trackUse();
    $("#org-summary").textContent=t("orgSummary",{n:items.length,cats:counts.size});
    downloadBlob(state.orgZipBlob,slug(info.packName)+".zip");notify(t("doneOrg",{n:items.length}));
  }catch(e){console.error(e);notify(t("zipError"),true)}finally{$("#organize-pack").disabled=!state.orgFiles.length;$("#org-status").textContent=t("doneOrg",{n:state.orgFiles.length})}
}

$("#language-toggle").addEventListener("click",()=>{state.lang=state.lang==="en"?"pt":"en";setLanguage()});
$$("[data-mode]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
$$("[data-back-picker]").forEach(btn=>btn.addEventListener("click",()=>setMode(null)));
$("#sample-type").addEventListener("change",setCustomField);
$("#quantity").addEventListener("input",e=>$("#quantity-value").textContent=e.target.value);
$("#variation").addEventListener("input",e=>$("#variation-value").textContent=e.target.value+"%");
$("#protect-zip").addEventListener("change",()=>$("#password-field").hidden=!$("#protect-zip").checked);
$("#org-protect-zip").addEventListener("change",()=>$("#org-password-field").hidden=!$("#org-protect-zip").checked);
$("#create-file").addEventListener("change",e=>loadCreateFile(e.target.files?.[0]));
$("#create-drop").addEventListener("dragover",e=>{e.preventDefault()});
$("#create-drop").addEventListener("drop",e=>{e.preventDefault();loadCreateFile(e.dataTransfer.files?.[0])});
$("#organize-files").addEventListener("change",e=>loadOrganizer(e.target.files));
$("#organize-drop").addEventListener("dragover",e=>e.preventDefault());
$("#organize-drop").addEventListener("drop",e=>{e.preventDefault();loadOrganizer(e.dataTransfer.files)});
$("#generate-pack").addEventListener("click",generateSamples);
$("#download-created").addEventListener("click",createZip);
$("#organize-pack").addEventListener("click",organizeZip);
$("#download-organized").addEventListener("click",()=>{if(state.orgZipBlob)downloadBlob(state.orgZipBlob,slug($("#org-pack-name").value)+".zip")});
$("#year").textContent=new Date().getFullYear();
setLanguage();
setCustomField();
})();