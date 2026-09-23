(() => {
  const DATA_URL="/api/tool-registry";
  const FALLBACK_DATA_URL="/tool/data/data.json";
  const CACHE_KEY="nexauren:tool-registry:v5";
  const REQUEST_TIMEOUT=5000;
  const DEVELOPER_CATEGORY={id:"developer",name:"Developer",description:"Ferramentas para ler, testar e trabalhar com código.",icon:"</>",sortOrder:50,path:"/tool/categories/developer/"};
  const DEVELOPER_TOOL={id:"leitor-de-codigo-web",name:"Leitor de Código Web",description:"Leia, organize e inspecione HTML, CSS e JavaScript numa única ferramenta.",category:"developer",icon:"</>",version:"1.0.0",status:"active",path:"/tool/categories/developer/leitor-de-codigo-web/",tags:["HTML","CSS","JavaScript","código","leitor","desenvolvimento"],featured:true,popular:true,access:"public",sortOrder:10};
  let registryPromise=null;
  let refreshPromise=null;

  function normalize(raw){
    const categories=Array.isArray(raw?.categories)?raw.categories.slice():[];
    const tools=Array.isArray(raw?.tools)?raw.tools.slice():[];
    if(!categories.some(c=>c.id===DEVELOPER_CATEGORY.id))categories.push({...DEVELOPER_CATEGORY});
    if(!tools.some(t=>t.id===DEVELOPER_TOOL.id))tools.push({...DEVELOPER_TOOL});
    categories.sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
    return {version:raw?.version||1,site:raw?.site||"Nexauren Story",basePath:raw?.basePath||"/tool/",registry:raw?.registry||null,categories,tools};
  }
  function valid(raw){return !!raw&&Array.isArray(raw.categories)&&Array.isArray(raw.tools)}
  function readCache(){
    try{
      const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
      const registry=normalize(saved?.registry);
      return valid(registry)?registry:null;
    }catch{return null}
  }
  function saveCache(registry){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),registry}))}catch{}
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
        const registry=await fetchFresh(DATA_URL);
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
