(() => {
  const DATA_URL="/api/tool-registry";
  const FALLBACK_DATA_URL="/tool/data/data.json?v=20260923-catalog";
  const CACHE_KEY="nexauren-tool-registry-v2";
  let registryPromise=null;
  function normalize(raw){
    const categories=Array.isArray(raw?.categories)?raw.categories.slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)):[];
    const tools=Array.isArray(raw?.tools)?raw.tools:[];
    return {version:raw?.version||1,site:raw?.site||"Nexauren Story",basePath:raw?.basePath||"/tool/",categories,tools};
  }
  function readCache(){try{const raw=localStorage.getItem(CACHE_KEY);return raw?normalize(JSON.parse(raw).data):null}catch{return null}}
  function saveCache(registry){try{localStorage.setItem(CACHE_KEY,JSON.stringify({version:registry.version,updatedAt:Date.now(),data:registry}))}catch{}}
  async function networkRegistry(){
    try{
      const r=await fetch(DATA_URL,{cache:"no-store"});
      if(!r.ok)throw new Error("API indisponível");
      const registry=normalize(await r.json());
      if(!registry.categories.length||!registry.tools.some(t=>t.status==="active"))throw new Error("Catálogo incompleto");
      saveCache(registry); return registry;
    }catch{
      const r=await fetch(FALLBACK_DATA_URL,{cache:"no-store"});
      if(!r.ok)throw new Error("Catálogo indisponível");
      const registry=normalize(await r.json()); saveCache(registry); return registry;
    }
  }
  async function loadRegistry(){
    if(registryPromise)return registryPromise;
    const cached=readCache();
    if(cached){
      registryPromise=Promise.resolve(cached);
      networkRegistry().then(fresh=>{registryPromise=Promise.resolve(fresh);window.dispatchEvent(new CustomEvent("nexauren:tool-registry-updated",{detail:fresh}));}).catch(()=>{});
      return cached;
    }
    registryPromise=networkRegistry();
    return registryPromise;
  }
  function getCategory(registry,slug){return registry.categories.find(c=>c.id===slug||c.slug===slug)||null}
  function getTools(registry,slug){return registry.tools.filter(t=>t.status!=="disabled"&&(!slug||t.category===slug))}
  window.NexaurenToolRegistry={loadRegistry,getCategory,getTools,refreshRegistry:networkRegistry};
})();
