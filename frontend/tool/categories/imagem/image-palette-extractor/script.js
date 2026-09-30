const $=s=>document.querySelector(s);
const e={file:$("#file"),cameraFile:$("#cameraFile"),choose:$("#choose"),camera:$("#camera"),drop:$("#drop"),source:$("#source"),count:$("#count"),sampling:$("#sampling"),run:$("#run"),copyCss:$("#copyCss"),copyJson:$("#copyJson"),downloadCss:$("#downloadCss"),downloadJson:$("#downloadJson"),reset:$("#reset"),status:$("#status"),spinner:$("#spinner"),colors:$("#colors"),gradient:$("#gradient"),code:$("#code"),sourceStat:$("#sourceStat"),colorCountStat:$("#colorCountStat"),sampleStat:$("#sampleStat"),paletteSummary:$("#paletteSummary")};
let image=null,sourceUrl="",paletteData=[],cssText="",jsonText="";
const revoke=u=>{if(u)try{URL.revokeObjectURL(u)}catch{}};const status=(t,error=false)=>{e.status.textContent=t;e.status.className="status"+(error?" error":"")};
const hex=(r,g,b)=>"#"+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("").toUpperCase();
function rgb(r,g,b){return "rgb("+r+", "+g+", "+b+")"}
function hsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s=0,l=(max+min)/2;if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;default:h=((r-g)/d+4)/6}}return "hsl("+Math.round(h*360)+", "+Math.round(s*100)+"%, "+Math.round(l*100)+"%)"}
function contrastText(r,g,b){const lum=(.2126*r+.7152*g+.0722*b)/255;return lum>.58?"#07090f":"#ffffff"}
function setBusy(on){e.spinner.classList.toggle("on",on);e.spinner.setAttribute("aria-hidden",on?"false":"true");e.run.disabled=on||!image;e.run.textContent=on?"Extracting…":"Extract palette"}
function chooseBucket(bucketMap,key){const current=bucketMap.get(key)||{count:0,r:0,g:0,b:0};return current}
async function analyze(){
 if(!image){status("Choose an image first.",true);return}
 setBusy(true);status("Sampling image pixels…");
 try{
  const sw=Math.max(64,Math.min(320,Number(e.sampling.value)||160));
  const w=image.width||image.naturalWidth||0,h=image.height||image.naturalHeight||0;
  if(!w||!h)throw new Error("Could not read the image dimensions.");
  const scale=Math.min(1,sw/Math.max(w,h)),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
  const canvas=document.createElement("canvas");canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("The browser could not start color analysis.");
  ctx.drawImage(image,0,0,cw,ch);const pixels=ctx.getImageData(0,0,cw,ch).data;const bins=new Map();
  for(let i=0;i<pixels.length;i+=4){const a=pixels[i+3];if(a<80)continue;const r=pixels[i],g=pixels[i+1],b=pixels[i+2];const q=(v)=>Math.min(15,Math.floor(v/16));const key=q(r)+","+q(g)+","+q(b);let bucket=bins.get(key);if(!bucket){bucket={count:0,r:0,g:0,b:0};bins.set(key,bucket)}bucket.count++;bucket.r+=r;bucket.g+=g;bucket.b+=b}
  const requested=Number(e.count.value)||6;
  const ranked=[...bins.values()].sort((a,b)=>b.count-a.count);
  const chosen=[];const minDistance=42;
  for(const b of ranked){const r=Math.round(b.r/b.count),g=Math.round(b.g/b.count),bl=Math.round(b.b/b.count);let distinct=true;for(const x of chosen){const d=Math.hypot(r-x.r,g-x.g,bl-x.b);if(d<minDistance){distinct=false;break}}if(distinct)chosen.push({r,g,b:bl,count:b.count});if(chosen.length>=requested)break}
  if(chosen.length<Math.min(requested,ranked.length)){for(const b of ranked){if(chosen.length>=requested)break;const r=Math.round(b.r/b.count),g=Math.round(b.g/b.count),bl=Math.round(b.b/b.count);if(!chosen.some(x=>x.r===r&&x.g===g&&x.b===bl))chosen.push({r,g,b:bl,count:b.count})}}
  paletteData=chosen;render();status(paletteData.length+" colors extracted.");
 }catch(err){status(err?.message||"Could not extract the palette.",true)}
 finally{setBusy(false)}
}
function render(){
 e.colors.replaceChildren();if(!paletteData.length){e.gradient.style.background="linear-gradient(90deg,#111827,#0b1220)";e.code.hidden=true;return}
 const colors=paletteData.map(x=>hex(x.r,x.g,x.b));e.gradient.style.background="linear-gradient(90deg,"+colors.join(",")+")";
 e.paletteSummary.textContent=paletteData.length+" dominant colors · tap Copy HEX on any swatch.";
 e.sourceStat.textContent=image?((image.width||image.naturalWidth)+" × "+(image.height||image.naturalHeight)):"No image";
 e.colorCountStat.textContent=String(paletteData.length);
 e.sampleStat.textContent=e.sampling.value==="160"?"Fast":e.sampling.value==="240"?"Detailed":"Precise";
 cssText=":root{\n"+paletteData.map((x,i)=>"  --nx-color-"+(i+1)+": "+hex(x.r,x.g,x.b)+";").join("\n")+"\n}";
 jsonText=JSON.stringify(paletteData.map((x,i)=>({name:"color-"+(i+1),hex:hex(x.r,x.g,x.b),rgb:rgb(x.r,x.g,x.b),hsl:hsl(x.r,x.g,x.b)})),null,2);
 e.code.hidden=false;e.code.textContent=cssText;
 paletteData.forEach((x,i)=>{const h=hex(x.r,x.g,x.b),card=document.createElement("article");card.className="swatch";const col=document.createElement("div");col.className="swatch-color";col.style.background=h;const info=document.createElement("div");info.className="swatch-info";const code=document.createElement("code");code.textContent=h;const small=document.createElement("small");small.textContent=rgb(x.r,x.g,x.b)+" · "+hsl(x.r,x.g,x.b);const actions=document.createElement("div");actions.className="swatch-actions";const copy=document.createElement("button");copy.className="btn";copy.type="button";copy.textContent="Copy HEX";copy.style.background=contrastText(x.r,x.g,x.b);copy.style.color=h;copy.onclick=async()=>{const ok=await navigator.clipboard?.writeText(h).catch(()=>false);status(ok===false?"Could not copy HEX.":"Copied "+h+".")};const rgbBtn=document.createElement("button");rgbBtn.className="btn";rgbBtn.type="button";rgbBtn.textContent="Copy RGB";rgbBtn.onclick=async()=>{try{await navigator.clipboard.writeText(rgb(x.r,x.g,x.b));status("RGB copied.")}catch{status("Could not copy RGB.",true)}};actions.append(copy,rgbBtn);info.append(code,small,actions);card.append(col,info);e.colors.append(card)});
 e.copyCss.disabled=false;e.copyJson.disabled=false;e.downloadCss.disabled=false;e.downloadJson.disabled=false;
}
async function copyText(value,label){try{await navigator.clipboard.writeText(value);status(label+" copied.")}catch{status("Could not copy "+label+".",true)}}
function downloadText(value,name,type){const blob=new Blob([value],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>revoke(url),1200)}
function reset(){revoke(sourceUrl);sourceUrl="";image=null;paletteData=[];cssText="";jsonText="";e.file.value="";e.cameraFile.value="";e.source.removeAttribute("src");e.colors.replaceChildren();e.code.hidden=true;e.gradient.style.background="linear-gradient(90deg,#111827,#0b1220)";e.copyCss.disabled=e.copyJson.disabled=e.downloadCss.disabled=e.downloadJson.disabled=true;e.run.disabled=true;e.sourceStat.textContent="No image";e.paletteSummary.textContent="No palette yet.";status("Choose an image to start.")}
async function loadFile(file){try{if(!file||(!file.type.startsWith("image/")&&!/\.(jpe?g|png|webp|avif|gif|bmp|heic|heif|tiff?)$/i.test(file.name)))throw new Error("Please choose a supported image file.");revoke(sourceUrl);sourceUrl=URL.createObjectURL(file);image=await NexaurenImage.loadImage(file);e.source.src=sourceUrl;e.run.disabled=false;paletteData=[];e.copyCss.disabled=e.copyJson.disabled=e.downloadCss.disabled=e.downloadJson.disabled=true;render();status("Image ready. Extract the palette when you are ready.")}catch(err){image=null;status(err?.message||"Could not load this image.",true)}}
e.choose.onclick=()=>e.file.click();e.camera.onclick=()=>e.cameraFile.click();e.file.onchange=ev=>{void loadFile(ev.target.files[0]);ev.target.value=""};e.cameraFile.onchange=ev=>{void loadFile(ev.target.files[0]);ev.target.value=""};
["dragenter","dragover"].forEach(t=>e.drop.addEventListener(t,ev=>{ev.preventDefault();e.drop.style.borderColor="var(--cyan)"}));["dragleave","drop"].forEach(t=>e.drop.addEventListener(t,ev=>{ev.preventDefault();e.drop.style.borderColor="#42536f"}));e.drop.ondrop=ev=>loadFile(ev.dataTransfer.files[0]);e.drop.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();e.file.click()}};
e.count.onchange=()=>{e.colorCountStat.textContent=e.count.value};e.sampling.onchange=()=>{e.sampleStat.textContent=e.sampling.value==="160"?"Fast":e.sampling.value==="240"?"Detailed":"Precise"};e.run.onclick=analyze;e.copyCss.onclick=()=>copyText(cssText,"CSS");e.copyJson.onclick=()=>copyText(jsonText,"JSON");e.downloadCss.onclick=()=>downloadText(cssText,"nexauren-palette.css","text/css;charset=utf-8");e.downloadJson.onclick=()=>downloadText(jsonText,"nexauren-palette.json","application/json");e.reset.onclick=reset;document.addEventListener("keydown",ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();if(image)void analyze()}});