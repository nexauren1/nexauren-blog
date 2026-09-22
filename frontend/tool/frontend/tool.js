(() => {
  "use strict";

  const grid=document.querySelector("[data-category-grid]");
  const search=document.querySelector("[data-tool-search]");
  const countEl=document.querySelector("[data-tool-count]");
  const liveSection=document.querySelector("[data-tool-live-results]");
  const resultsGrid=document.querySelector("[data-tool-results]");
  const resultCount=document.querySelector("[data-tool-result-count]");

  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const iconSvg=(id)=>{
    if(id==="produtividade") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h14v15H5z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8.5h8M8 12h6M8 15.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    if(id==="texto") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 17 4-10h2l4 10M8 13.5h6M16 17l1.8-4.5L20 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(id==="imagem") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/><path d="m6.5 17 4.3-4.2 2.8 2.5 2.1-2.1 2.8 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(id==="tecnologia") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="6" width="14" height="10" rx="1.8" stroke="currentColor" stroke-width="1.8"/><path d="M8 19h8M12 16v3M9 10l2 2-2 2M13 14h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';
  };

  const categoryCard=c=>'<a class="tool-card nx-spotlight nx-reveal" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'">'+
    '<span class="tool-card-icon">'+iconSvg(c.id)+'</span><span class="tool-arrow">→</span>'+
    '<h2>'+esc(c.name)+'</h2><p>'+esc(c.description||"")+'</p>'+
    '<small>'+Number(c.count||0)+' ferramenta(s) nesta categoria</small></a>';

  const toolCard=t=>'<a class="tool-card nx-spotlight nx-reveal" href="'+esc(t.path)+'">'+
    '<span class="tool-card-icon">'+iconSvg(t.category)+'</span><span class="tool-arrow">→</span>'+
    '<h2>'+esc(t.name)+'</h2><p>'+esc(t.description||"")+'</p>'+
    '<small>'+esc((t.tags||[]).slice(0,4).join(" · "))+'</small></a>';

  let categories=[],tools=[];

  function queryText(v){
    return String(v||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
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
    resultsGrid.innerHTML=list.slice(0,24).map(toolCard).join("");
    window.NexaurenUI?.refresh?.();
  }

  async function render(){
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry();
      tools=registry.tools.filter(t=>t.status!=="disabled");
      if(countEl)countEl.textContent=tools.length;
      categories=registry.categories.map(c=>({...c,count:window.NexaurenToolRegistry.getTools(registry,c.id).length}));
      const stored=localStorage.getItem("nexauren-tool-search")||"";
      if(search&&stored){search.value=stored;applySearch(stored);}else{renderCategories(categories);renderResults([]);}
    }catch(e){
      if(grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Não foi possível carregar as categorias.")+'</div>';
    }
  }

  function applySearch(raw){
    const q=queryText(raw).trim();
    if(q)localStorage.setItem("nexauren-tool-search",String(raw).slice(0,100));
    else localStorage.removeItem("nexauren-tool-search");
    if(!q){renderCategories(categories);renderResults([]);return;}
    const matchCategory=categories.filter(c=>queryText(c.name+" "+(c.description||"")).includes(q));
    const matchTools=tools.filter(t=>queryText([t.name,t.description,(t.tags||[]).join(" "),t.category].join(" ")).includes(q));
    renderCategories(matchCategory);
    renderResults(matchTools);
  }

  search?.addEventListener("input",()=>applySearch(search.value));
  render();
})();