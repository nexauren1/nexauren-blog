(() => {
  const root=document.querySelector("[data-category-page]"),slug=document.body.dataset.category;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const iconSvg=(value)=>{
    if(value==="Aa"||value==="text") return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 17 9.2 7h2.2l4.2 10M7 13.4h6.6M15.7 17l2.1-5 2.2 5M16.4 15h2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';
  };
  const card=t=>'<a class="tool-card" href="'+esc(t.path)+'">'+
    '<span class="tool-card-icon">'+iconSvg(t.icon)+'</span>'+
    '<span class="tool-arrow">→</span>'+
    '<h2>'+esc(t.name)+'</h2>'+
    '<p>'+esc(t.description||"")+'</p>'+
    '<small>'+esc((t.tags||[]).join(" · "))+'</small>'+
  '</a>';
  async function render(){
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry(),cat=window.NexaurenToolRegistry.getCategory(registry,slug);
      if(!cat){root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>Categoria não encontrada.</strong></div></section>';return}
      document.title=cat.name+" — Ferramentas — Nexauren Story";
      const tools=window.NexaurenToolRegistry.getTools(registry,cat.id);
      root.innerHTML='<section class="tool-category-head"><a class="tool-back" href="/tool/">← Todas as categorias</a><div class="tool-eyebrow">CATEGORIA</div><h1>'+esc(cat.name)+'</h1><p>'+esc(cat.description||"")+'</p></section><section class="tool-results" aria-label="Ferramentas da categoria">'+(tools.length?'<div class="tool-grid">'+tools.map(card).join("")+'</div>':'<div class="tool-empty"><strong>A categoria está pronta.</strong><br>Ainda não existem ferramentas publicadas aqui.</div>')+'</section>';
    }catch(e){root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>Não foi possível carregar o catálogo.</strong><br>'+esc(e.message||"Tente novamente.")+'</div></section>'}
  }
  render();
})();