(() => {
  const DATA_URL="/api/tool-registry";const FALLBACK_DATA_URL="/tool/data/data.json";
  let registryPromise=null;
  function normalize(raw){
    const categories=Array.isArray(raw?.categories)?raw.categories.slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)):[],
      tools=Array.isArray(raw?.tools)?raw.tools:[];
    return {version:raw?.version||1,site:raw?.site||"Nexauren Story",basePath:raw?.basePath||"/tool/",categories,tools};
  }
  async function loadRegistry(){
    if(!registryPromise) registryPromise=fetch(DATA_URL,{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("API indisponível");return r.json()}).catch(()=>fetch(FALLBACK_DATA_URL,{cache:"no-store"})).then(normalize);
    return registryPromise;
  }
  function getCategory(registry,slug){return registry.categories.find(c=>c.id===slug||c.slug===slug)||null}
  function getTools(registry,slug){return registry.tools.filter(t=>t.status!=="disabled"&&(!slug||t.category===slug))}
  window.NexaurenToolRegistry={loadRegistry,getCategory,getTools};
})();