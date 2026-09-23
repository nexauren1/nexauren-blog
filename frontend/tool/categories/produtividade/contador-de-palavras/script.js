import {auth,onAuthStateChanged} from "/tool/frontend/tool-access.js?v=20260923-access-2";

(()=> {
  const text=document.querySelector("#text"),app=document.querySelector("#tool-app"),gate=document.querySelector("#account-gate");
  const els={words:document.querySelector("#words"),chars:document.querySelector("#chars"),charsNoSpace:document.querySelector("#charsNoSpace"),lines:document.querySelector("#lines"),read:document.querySelector("#read")};
  function update(){const v=text.value,words=v.trim()?v.trim().split(/\s+/).length:0,lines=v?v.split(/\n/).length:0,minutes=words?Math.max(1,Math.ceil(words/200)):0;els.words.textContent=words.toLocaleString("pt-PT");els.chars.textContent=v.length.toLocaleString("pt-PT");els.charsNoSpace.textContent=v.replace(/\s/g,"").length.toLocaleString("pt-PT");els.lines.textContent=lines.toLocaleString("pt-PT");els.read.textContent=minutes+" min"}
  function sync(user){const allowed=!!user;gate.hidden=allowed;app.hidden=!allowed;if(allowed){update();setTimeout(()=>text.focus(),0)}}
  text.addEventListener("input",update);
  document.querySelector("#clear").addEventListener("click",()=>{text.value="";text.focus();update()});
  document.querySelector("#copy").addEventListener("click",async()=>{if(!text.value)return;try{await navigator.clipboard.writeText(text.value);const b=document.querySelector("#copy"),old=b.textContent;b.textContent="Copiado ✓";setTimeout(()=>b.textContent=old,1200)}catch{}});
  onAuthStateChanged(auth,sync);
})();
