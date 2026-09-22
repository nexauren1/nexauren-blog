(() => {
  const root=document.querySelector("[data-category-page]"),slug=document.body.dataset.category;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const card=t=>'<a class="tool-card" href="'+esc(t.path)+'"><span class="tool-card-icon">'+esc(t.icon||"✦")+'</span><span class="tool-badge">'+esc(t.version||"1.0.0")+'</span><h2>'+esc(t.name)+'</h2><p>'+esc(t.description||"")+'</p><small>'+esc((t.tags||[]).join(" · "))+'</small><span class="tool-arrow">→</span></a>';
  async function render(){
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry(),cat=window.NexaurenToolRegistry.getCategory(registry,slug);
      if(!cat){root.innerHTML='<div class="tool-empty"><strong>Categoria não encontrada.</strong></div>';return}
      document.title=cat.name+" — Ferramentas — Nexauren Story";
      const tools=window.NexaurenToolRegistry.getTools(registry,cat.id);
      root.innerHTML='<section class="tool-category-head"><a class="tool-back" href="/tool/">← Todas as categorias</a><div class="tool-eyebrow">NEXAUREN TOOL</div><h1>'+esc(cat.name)+'</h1><p>'+esc(cat.description||"")+'</p></section><section class="tool-results">'+(tools.length?'<div class="tool-grid">'+tools.map(card).join("")+'</div>':'<div class="tool-empty"><strong>A categoria está pronta.</strong><br>Ainda não existem ferramentas publicadas aqui.</div>')+'</section>';
    }catch(e){root.innerHTML='<div class="tool-empty"><strong>Não foi possível carregar o catálogo.</strong><br>'+esc(e.message)+'</div>'}
  }
  render();
})();