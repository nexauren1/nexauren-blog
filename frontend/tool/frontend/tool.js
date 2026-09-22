(() => {
  const grid=document.querySelector("[data-category-grid]"),search=document.querySelector("[data-tool-search]"),countEl=document.querySelector("[data-tool-count]");
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const iconSvg=(id)=>{
    if(id==="produtividade") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h14v15H5z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8.5h8M8 12h6M8 15.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';
  };
  const card=c=>'<a class="tool-card" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'">'+
    '<span class="tool-card-icon">'+iconSvg(c.id)+'</span>'+
    '<span class="tool-arrow">→</span>'+
    '<h2>'+esc(c.name)+'</h2>'+
    '<p>'+esc(c.description||"")+'</p>'+
    '<small>'+Number(c.count||0)+' ferramenta(s) nesta categoria</small>'+
  '</a>';
  let categories=[];
  async function render(){
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry();
      const activeTools=registry.tools.filter(t=>t.status!=="disabled");
      if(countEl)countEl.textContent=activeTools.length;
      categories=registry.categories.map(c=>({...c,count:window.NexaurenToolRegistry.getTools(registry,c.id).length}));
      draw(categories);
    }catch(e){
      if(grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Não foi possível carregar as categorias.")+'</div>';
    }
  }
  function draw(list){
    if(!grid)return;
    grid.innerHTML=list.length?list.map(card).join(""):'<div class="tool-empty">Nenhuma categoria encontrada.</div>';
  }
  search?.addEventListener("input",()=>{
    const q=search.value.trim().toLowerCase();
    draw(categories.filter(c=>(c.name+" "+(c.description||"")).toLowerCase().includes(q)));
  });
  render();
})();