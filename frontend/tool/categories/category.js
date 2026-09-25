(()=>{
  const DATA_URL="/api/tool-registry";
  const requestedLanguage=(()=>{const q=new URLSearchParams(location.search).get("lang");if(q==="en")return "en";try{return localStorage.getItem("ns_lang")==="en"?"en":"pt"}catch{return "pt"}})();
  const FALLBACK_DATA_URL="/tool/data/data.json";
  const CACHE_KEY="nexauren:tool-registry:v5";
  const CACHE_SCOPE=requestedLanguage;
  const REQUEST_TIMEOUT=5000;
  let registryPromise=null;
  let refreshPromise=null;

  function normalize(raw){
    const categories=Array.isArray(raw?.categories)?raw.categories.slice():[];
    const tools=Array.isArray(raw?.tools)?raw.tools.slice():[];
    categories.sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
    return {version:raw?.version||1,site:raw?.site||"Nexauren Story",basePath:raw?.basePath||"/tool/",registry:raw?.registry||null,categories,tools};
  }
  function valid(raw){return !!raw&&Array.isArray(raw.categories)&&Array.isArray(raw.tools)}
  function readCache(){
    try{
      const saved=JSON.parse(localStorage.getItem(CACHE_KEY+":"+CACHE_SCOPE)||"null");
      const registry=normalize(saved?.registry);
      return valid(registry)?registry:null;
    }catch{return null}
  }
  function saveCache(registry){
    try{localStorage.setItem(CACHE_KEY+":"+CACHE_SCOPE,JSON.stringify({savedAt:Date.now(),registry}))}catch{}
  }
  async function fetchFresh(url,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
    try{
      const r=await fetch(url,{cache:"no-store",credentials:"same-origin",signal:controller.signal,...options});
      if(!r.ok)throw new Error("Catálogo indisponível");
      return normalize(await r.json());
    }catch(error){
      if(error?.name==="AbortError")throw new Error("Tempo limite ao carregar o catálogo.");
      throw error;
    }finally{clearTimeout(timer)}
  }
  async function refreshRegistry(){
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      try{
        const registry=await fetchFresh(DATA_URL+"?lang="+encodeURIComponent(requestedLanguage));
        if(!registry.categories.length||!registry.tools.some(t=>t.status==="active"))throw new Error("Catálogo incompleto");
        saveCache(registry);
        window.dispatchEvent(new CustomEvent("nexauren:tool-registry-updated",{detail:registry}));
        return registry;
      }catch(primary){
        try{
          const registry=await fetchFresh(FALLBACK_DATA_URL+"?v="+Date.now());
          if(valid(registry)){
            saveCache(registry);
            window.dispatchEvent(new CustomEvent("nexauren:tool-registry-updated",{detail:registry}));
            return registry;
          }
        }catch{}
        throw primary;
      }finally{refreshPromise=null}
    })();
    return refreshPromise;
  }
  async function loadRegistry(){
    if(!registryPromise){
      const cached=readCache();
      if(cached){
        registryPromise=Promise.resolve(cached);
        refreshRegistry().then(fresh=>{registryPromise=Promise.resolve(fresh)}).catch(()=>{});
      }else{
        registryPromise=refreshRegistry();
      }
    }
    return registryPromise;
  }
  function getCachedRegistry(){return readCache()}
  function getCategory(registry,slug){return registry.categories.find(c=>c.id===slug||c.slug===slug)||null}
  function getTools(registry,slug){return registry.tools.filter(t=>t.status!=="disabled"&&(!slug||t.category===slug))}
  window.NexaurenToolRegistry={loadRegistry,refreshRegistry,getCachedRegistry,getCategory,getTools};
})();
