const $=s=>document.querySelector(s);
const e={file:$("#file"),cameraFile:$("#cameraFile"),choose:$("#choose"),camera:$("#camera"),hero:$("#heroPreview"),generate:$("#generate"),copyHtml:$("#copyHtml"),copyManifest:$("#copyManifest"),downloadAll:$("#downloadAll"),reset:$("#reset"),status:$("#status"),spinner:$("#spinner"),icons:$("#icons"),code:$("#code"),appName:$("#appName"),shortName:$("#shortName"),prefix:$("#prefix"),theme:$("#theme"),pwaBg:$("#pwaBg"),fit:$("#fit"),padding:$("#padding"),paddingOut:$("#paddingOut"),bgMode:$("#bgMode"),bg:$("#bg"),radius:$("#radius"),radiusOut:$("#radiusOut"),shadow:$("#shadow")};
const SIZES=[16,32,48,64,96,180,192,512];let image=null,sourceUrl="",assets=new Map(),icoBlob=null,htmlText="",manifestText="";
const revoke=u=>{if(u)try{URL.revokeObjectURL(u)}catch{}};const clean=v=>(v||"").trim().replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"")||"site-icon";const txt=v=>(v||"").trim();
function status(t,error=false){e.status.textContent=t;e.status.className="status"+(error?" error":"")}
function busy(on){e.spinner.classList.toggle("on",on);e.spinner.setAttribute("aria-hidden",on?"false":"true");e.generate.disabled=on||!image;e.generate.textContent=on?"Generating…":"Generate icon kit"}
function drawIcon(size){
 const c=document.createElement("canvas");c.width=size;c.height=size;const ctx=c.getContext("2d");if(!ctx)throw Error("The browser could not start icon rendering.");ctx.clearRect(0,0,size,size);
 if(e.bgMode.value==="solid"){ctx.fillStyle=e.bg.value;ctx.fillRect(0,0,size,size)}
 const radius=size*Number(e.radius.value)/100;if(radius){ctx.save();ctx.beginPath();ctx.roundRect(0,0,size,size,radius);ctx.clip()}
 const pad=size*Number(e.padding.value)/100,iw=image.width||image.naturalWidth,ih=image.height||image.naturalHeight,inner=Math.max(1,size-pad*2),scale=e.fit.value==="cover"?Math.max(inner/iw,inner/ih):Math.min(inner/iw,inner/ih),dw=iw*scale,dh=ih*scale;
 if(e.shadow.checked){ctx.save();ctx.shadowColor="rgba(0,0,0,.44)";ctx.shadowBlur=Math.max(1,size*.08);ctx.shadowOffsetY=Math.max(1,size*.035)}
 ctx.drawImage(image,(size-dw)/2,(size-dh)/2,dw,dh);if(e.shadow.checked)ctx.restore();if(radius)ctx.restore();return c
}
function updatePreview(){e.paddingOut.textContent=e.padding.value+"%";e.radiusOut.textContent=e.radius.value+"%";if(!image)return;try{const c=drawIcon(220);e.hero.src=c.toDataURL("image/png");e.hero.hidden=false}catch(err){status(err.message,true)}}
function pngBlob(canvas){return new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error("Could not encode icon.")),"image/png"))}
async function makeIco(png){
 const bytes=new Uint8Array(await png.arrayBuffer()),header=new ArrayBuffer(22),v=new DataView(header);v.setUint16(0,0,true);v.setUint16(2,1,true);v.setUint16(4,1,true);v.setUint8(6,0);v.setUint8(7,0);v.setUint8(8,0);v.setUint8(9,0);v.setUint16(10,1,true);v.setUint16(12,32,true);v.setUint32(14,bytes.byteLength,true);v.setUint32(18,22,true);return new Blob([header,bytes],{type:"image/x-icon"})
}
function buildHtml(base){
 return '<link rel="icon" href="/'+base+'.ico" sizes="any">\\n'+[16,32,48].map(n=>'<link rel="icon" type="image/png" sizes="'+n+'x'+n+'" href="/'+base+'-'+n+'.png">').join("\\n")+'\\n<link rel="apple-touch-icon" sizes="180x180" href="/'+base+'-180.png">\\n<link rel="icon" type="image/png" sizes="192x192" href="/'+base+'-192.png">\\n<link rel="icon" type="image/png" sizes="512x512" href="/'+base+'-512.png">\\n<link rel="manifest" href="/manifest.webmanifest">\\n<meta name="theme-color" content="'+e.theme.value+'">'
}
async function generate(){
 if(!image){status("Choose an image first.",true);return}busy(true);status("Rendering icon assets locally…");e.icons.replaceChildren();assets.clear();icoBlob=null;
 try{
  const base=clean(e.prefix.value),name=txt(e.appName.value)||"Nexauren Story",short=txt(e.shortName.value)||name;
  for(const size of SIZES){const blob=await pngBlob(drawIcon(size)),card=document.createElement("article");assets.set(size,{blob,name:base+"-"+size+".png"});card.className="icon";const pv=document.createElement("div");pv.className="icon-preview";const im=document.createElement("img");im.src=URL.createObjectURL(blob);im.alt=size+" × "+size+" icon";im.onload=()=>revoke(im.src);pv.append(im);const b=document.createElement("b");b.textContent=size+" × "+size;const sm=document.createElement("small");sm.textContent=NexaurenImage.bytes(blob.size);const btn=document.createElement("button");btn.className="btn";btn.type="button";btn.textContent="Download PNG";btn.onclick=()=>NexaurenImage.download(blob,base+"-"+size+".png");card.append(pv,b,sm,btn);e.icons.append(card)}
  icoBlob=await makeIco(assets.get(32).blob);htmlText=buildHtml(base);const manifest={name,short_name:short,start_url:"/",display:"standalone",theme_color:e.theme.value,background_color:e.pwaBg.value,icons:[192,512].map(n=>({src:"/"+base+"-"+n+".png",sizes:n+"x"+n,type:"image/png"}))};manifestText=JSON.stringify(manifest,null,2);
  e.code.hidden=false;e.code.textContent=htmlText+"\\n\\n/* manifest.webmanifest */\\n"+manifestText;e.copyHtml.disabled=false;e.copyManifest.disabled=false;e.downloadAll.disabled=false;status((SIZES.length+1)+" assets generated: "+base+".ico plus "+SIZES.length+" PNG files.")
 }catch(err){status(err?.message||"Could not generate the icon kit.",true)}finally{busy(false)}
}
async function copy(v,label){try{await navigator.clipboard.writeText(v);status(label+" copied.")}catch{status("Could not copy "+label+".",true)}}
async function downloadAll(){
 if(!assets.size||!icoBlob)return;const base=clean(e.prefix.value);NexaurenImage.download(icoBlob,base+".ico");let n=1;for(const[,a]of assets)setTimeout(()=>NexaurenImage.download(a.blob,a.name),n++*150);const mb=new Blob([manifestText],{type:"application/manifest+json"});setTimeout(()=>NexaurenImage.download(mb,"manifest.webmanifest"),n*150);status("Icon kit downloads started.")
}
async function loadFile(file){
 try{if(!file||!file.type.startsWith("image/"))throw Error("Please choose a supported image.");revoke(sourceUrl);sourceUrl=URL.createObjectURL(file);image=await NexaurenImage.loadImage(file);e.hero.src=sourceUrl;e.hero.hidden=false;e.generate.disabled=false;status((image.width||image.naturalWidth)+" × "+(image.height||image.naturalHeight)+" · image ready.")}
 catch(err){image=null;e.generate.disabled=true;status(err?.message||"Could not load this image.",true)}
}
function reset(){revoke(sourceUrl);sourceUrl="";image=null;assets.clear();icoBlob=null;e.file.value="";e.hero.removeAttribute("src");e.hero.hidden=true;e.icons.replaceChildren();e.code.hidden=true;e.code.textContent="";e.copyHtml.disabled=e.copyManifest.disabled=e.downloadAll.disabled=true;e.generate.disabled=true;status("Choose an image to start.")}
e.choose.onclick=()=>e.file.click();e.camera.onclick=()=>e.cameraFile.click();e.file.onchange=ev=>{void loadFile(ev.target.files[0]);ev.target.value=""};e.cameraFile.onchange=ev=>{void loadFile(ev.target.files[0]);ev.target.value=""};
[e.fit,e.padding,e.bgMode,e.bg,e.radius,e.shadow,e.theme,e.pwaBg].forEach(x=>x.addEventListener("input",updatePreview));
e.generate.onclick=generate;e.copyHtml.onclick=()=>copy(htmlText,"HTML");e.copyManifest.onclick=()=>copy(manifestText,"Manifest");e.downloadAll.onclick=downloadAll;e.reset.onclick=reset;
document.addEventListener("keydown",ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();if(image)void generate()}});