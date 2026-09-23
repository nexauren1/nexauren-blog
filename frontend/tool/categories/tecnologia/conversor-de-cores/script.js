const $=s=>document.querySelector(s),color=$("#color"),swatch=$("#swatch"),message=$("#message");
function clamp(v,min=0,max=1){return Math.min(max,Math.max(min,v))}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;let h=0,s=0;if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h/=6}return [h*360,s*100,l*100]}
function rgbToHsv(r,g,b){const rr=r/255,gg=g/255,bb=b/255,max=Math.max(rr,gg,bb),min=Math.min(rr,gg,bb),d=max-min;let h=0;if(d){switch(max){case rr:h=((gg-bb)/d+(gg<bb?6:0))*60;break;case gg:h=((bb-rr)/d+2)*60;break;default:h=((rr-gg)/d+4)*60}}return [h,max?d/max*100:0,max*100]}
function rgbToCmyk(r,g,b){const rr=r/255,gg=g/255,bb=b/255,k=1-Math.max(rr,gg,bb);if(k===1)return[0,0,0,100];return[(1-rr-k)/(1-k)*100,(1-gg-k)/(1-k)*100,(1-bb-k)/(1-k)*100,k*100]}
function parseHex(v){let h=v.trim().replace(/^#/,"");if(/^[\da-f]{3}$/i.test(h))h=h.split("").map(x=>x+x).join("");if(/^[\da-f]{6}$/i.test(h))return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];return null}
function parseRgb(v){const m=v.trim().match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)$/i);if(!m)return null;return [clamp(Number(m[1])/255,0,1)*255,clamp(Number(m[2])/255,0,1)*255,clamp(Number(m[3])/255,0,1)*255].map(Math.round)}
function hslToRgb(h,s,l){h=((h%360)+360)%360/360;s=clamp(s/100);l=clamp(l/100);const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};if(s===0)return[Math.round(l*255),Math.round(l*255),Math.round(l*255)];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return[Math.round(hue2rgb(p,q,h+1/3)*255),Math.round(hue2rgb(p,q,h)*255),Math.round(hue2rgb(p,q,h-1/3)*255)]}
function parseHsl(v){const m=v.trim().match(/^hsla?\(\s*([\d.]+)\s*(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i);return m?hslToRgb(Number(m[1]),Number(m[2]),Number(m[3])):null}
function luminance([r,g,b]){const f=x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)}
function contrast(rgb1,rgb2){const a=luminance(rgb1),b=luminance(rgb2);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
function convert(){
 const raw=color.value.trim();let rgb=parseHex(raw)||parseRgb(raw)||parseHsl(raw);if(!rgb){message.textContent="Cor inválida. Use #RRGGBB, rgb(...) ou hsl(...).";message.className="message error";return}
 const [r,g,b]=rgb,hsl=rgbToHsl(r,g,b),hsv=rgbToHsv(r,g,b),cmyk=rgbToCmyk(r,g,b),hex="#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
 $("#hex").textContent=hex;$("#rgb").textContent="rgb("+r+", "+g+", "+b+")";$("#hsl").textContent="hsl("+Math.round(hsl[0])+" "+Math.round(hsl[1])+"% "+Math.round(hsl[2])+"%)";$("#hsv").textContent="hsv("+Math.round(hsv[0])+" "+Math.round(hsv[1])+"% "+Math.round(hsv[2])+"%)";$("#cmyk").textContent=cmyk.map(Math.round).join("% ")+"%";swatch.style.background=hex;
 $("#onWhite").textContent=contrast(rgb,[255,255,255]).toFixed(2)+":1";$("#onBlack").textContent=contrast(rgb,[0,0,0]).toFixed(2)+":1";message.textContent="Conversão concluída localmente.";message.className="message ok"
}
$("#convert").addEventListener("click",convert);color.addEventListener("keydown",e=>{if(e.key==="Enter")convert()});
document.querySelectorAll("[data-color]").forEach(btn=>btn.addEventListener("click",()=>{color.value=btn.dataset.color;convert()}));
document.querySelectorAll("[data-copy]").forEach(btn=>btn.addEventListener("click",async()=>{const value=$("#"+btn.dataset.copy).textContent;if(value==="—")return;try{await navigator.clipboard.writeText(value);message.textContent="Valor "+btn.dataset.copy.toUpperCase()+" copiado.";message.className="message ok"}catch{message.textContent="Não foi possível copiar.";message.className="message error"}}));
convert();