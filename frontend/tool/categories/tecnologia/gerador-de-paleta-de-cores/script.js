const $=s=>document.querySelector(s);
const base=$("#base"),picker=$("#picker"),mode=$("#mode"),count=$("#count"),palette=$("#palette"),cssOutput=$("#cssOutput"),message=$("#message"),status=$("#status");
function clamp(v,min=0,max=100){return Math.min(max,Math.max(min,v))}
function hexToRgb(hex){let h=hex.trim().replace("#","");if(/^[0-9a-f]{3}$/i.test(h))h=h.split("").map(c=>c+c).join("");if(!/^[0-9a-f]{6}$/i.test(h))return null;return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));switch(max){case r:h=((g-b)/d+(g<b?6:0))*60;break;case g:h=((b-r)/d+2)*60;break;default:h=((r-g)/d+4)*60}}return[h,s*100,l*100]}
function hslToHex(h,s,l){h=((h%360)+360)%360;s=clamp(s)/100;l=clamp(l)/100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];return"#"+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,"0")).join("").toUpperCase()}
function hueOffsets(name,total){const presets={complementary:[0,180],analogous:[-30,0,30],triadic:[0,120,240],split:[0,150,210],monochrome:[0]};const p=presets[name]||presets.complementary;if(total<=p.length)return p.slice(0,total);const out=[];for(let i=0;i<total;i++){if(name==="monochrome")out.push(0);else out.push(p[i%p.length]+(Math.floor(i/p.length)*12))}return out}
function generate(){
 const rgb=hexToRgb(base.value);if(!rgb){message.textContent="Use uma cor HEX válida, por exemplo #7C5CFC.";message.className="message error";return}
 const [h,s,l]=rgbToHsl(...rgb),total=Number(count.value),offsets=hueOffsets(mode.value,total),items=offsets.map((off,i)=>{let light;if(mode.value==="monochrome"){light=clamp(l-28+i*(56/(total-1||1)),8,92)}else{light=clamp(l+(i-(total-1)/2)*5,12,88)}return hslToHex(h+off,clamp(s,35,95),light)});
 palette.innerHTML=items.map((hex,i)=>'<button class="swatch" data-copy="'+hex+'" style="background:'+hex+'" title="Copiar '+hex+'"><span class="info"><strong>'+("COR "+String(i+1).padStart(2,"0"))+'</strong><span>'+hex+'</span></span></button>').join("");
 cssOutput.textContent=":root{\\n"+items.map((hex,i)=>"  --nexauren-color-"+(i+1)+": "+hex+";").join("\\n")+"\\n}";
 palette.querySelectorAll("[data-copy]").forEach(el=>el.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(el.dataset.copy);message.textContent=el.dataset.copy+" copiado.";message.className="message ok"}catch{} }));
 status.textContent=total+" CORES";message.textContent="Paleta gerada localmente.";message.className="message ok"
}
picker.addEventListener("input",()=>{base.value=picker.value;generate()});
base.addEventListener("change",()=>{const rgb=hexToRgb(base.value);if(rgb)picker.value="#"+rgb.map(v=>v.toString(16).padStart(2,"0")).join("");generate()});
$("#generate").addEventListener("click",generate);
$("#random").addEventListener("click",()=>{const hex="#"+crypto.getRandomValues(new Uint8Array(3)).reduce((s,v)=>s+v.toString(16).padStart(2,"0"),"").toUpperCase();base.value=hex;picker.value=hex;generate()});
$("#copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(cssOutput.textContent);message.textContent="Tokens CSS copiados.";message.className="message ok"}catch{message.textContent="Não foi possível copiar.";message.className="message error"}});
generate();