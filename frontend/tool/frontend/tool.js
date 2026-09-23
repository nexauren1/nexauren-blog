(() => {
  "use strict";

  const grid=document.querySelector("[data-category-grid]");
  const search=document.querySelector("[data-tool-search]");
  const countEl=document.querySelector("[data-tool-count]");
  const featuredSection=document.querySelector("[data-tool-featured]");
  const featuredGrid=document.querySelector("[data-tool-featured-grid]");
  const popularSection=document.querySelector("[data-tool-popular]");
  const popularGrid=document.querySelector("[data-tool-popular-grid]");
  const liveSection=document.querySelector("[data-tool-live-results]");
  const resultsGrid=document.querySelector("[data-tool-results]");
  const resultCount=document.querySelector("[data-tool-result-count]");

  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const iconSvg=id=>{
    if(id==="produtividade") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h14v15H5z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8.5h8M8 12h6M8 15.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    if(id==="texto") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 17 4-10h2l4 10M8 13.5h6M16 17l1.8-4.5L20 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(id==="imagem") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/><path d="m6.5 17 4.3-4.2 2.8 2.5 2.1-2.1 2.8 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(id==="tecnologia") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="6" width="14" height="10" rx="1.8" stroke="currentColor" stroke-width="1.8"/><path d="M8 19h8M12 16v3M9 10l2 2-2 2M13 14h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';
  };

  const toolCard=(t,ranked=false)=>{
    const locked=t.access==="premium"&&!isPro;\n    const badges=(t.featured?'<span class="tool-card-badge featured">Destaque</span>':"")+(t.popular?'<span class="tool-card-badge popular">Popular</span>':"");
    return '<a class="tool-card cat-'+esc(t.category||"geral")+' '+(ranked?"tool-card-ranked ":"")+'nx-spotlight nx-reveal" data-tool-id="'+esc(t.id)+'" data-category="'+esc(t.category||"")+'" href="'+esc(locked?"/account/upgrade/":t.path)+'" aria-label="'+esc(t.name+(locked?" — requer Pro":""))+'">'+
      '<div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(t.category)+'</span><span class="tool-arrow">→</span></div>'+
      '<div class="tool-card-badges">'+badges+(t.access==="premium"?'<span class="tool-card-badge pro">PRO</span>':"")+'</div><h2>'+esc(t.name)+'</h2><p>'+esc(t.description||"")+'</p><small>'+esc((t.tags||[]).slice(0,4).join(" · "))+'</small></a>';
  };

  const categoryCard=c=>'<a class="tool-card category-card cat-'+esc(c.id)+' nx-spotlight nx-reveal" data-category="'+esc(c.id)+'" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'">'+
    '<div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(c.id)+'</span><span class="tool-arrow">→</span></div>'+
    '<h2>'+esc(c.name)+'</h2><p>'+esc(c.description||"")+'</p><small>'+Number(c.count||0)+' ferramenta(s)</small></a>';

  let categories=[],tools=[],isPro=false;
  async function getProAccess(){
    try{
      const mod=await import("/account/account-client.js?v=20260923-tool-access");
      if(!mod.auth?.currentUser)return false;
      const data=await mod.workerFetch("/api/account/billing",{method:"GET"});
      return String(data?.billing?.plan||"").toLowerCase()==="pro" && ["ACTIVE","APPROVED"].includes(String(data?.billing?.status||"").toUpperCase());
    }catch{return false;}
  }

  async function directRegistry(){
    const response=await fetch("/tool/data/data.json?v=20260923-1",{cache:"no-store"});
    if(!response.ok)throw new Error("Não foi possível ler o catálogo de ferramentas.");
    const raw=await response.json();
    return {
      version:raw?.version||1,
      site:raw?.site||"Nexauren Story",
      basePath:raw?.basePath||"/tool/",
      categories:Array.isArray(raw?.categories)?raw.categories:[],
      tools:Array.isArray(raw?.tools)?raw.tools:[]
    };
  }

  async function getRegistry(){
    try{
      if(window.NexaurenToolRegistry?.loadRegistry){
        const registry=await window.NexaurenToolRegistry.loadRegistry();
        const active=Array.isArray(registry?.tools)?registry.tools.filter(t=>t.status==="active"):[];
        if(active.length && registry?.categories?.length)return registry;
      }
    }catch{}
    return directRegistry();
  }

  function queryText(v){return String(v||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");}
  function renderList(target,list,empty,label="Ferramentas"){
    if(!target)return;
    if(!list.length){target.innerHTML=empty;return;}
    const cards=list.map(t=>toolCard(t,true)).join("");
    target.innerHTML='<div class="tool-marquee" aria-label="'+esc(label)+'"><div class="tool-marquee-track"><div class="tool-marquee-group">'+cards+'</div><div class="tool-marquee-group" aria-hidden="true">'+cards+'</div></div></div>';
    window.NexaurenUI?.refresh?.();
  }

  function renderHighlights(){
    const featured=tools.filter(t=>t.featured).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).slice(0,6);
    const popular=tools.slice().sort((a,b)=>Number(b.popular)-Number(a.popular)||(b.usageCount||0)-(a.usageCount||0)||(a.sortOrder||0)-(b.sortOrder||0)).slice(0,6);
    if(featuredSection){featuredSection.hidden=!featured.length;renderList(featuredGrid,featured,'',"Destaques");}
    if(popularSection){popularSection.hidden=!popular.length;renderList(popularGrid,popular,'',"Populares");}
  }
  function renderCategories(list){
    if(!grid)return;
    grid.innerHTML=list.length?list.map(categoryCard).join(""):'<div class="tool-empty">Nenhuma categoria encontrada.</div>';
    window.NexaurenUI?.refresh?.();
  }
  function renderResults(list){
    if(!liveSection||!resultsGrid)return;
    liveSection.hidden=list.length===0;
    if(resultCount)resultCount.textContent=list.length+(list.length===1?" ferramenta encontrada":" ferramentas encontradas");
    resultsGrid.innerHTML=list.slice(0,24).map(t=>toolCard(t)).join("");
    window.NexaurenUI?.refresh?.();
  }
  function applySearch(raw){
    const q=queryText(raw).trim();
    if(q)localStorage.setItem("nexauren-tool-search",String(raw).slice(0,100));else localStorage.removeItem("nexauren-tool-search");
    if(!q){renderCategories(categories);renderResults([]);featuredSection&&(featuredSection.hidden=false);popularSection&&(popularSection.hidden=false);renderHighlights();return;}
    if(featuredSection)featuredSection.hidden=true;
    if(popularSection)popularSection.hidden=true;
    const matchCategory=categories.filter(c=>queryText(c.name+" "+(c.description||"")).includes(q));
    const matchTools=tools.filter(t=>queryText([t.name,t.description,(t.tags||[]).join(" "),t.category].join(" ")).includes(q));
    renderCategories(matchCategory);renderResults(matchTools);
  }
  async function trackToolViews(){
    if(!tools.length)return;
    const items=[...document.querySelectorAll("[data-tool-id]")].slice(0,6);
    await Promise.all(items.map(a=>fetch("/api/tools/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tool_id:a.dataset.toolId,event:"impression"})}).catch(()=>{})));
  }
  async function render(){
    try{
      const registry=await getRegistry();
      tools=registry.tools.filter(t=>t.status==="active");
      categories=registry.categories.map(c=>({...c,count:registry.tools.filter(t=>t.status==="active"&&t.category===c.id).length}));
      if(countEl)countEl.textContent=tools.length;
      isPro=await getProAccess();
      renderHighlights();
      const stored=localStorage.getItem("nexauren-tool-search")||"";
      if(search&&stored){search.value=stored;applySearch(stored);}else{renderCategories(categories);renderResults([]);}
      trackToolViews();
    }catch(e){if(grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Não foi possível carregar o catálogo.")+'</div>';}
  }
  search?.addEventListener("input",()=>applySearch(search.value));
  render();
})();