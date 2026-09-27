/* Nexauren Blog — image persistence compatibility layer
   Keeps @imagem/@image markers and uploaded editor images in the post payload.
   It is deliberately isolated from the existing editor implementation. */
(()=>{
  if(window.__NX_IMAGE_PERSISTENCE_FIX__)return;
  window.__NX_IMAGE_PERSISTENCE_FIX__=true;
  const nativeFetch=window.fetch.bind(window);
  const isWrite=method=>/^(POST|PUT|PATCH)$/i.test(method||"POST");
  const clean=v=>String(v??"").trim();
  const markerRx=/^@(imagem|image)\s+(https?:\/\/\S+)(?:\s*\|\s*([^|\n]*))?(?:\s*\|\s*(.*))?$/i;
  function editorNodes(){
    return [...document.querySelectorAll('textarea,[contenteditable="true"]')].filter(el=>{
      if(el.closest("#login-view"))return false;
      const id=(el.id||"").toLowerCase(),cl=(el.className||"").toString().toLowerCase();
      return /content|editor|story|body|article|post/.test(id+" "+cl)||el.matches('[contenteditable="true"]');
    });
  }
  function getEditor(){
    const nodes=editorNodes();
    return nodes.find(el=>/@(?:imagem|image)\s+https?:\/\//i.test(el.value||el.innerText||el.textContent||""))
      ||nodes.find(el=>el.querySelector?.("img"))
      ||nodes.find(el=>/::|^##?\s/m.test(el.value||el.innerText||el.textContent||""))
      ||nodes[0]||null;
  }
  function editorImageMarkers(el){
    if(!el)return [];
    const imgs=[...el.querySelectorAll?.("img")||[]];
    return imgs.map(img=>{
      const src=clean(img.currentSrc||img.src);
      if(!/^https?:\/\//i.test(src))return "";
      const alt=clean(img.getAttribute("alt"))||"Imagem do artigo";
      const fig=img.closest("figure");
      const cap=clean(fig?.querySelector("figcaption")?.textContent||"");
      return `@imagem ${src} | ${alt}${cap?` | ${cap}`:""}`;
    }).filter(Boolean);
  }
  function editorText(el){
    if(!el)return "";
    if("value" in el)return String(el.value||"");
    return String(el.innerText||el.textContent||"");
  }
  function preserveImages(content){
    let text=String(content||"").replace(/\r/g,"");
    const el=getEditor();
    const raw=editorText(el);
    const rawMarkers=raw.split("\n").map(x=>clean(x)).filter(x=>markerRx.test(x));
    const markers=[...rawMarkers,...editorImageMarkers(el)];
    for(const marker of markers){
      const m=marker.match(markerRx);
      const src=m?.[2];
      if(src&&!new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(text))text=text.replace(/\n?$/,"\n\n")+marker;
    }
    return text.replace(/\n{3,}/g,"\n\n").trim();
  }
  window.fetch=async(input,init={})=>{
    try{
      const method=String(init.method||"GET").toUpperCase();
      const url=typeof input==="string"?input:(input?.url||"");
      if(isWrite(method)&&/\/api\/admin\//i.test(url)&&init.body&&typeof init.body==="string"&&/json/i.test(init.headers?.["content-type"]||init.headers?.get?.("content-type")||"")){
        const payload=JSON.parse(init.body);
        if(typeof payload.content==="string"){
          const next=preserveImages(payload.content);
          if(next!==payload.content){payload.content=next;init={...init,body:JSON.stringify(payload)}}
        }
      }
    }catch(e){console.warn("Nexauren image persistence fix:",e)}
    return nativeFetch(input,init);
  };
})();
