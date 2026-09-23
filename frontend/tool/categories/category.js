(() => {
  const DATA_URL="/api/tool-registry";
  const FALLBACK_DATA_URL="/tool/data/data.json?v=20260923-2";
  const CACHE_KEY="nexauren:tool-registry:v3";
  let registryPromise=null;

  function normalize(raw){
    const categories=Array.isArray(raw?.categories)?raw.categories.slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)):[];
    const tools=Array.isArray(raw?.tools)?raw.tools:[];
    return {version:raw?.version||1,site:raw?.site||"Nexauren Story",basePath:raw?.basePath||"/tool/",registry:raw?.registry||null,categories,tools};
  }
  function valid(raw){return !!raw&&Array.isArray(raw.categories)&&Array.isArray(raw.tools);}
  function readCache(){
    try{
      const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
      const registry=normalize(saved?.registry);
      return valid(registry)?registry:null;
    }catch{return null;}
  }
  function saveCache(registry){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),registry}));}catch{}
  }
  async function refreshRegistry(){
    try{
      const r=await fetch(DATA_URL,{cache:"no-store",credentials:"same-origin"});
      if(!r.ok)throw new Error("API indisponível");
      const registry=normalize(await r.json());
      if(!registry.categories.length||!registry.tools.some(t=>t.status==="active"))throw new Error("Catálogo incompleto");
      saveCache(registry);
      window.dispatchEvent(new CustomEvent("nexauren:tool-registry-updated",{detail:registry}));
      return registry;
    }catch(primary){
      const r=await fetch(FALLBACK_DATA_URL,{cache:"no-store",credentials:"same-origin"});
      if(!r.ok)throw primary;
      const registry=normalize(await r.json());
      if(valid(registry))saveCache(registry);
      window.dispatchEvent(new CustomEvent("nexauren:tool-registry-updated",{detail:registry}));
      return registry;
    }
  }
  async function loadRegistry(){
    if(!registryPromise){
      const cached=readCache();
      if(cached){
        registryPromise=Promise.resolve(cached);
        refreshRegistry().catch(()=>{});
      }else{
        registryPromise=refreshRegistry();
      }
    }
    return registryPromise;
  }
  function getCachedRegistry(){return readCache();}
  function getCategory(registry,slug){return registry.categories.find(c=>c.id===slug||c.slug===slug)||null}
  function getTools(registry,slug){return registry.tools.filter(t=>t.status!=="disabled"&&(!slug||t.category===slug))}
  window.NexaurenToolRegistry={loadRegistry,refreshRegistry,getCachedRegistry,getCategory,getTools};
})();
