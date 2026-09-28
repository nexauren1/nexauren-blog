(()=>{
"use strict";

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const PREF_KEY="nexauren-audio-converter-prefs-v1";
const MAX_FILE_BYTES=180*1024*1024;
const MAX_WAVE_BYTES=40*1024*1024;
const FF_VERSION="0.12.15";
const CORE_VERSION="0.12.10";
const UTIL_VERSION="0.12.2";
const CORE_BASE="https://cdn.jsdelivr.net/npm/@ffmpeg/core@"+CORE_VERSION+"/dist/umd";
const TOOL_ID="conversor-de-audio";

const state={
  lang:"pt",file:null,inputUrl:"",sourceBuffer:null,resultBlob:null,resultUrl:"",
  format:"mp3",converting:false,cancelRequested:false,ffmpeg:null,
  formatDirty:false,waveProgress:0
};

const I18N={
  pt:{
    audioTools:"Ferramentas de áudio",title:"Audio Converter",lead:"Converta, ajuste e exporte áudio com controlo profissional — diretamente no navegador.",
    local:"Processamento local",formats:"WAV · MP3 · FLAC · OGG · M4A",noUpload:"Sem enviar o áudio para um servidor",
    source:"Source audio",dropTitle:"Solte o áudio aqui",dropCopy:"WAV, MP3, FLAC, OGG, M4A, AAC, OPUS e formatos suportados pelo navegador",browse:"Escolher ficheiro",
    replace:"Substituir",waveform:"WAVEFORM",sourceHint:"Escolha um ficheiro para ativar o estúdio de conversão.",
    preview:"Preview",previewReady:"O resultado aparecerá aqui.",previewReadyCopy:"Depois de converter, compare o ficheiro final, veja os detalhes e faça o download.",
    converted:"CONVERTED OUTPUT",outputWaveform:"OUTPUT WAVEFORM",download:"Download",settings:"Conversion settings",
    format:"FORMAT",quality:"Bitrate / quality",sampleRate:"Sample rate",channels:"Channels",speed:"Speed",
    range:"RANGE & TIMING",start:"Start",end:"End",normalize:"Normalize loudness",normalizeCopy:"Target a controlled listening level",
    reverse:"Reverse",reverseCopy:"Play the rendered audio backwards",gain:"Gain",fadeIn:"Fade in",fadeOut:"Fade out",
    metadata:"Metadata",titleMeta:"Title",artist:"Artist",album:"Album",year:"Year",
    engine:"Browser audio engine",engineCopy:"Decode, process and export on this device.",convert:"Convert audio",
    ready:"Ready",readyHint:"Escolha um áudio para começar.",cancel:"Cancel",loading:"Preparing audio engine…",
    loadingFile:"Analyzing audio…",readyFile:"Ready to convert",processing:"Converting audio…",cancelling:"Stopping conversion…",
    done:"Conversion complete",unsupported:"Este formato/codec não pôde ser processado neste navegador.",
    tooLarge:"O ficheiro excede o limite de 180 MB.",noFile:"Escolha um ficheiro de áudio primeiro.",
    failed:"Não foi possível concluir a conversão.",cancelled:"Conversão cancelada.",analyzeFailed:"O waveform não pôde ser analisado, mas a conversão continua disponível.",
    source:"Source audio",output:"Output",duration:"Duration",sampleRateStat:"Sample rate",channelsStat:"Channels",peak:"Peak",rms:"RMS",
    bitrate:"Bitrate",size:"Size",formatStat:"Format",privacy:"Tudo é processado localmente no dispositivo.",
    ffmpeg:"FFmpeg WebAssembly",browser:"Web Audio",drag:"Solte o ficheiro para carregar",fileInfo:"{size} · {type}"
  },
  en:{
    audioTools:"Audio tools",title:"Audio Converter",lead:"Convert, shape and export audio with professional control — directly in your browser.",
    local:"Local processing",formats:"WAV · MP3 · FLAC · OGG · M4A",noUpload:"Your audio is not uploaded to a server",
    source:"Source audio",dropTitle:"Drop audio here",dropCopy:"WAV, MP3, FLAC, OGG, M4A, AAC, OPUS and browser-supported formats",browse:"Choose file",
    replace:"Replace",waveform:"WAVEFORM",sourceHint:"Choose a file to activate the conversion studio.",
    preview:"Preview",previewReady:"Your result will appear here.",previewReadyCopy:"After conversion, compare the final file, inspect the details, and download it.",
    converted:"CONVERTED OUTPUT",outputWaveform:"OUTPUT WAVEFORM",download:"Download",settings:"Conversion settings",
    format:"FORMAT",quality:"Bitrate / quality",sampleRate:"Sample rate",channels:"Channels",speed:"Speed",
    range:"RANGE & TIMING",start:"Start",end:"End",normalize:"Normalize loudness",normalizeCopy:"Target a controlled listening level",
    reverse:"Reverse",reverseCopy:"Play the rendered audio backwards",gain:"Gain",fadeIn:"Fade in",fadeOut:"Fade out",
    metadata:"Metadata",titleMeta:"Title",artist:"Artist",album:"Album",year:"Year",
    engine:"Browser audio engine",engineCopy:"Decode, process and export on this device.",convert:"Convert audio",
    ready:"Ready",readyHint:"Choose an audio file to begin.",cancel:"Cancel",loading:"Preparing audio engine…",
    loadingFile:"Analyzing audio…",readyFile:"Ready to convert",processing:"Converting audio…",cancelling:"Stopping conversion…",
    done:"Conversion complete",unsupported:"This format/codec could not be processed by this browser.",
    tooLarge:"The file exceeds the 180 MB limit.",noFile:"Choose an audio file first.",
    failed:"The conversion could not be completed.",cancelled:"Conversion cancelled.",analyzeFailed:"The waveform could not be analyzed, but conversion is still available.",
    source:"Source audio",output:"Output",duration:"Duration",sampleRateStat:"Sample rate",channelsStat:"Channels",peak:"Peak",rms:"RMS",
    bitrate:"Bitrate",size:"Size",formatStat:"Format",privacy:"Everything is processed locally on this device.",
    ffmpeg:"FFmpeg WebAssembly",browser:"Web Audio",drag:"Drop the file to load",fileInfo:"{size} · {type}"
  }
};

const t=(key,data={})=>{
  let value=I18N[state.lang]?.[key]||I18N.pt[key]||key;
  Object.keys(data).forEach(k=>{value=value.replaceAll("{"+k+"}",String(data[k]))});
  return value;
};

function notify(message,error=false){
  const el=$("#toast");if(!el)return;
  el.textContent=message;el.className="ac-toast show"+(error?" error":"");
  clearTimeout(notify._timer);notify._timer=setTimeout(()=>{el.className="ac-toast"},2600);
}

function bytes(n){
  if(!Number.isFinite(n))return "—";
  const units=["B","KB","MB","GB"];let i=0,v=n;
  while(v>=1024&&i<units.length-1){v/=1024;i++}
  return (v>=100||i===0?v.toFixed(0):v.toFixed(1))+" "+units[i];
}

function fmtTime(s){
  s=Math.max(0,Number(s)||0);
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=Math.floor(s%60);
  return (h?h+":":"")+(h?String(m).padStart(2,"0"):String(m).padStart(2,"0"))+":"+String(sec).padStart(2,"0");
}

function safeName(name){
  return String(name||"audio").replace(/\.[^/.]+$/,"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"audio";
}

function extForMime(type){
  const m={
    "audio/wav":"wav","audio/wave":"wav","audio/x-wav":"wav","audio/mpeg":"mp3","audio/mp3":"mp3",
    "audio/flac":"flac","audio/x-flac":"flac","audio/ogg":"ogg","audio/opus":"opus",
    "audio/mp4":"m4a","audio/x-m4a":"m4a","audio/aac":"aac","audio/webm":"webm"
  };
  return m[type]||"bin";
}

function loadPrefs(){
  try{
    const saved=JSON.parse(localStorage.getItem(PREF_KEY)||"null");
    if(!saved)return;
    if(["mp3","wav","flac","ogg","m4a"].includes(saved.format))state.format=saved.format;
    ["bitrate","sampleRate","channels","speed"].forEach(id=>{if(saved[id]!=null)$(id).value=saved[id]});
    ["normalize","reverse"].forEach(id=>{if(typeof saved[id]==="boolean")$(id).checked=saved[id]});
    ["gain","fadeIn","fadeOut"].forEach(id=>{if(saved[id]!=null)$(id).value=saved[id]});
    if(saved.lang==="en"||saved.lang==="pt")state.lang=saved.lang;
  }catch{}
}

function savePrefs(){
  try{
    const obj={
      format:state.format,bitrate:$("#bitrate").value,sampleRate:$("#sample-rate").value,
      channels:$("#channels").value,speed:$("#speed").value,normalize:$("#normalize").checked,
      reverse:$("#reverse").checked,gain:$("#gain").value,fadeIn:$("#fade-in").value,fadeOut:$("#fade-out").value,lang:state.lang
    };
    localStorage.setItem(PREF_KEY,JSON.stringify(obj));
  }catch{}
}

function setLanguage(){
  document.documentElement.lang=state.lang;
  $$("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n)});
  $("#language-toggle").textContent=state.lang==="pt"?"EN":"PT";
  renderFormatButtons();
  renderStats();
  if(state.file)$("#status").textContent=t("readyFile");
}

function renderFormatButtons(){
  $$(".ac-format-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.format===state.format));
}

function updateEngineChip(text){
  $("#engine-chip").textContent=text;
}

function setProgress(percent,label,showCancel){
  $(".ac-progress").hidden=false;
  const p=Math.max(0,Math.min(100,Number(percent)||0));
  $("#progress-bar").style.width=p+"%";
  $("#progress-percent").textContent=Math.round(p)+"%";
  $("#progress-label").textContent=label||t("processing");
  $("#cancel-btn").hidden=!showCancel;
}

function resetProgress(){
  $(".ac-progress").hidden=true;
  $("#progress-bar").style.width="0%";
  $("#progress-percent").textContent="0%";
  $("#cancel-btn").hidden=true;
}

function fileType(file){
  return file?.type||(("."+extForMime(file?.type||"")).replace("..","."))||"audio";
}

function sourceStatsHtml(meta){
  const rows=[
    ["duration",t("duration"),fmtTime(meta.duration)],
    ["sampleRateStat",t("sampleRateStat"),meta.sampleRate?((meta.sampleRate/1000).toFixed(meta.sampleRate%1000?2:0)+" kHz"):"—"],
    ["channelsStat",t("channelsStat"),meta.channels?String(meta.channels):"—"],
    ["peak",t("peak"),meta.peakDb!=null?meta.peakDb.toFixed(1)+" dBFS":"—"],
    ["rms",t("rms"),meta.rmsDb!=null?meta.rmsDb.toFixed(1)+" dBFS":"—"],
    ["size",t("size"),bytes(meta.size)]
  ];
  return rows.map(row=>'<div class="ac-stat"><small>'+row[1]+'</small><strong>'+row[2]+'</strong></div>').join("");
}

function drawWave(canvas,data,colorA,colorB,position=0){
  if(!canvas)return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(300,Math.floor(rect.width*dpr)),h=Math.max(100,Math.floor((canvas.height||180)*dpr));
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,w,h);
  const grad=ctx.createLinearGradient(0,0,w,0);grad.addColorStop(0,colorA);grad.addColorStop(1,colorB);
  ctx.strokeStyle="rgba(255,255,255,.045)";ctx.lineWidth=1*dpr;
  for(let i=1;i<5;i++){const y=(h/5)*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  if(!data?.length){
    ctx.strokeStyle="rgba(114,230,255,.18)";ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();return;
  }
  const mid=h/2,amp=h*.42;
  ctx.strokeStyle=grad;ctx.lineWidth=Math.max(1,dpr*.9);ctx.beginPath();
  const step=Math.max(1,Math.floor(data.length/w));
  for(let x=0;x<w;x++){
    const start=x*step,end=Math.min(data.length,start+step);
    let min=1,max=-1;
    for(let i=start;i<end;i++){const v=data[i];if(v<min)min=v;if(v>max)max=v}
    if(start>=data.length){min=0;max=0}
    ctx.moveTo(x,mid+min*amp);ctx.lineTo(x,mid+max*amp);
  }
  ctx.stroke();
  const px=Math.max(0,Math.min(w,w*position));
  ctx.strokeStyle="rgba(255,255,255,.88)";ctx.lineWidth=dpr;
  ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke();
}

function bufferPeaks(buffer,count=1800){
  const channels=buffer.numberOfChannels;
  const length=buffer.length;
  const step=Math.max(1,Math.floor(length/count));
  const out=new Float32Array(Math.ceil(length/step));
  for(let i=0,o=0;i<length;i+=step,o++){
    let peak=0;
    for(let ch=0;ch<channels;ch++){
      const data=buffer.getChannelData(ch);
      const end=Math.min(length,i+step);
      for(let j=i;j<end;j++){const v=Math.abs(data[j]);if(v>peak)peak=v}
    }
    out[o]=peak;
  }
  return out;
}

function measureBuffer(buffer){
  let peak=0,sum=0,count=0;
  const channels=buffer.numberOfChannels;
  const sampleLimit=Math.min(buffer.length,buffer.sampleRate*120);
  for(let ch=0;ch<channels;ch++){
    const data=buffer.getChannelData(ch);
    const stride=Math.max(1,Math.floor(sampleLimit/500000));
    for(let i=0;i<sampleLimit;i+=stride){const v=data[i];const a=Math.abs(v);if(a>peak)peak=a;sum+=v*v;count++}
  }
  const rms=Math.sqrt(sum/Math.max(1,count));
  return {peakDb:20*Math.log10(Math.max(1e-9,peak)),rmsDb:20*Math.log10(Math.max(1e-9,rms))};
}

async function analyzeSource(file){
  state.sourceBuffer=null;
  if(file.size>MAX_WAVE_BYTES){
    $("#wave-status").textContent=state.lang==="pt"?"ficheiro grande — waveform simplificado":"large file — simplified waveform";
    drawWave($("#waveform"),new Float32Array([0]),"#72e6ff","#9b82ff");
    return null;
  }
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)throw new Error("AudioContext unavailable");
    const ctx=new Ctx();
    const buf=await ctx.decodeAudioData(await file.arrayBuffer());
    await ctx.close().catch(()=>{});
    state.sourceBuffer=buf;
    const peaks=bufferPeaks(buf);
    const measure=measureBuffer(buf);
    state.waveform=peaks;
    state.meta={duration:buf.duration,sampleRate:buf.sampleRate,channels:buf.numberOfChannels,size:file.size,...measure};
    drawWave($("#waveform"),peaks,"#72e6ff","#9b82ff");
    $("#wave-status").textContent=(buf.numberOfChannels===1?"MONO":"STEREO")+" · "+(buf.sampleRate/1000).toFixed(buf.sampleRate%1000?2:0)+" kHz";
    $("#source-stats").innerHTML=sourceStatsHtml(state.meta);
    return buf;
  }catch(error){
    console.warn("Audio analysis failed",error);
    $("#wave-status").textContent=t("analyzeFailed");
    drawWave($("#waveform"),new Float32Array([.08,.16,.24,.12,.2,.1,.14]),"#72e6ff","#9b82ff");
    return null;
  }
}

function renderResultStats(blob,duration){
  const rows=[
    ["formatStat",t("formatStat"),state.format.toUpperCase()],
    ["duration",t("duration"),fmtTime(duration)],
    ["size",t("size"),bytes(blob.size)],
    ["bitrate",t("bitrate"),["wav","flac"].includes(state.format)?"Lossless":$("#bitrate").value+" kbps"]
  ];
  $("#result-stats").innerHTML=rows.map(row=>'<div class="ac-stat"><small>'+row[1]+'</small><strong>'+row[2]+'</strong></div>').join("");
}

async function analyzeResult(blob){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    const ctx=new Ctx();
    const buf=await ctx.decodeAudioData(await blob.arrayBuffer());
    await ctx.close().catch(()=>{});
    state.resultBuffer=buf;
    state.resultWaveform=bufferPeaks(buf);
    drawWave($("#result-waveform"),state.resultWaveform,"#9b82ff","#72e6ff");
    $("#result-wave-status").textContent=(buf.sampleRate/1000).toFixed(buf.sampleRate%1000?2:0)+" kHz · "+(buf.numberOfChannels===1?"MONO":"STEREO");
    renderResultStats(blob,buf.duration);
    return buf;
  }catch(error){
    console.warn("Result analysis failed",error);
    drawWave($("#result-waveform"),new Float32Array([.1,.2,.12,.24,.18,.14]),"#9b82ff","#72e6ff");
    $("#result-wave-status").textContent=bytes(blob.size);
    renderResultStats(blob,Number($("#source-audio").duration)||0);
    return null;
  }
}

function parseTime(input){
  const raw=String(input||"").trim();
  if(!raw)return null;
  if(/^\d+(?:\.\d+)?$/.test(raw))return Number(raw);
  const parts=raw.split(":").map(Number);
  if(parts.some(n=>!Number.isFinite(n)))return null;
  if(parts.length===2)return parts[0]*60+parts[1];
  if(parts.length===3)return parts[0]*3600+parts[1]*60+parts[2];
  return null;
}

function selectedOutputExtension(){
  return state.format==="m4a"?"m4a":state.format;
}

function inputExtension(file){
  const fromName=(file.name.match(/\.([a-z0-9]{2,6})$/i)||[])[1];
  return fromName||extForMime(file.type)||"bin";
}

async function loadFFmpeg(){
  if(state.ffmpeg)return state.ffmpeg;
  updateEngineChip("LOAD");
  $("#status").textContent=t("loading");
  const {FFmpeg}=await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@"+FF_VERSION+"/+esm");
  const {toBlobURL}=await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@"+UTIL_VERSION+"/+esm");
  const ffmpeg=new FFmpeg();
  ffmpeg.on("progress",event=>{
    if(!state.converting)return;
    const p=Number.isFinite(event.progress)?Math.max(0,Math.min(1,event.progress)):0;
    setProgress(Math.round(p*92)+4,t("processing"),true);
  });
  ffmpeg.on("log",event=>{
    if(event?.message)state.lastLog=event.message;
  });
  const coreURL=await toBlobURL(CORE_BASE+"/ffmpeg-core.js","text/javascript");
  const wasmURL=await toBlobURL(CORE_BASE+"/ffmpeg-core.wasm","application/wasm");
  await ffmpeg.load({coreURL,wasmURL});
  state.ffmpeg=ffmpeg;
  updateEngineChip("FFMPEG");
  return ffmpeg;
}

function buildFilterChain(){
  const filters=[];
  const start=parseTime($("#trim-start").value);
  const end=parseTime($("#trim-end").value);
  if(start!=null&&start>0)filters.push("atrim=start="+start.toFixed(3));
  if(end!=null&&end>0)filters.push("atrim=end="+end.toFixed(3));
  filters.push("asetpts=PTS-STARTPTS");
  const speed=Number($("#speed").value)||1;
  if(Math.abs(speed-1)>0.001)filters.push("atempo="+speed.toFixed(2));
  if($("#reverse").checked)filters.push("areverse");
  const gain=Number($("#gain").value)||0;
  if(Math.abs(gain)>0.001)filters.push("volume="+gain.toFixed(2)+"dB");
  const duration=sourceEffectiveDuration();
  const fadeIn=Math.min(10,Math.max(0,Number($("#fade-in").value)||0));
  const fadeOut=Math.min(10,Math.max(0,Number($("#fade-out").value)||0));
  if(fadeIn>0)filters.push("afade=t=in:st=0:d="+Math.min(fadeIn,duration).toFixed(3));
  if(fadeOut>0){
    const st=Math.max(0,duration-Math.min(fadeOut,duration));
    filters.push("afade=t=out:st="+st.toFixed(3)+":d="+Math.min(fadeOut,duration).toFixed(3));
  }
  if($("#normalize").checked)filters.push("loudnorm=I=-16:LRA=11:TP=-1.5");
  return filters.join(",");
}

function sourceEffectiveDuration(){
  const original=Number($("#source-audio").duration);
  const start=parseTime($("#trim-start").value)||0;
  const end=parseTime($("#trim-end").value);
  const rawEnd=end!=null&&end>start?end:original;
  const trimmed=Math.max(.05,(rawEnd||original)-start);
  return trimmed/(Number($("#speed").value)||1);
}

function codecArgs(){
  const bitrate=Math.max(32,Number($("#bitrate").value)||192);
  const fmt=state.format;
  if(fmt==="wav")return ["-c:a","pcm_s16le"];
  if(fmt==="flac")return ["-c:a","flac"];
  if(fmt==="ogg")return ["-c:a","libvorbis","-b:a",bitrate+"k"];
  if(fmt==="m4a")return ["-c:a","aac","-b:a",bitrate+"k","-movflags","+faststart"];
  return ["-c:a","libmp3lame","-b:a",bitrate+"k","-id3v2_version","3","-write_xing","0"];
}

function metadataArgs(){
  const args=[];
  const values=[
    ["title",$("#meta-title").value.trim()],
    ["artist",$("#meta-artist").value.trim()],
    ["album",$("#meta-album").value.trim()],
    ["date",$("#meta-year").value.trim()]
  ];
  values.forEach(pair=>{if(pair[1])args.push("-metadata",pair[0]+"="+pair[1])});
  return args;
}

async function convertAudio(){
  if(!state.file){notify(t("noFile"),true);return}
  if(state.converting)return;

  const start=parseTime($("#trim-start").value);
  const end=parseTime($("#trim-end").value);
  const duration=Number($("#source-audio").duration)||state.meta?.duration||0;
  if(start!=null&&start<0){notify(t("failed"),true);return}
  if(end!=null&&end<=0){notify(t("failed"),true);return}
  if(end!=null&&start!=null&&end<=start){notify(t("failed"),true);return}
  if(duration&&start!=null&&start>=duration){notify(t("failed"),true);return}
  if(duration&&end!=null&&end>duration)$("#trim-end").value=fmtTime(duration);

  state.converting=true;state.cancelRequested=false;state.resultBlob=null;
  $("#convert-btn").disabled=true;$("#status").textContent=t("loading");
  setProgress(2,t("loading"),true);updateEngineChip("LOAD");

  let inputName="",outputName="";
  try{
    const ffmpeg=await loadFFmpeg();
    if(state.cancelRequested)throw new Error("CANCELLED");

    const ext=inputExtension(state.file).replace(/[^a-z0-9]/gi,"")||"bin";
    inputName="input."+ext;
    outputName="output."+selectedOutputExtension();
    await ffmpeg.writeFile(inputName,new Uint8Array(await state.file.arrayBuffer()));
    setProgress(5,t("processing"),true);updateEngineChip("RUN");

    const args=["-y","-i",inputName];
    const filters=buildFilterChain();
    if(filters)args.push("-af",filters);
    const sampleRate=$("#sample-rate").value;
    if(sampleRate!=="auto")args.push("-ar",sampleRate);
    const channels=$("#channels").value;
    if(channels!=="auto")args.push("-ac",channels);
    args.push(...metadataArgs(),...codecArgs(),"-vn",outputName);

    await ffmpeg.exec(args);
    if(state.cancelRequested)throw new Error("CANCELLED");

    setProgress(96,t("processing"),false);
    const data=await ffmpeg.readFile(outputName);
    state.resultBlob=new Blob([data.buffer],{type:outputMime()});
    if(state.resultUrl)URL.revokeObjectURL(state.resultUrl);
    state.resultUrl=URL.createObjectURL(state.resultBlob);
    $("#result-audio").src=state.resultUrl;
    const originalName=safeName(state.file.name);
    const outName=originalName+"."+selectedOutputExtension();
    $("#result-name").textContent=outName;
    $("#result-meta").textContent=state.format.toUpperCase()+" · "+bytes(state.resultBlob.size);
    $("#download-result").dataset.name=outName;
    $("#preview-empty").hidden=true;$("#result-panel").hidden=false;
    const resultBuf=await analyzeResult(state.resultBlob);
    renderResultStats(state.resultBlob,resultBuf?.duration||sourceEffectiveDuration());
    setProgress(100,t("done"),false);
    updateEngineChip("READY");$("#status").textContent=t("done");notify(t("done"));
    trackUse();
  }catch(error){
    if(String(error?.message||error)==="CANCELLED"||state.cancelRequested){
      resetProgress();$("#status").textContent=t("cancelled");notify(t("cancelled"));
    }else{
      console.error("Audio Converter error",error);
      resetProgress();$("#status").textContent=t("failed");notify(t("failed"),true);
    }
    updateEngineChip("READY");
  }finally{
    try{
      if(state.ffmpeg&&inputName)await state.ffmpeg.deleteFile(inputName).catch(()=>{});
      if(state.ffmpeg&&outputName)await state.ffmpeg.deleteFile(outputName).catch(()=>{});
    }catch{}
    state.converting=false;state.cancelRequested=false;$("#convert-btn").disabled=!state.file;
  }
}

function outputMime(){
  return ({mp3:"audio/mpeg",wav:"audio/wav",flac:"audio/flac",ogg:"audio/ogg",m4a:"audio/mp4"})[state.format]||"application/octet-stream";
}

function downloadBlob(blob,name){
  if(!blob)return;
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function trackUse(){
  fetch("/api/tools/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tool_id:TOOL_ID})}).catch(()=>{});
}

async function loadFile(file){
  if(!file)return;
  if(file.size>MAX_FILE_BYTES){notify(t("tooLarge"),true);return}
  if(!file.type.startsWith("audio/")&&!/\.(wav|mp3|flac|ogg|m4a|aac|opus|webm)$/i.test(file.name)){notify(t("unsupported"),true);return}

  if(state.inputUrl)URL.revokeObjectURL(state.inputUrl);
  state.file=file;state.inputUrl=URL.createObjectURL(file);state.resultBlob=null;
  if(state.resultUrl){URL.revokeObjectURL(state.resultUrl);state.resultUrl=""}
  $("#source-audio").src=state.inputUrl;$("#source-panel").hidden=false;$("#source-empty").hidden=true;
  $("#file-name").textContent=file.name;$("#file-meta").textContent=t("fileInfo",{size:bytes(file.size),type:file.type||"audio"});
  $("#convert-btn").disabled=false;$("#status").textContent=t("loadingFile");updateEngineChip("ANALYZE");
  if(!$("#meta-title").value)$("#meta-title").value=safeName(file.name).replace(/-/g," ");
  try{await analyzeSource(file)}finally{$("#status").textContent=t("readyFile");updateEngineChip("READY")}
  savePrefs();
}

function clearSource(){
  if(state.inputUrl)URL.revokeObjectURL(state.inputUrl);
  if(state.resultUrl)URL.revokeObjectURL(state.resultUrl);
  state.inputUrl="";state.resultUrl="";state.file=null;state.sourceBuffer=null;state.resultBlob=null;
  $("#source-audio").removeAttribute("src");$("#source-audio").load();$("#result-audio").removeAttribute("src");$("#result-audio").load();
  $("#source-panel").hidden=true;$("#source-empty").hidden=false;$("#preview-empty").hidden=false;$("#result-panel").hidden=true;$("#convert-btn").disabled=true;
  $("#source-stats").innerHTML="";resetProgress();$("#status").textContent=t("readyHint");updateEngineChip("READY");
}

function drawResultPreviewPosition(){
  const audio=$("#result-audio");
  const duration=Number(audio.duration)||0;
  const pos=duration?audio.currentTime/duration:0;
  drawWave($("#result-waveform"),state.resultWaveform||new Float32Array([.1,.2,.1]),"#9b82ff","#72e6ff",pos);
}

function drawSourcePreviewPosition(){
  const audio=$("#source-audio");const duration=Number(audio.duration)||0;const pos=duration?audio.currentTime/duration:0;
  drawWave($("#waveform"),state.waveform||new Float32Array([.1]),"#72e6ff","#9b82ff",pos);
  $("#current-time").textContent=fmtTime(audio.currentTime);$("#duration-time").textContent=fmtTime(duration);
}

$$(".ac-format-btn").forEach(btn=>btn.addEventListener("click",()=>{
  state.format=btn.dataset.format;renderFormatButtons();savePrefs();
}));
["bitrate","sample-rate","channels","speed","normalize","reverse","gain","fade-in","fade-out"].forEach(id=>{
  $( "#"+id ).addEventListener("change",savePrefs);
  $( "#"+id ).addEventListener("input",savePrefs);
});
$("#gain").addEventListener("input",()=>$("#gain-value").textContent=Number($("#gain").value).toFixed(1)+" dB");
$("#fade-in").addEventListener("input",()=>$("#fade-in-value").textContent=Number($("#fade-in").value).toFixed(1)+" s");
$("#fade-out").addEventListener("input",()=>$("#fade-out-value").textContent=Number($("#fade-out").value).toFixed(1)+" s");

$("#file-input").addEventListener("change",e=>loadFile(e.target.files?.[0]));
$("#replace-file").addEventListener("click",()=>$("#file-input").click());
$("#remove-file").addEventListener("click",clearSource);
$("#drop-zone").addEventListener("dragover",e=>{e.preventDefault();$("#drop-zone").classList.add("drag")});
$("#drop-zone").addEventListener("dragleave",()=>$("#drop-zone").classList.remove("drag"));
$("#drop-zone").addEventListener("drop",e=>{e.preventDefault();$("#drop-zone").classList.remove("drag");loadFile(e.dataTransfer.files?.[0])});
$("#convert-btn").addEventListener("click",convertAudio);
$("#cancel-btn").addEventListener("click",()=>{
  if(!state.converting)return;
  state.cancelRequested=true;$("#cancel-btn").hidden=true;$("#status").textContent=t("cancelling");
  try{state.ffmpeg?.terminate()}catch{}
  state.ffmpeg=null;
});
$("#download-result").addEventListener("click",()=>downloadBlob(state.resultBlob,$("#download-result").dataset.name||("converted."+state.format)));
$("#source-audio").addEventListener("timeupdate",drawSourcePreviewPosition);
$("#result-audio").addEventListener("timeupdate",drawResultPreviewPosition);
window.addEventListener("resize",()=>{if(state.waveform)drawSourcePreviewPosition();if(state.resultWaveform)drawResultPreviewPosition()});
$("#language-toggle").addEventListener("click",()=>{state.lang=state.lang==="pt"?"en":"pt";savePrefs();setLanguage();});

loadPrefs();
$("#gain-value").textContent=Number($("#gain").value).toFixed(1)+" dB";
$("#fade-in-value").textContent=Number($("#fade-in").value).toFixed(1)+" s";
$("#fade-out-value").textContent=Number($("#fade-out").value).toFixed(1)+" s";
setLanguage();
drawWave($("#waveform"),new Float32Array([0]),"#72e6ff","#9b82ff");
drawWave($("#result-waveform"),new Float32Array([0]),"#9b82ff","#72e6ff");
})();
