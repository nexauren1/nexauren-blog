(() => {
  "use strict";
  const mode=document.body.dataset.curated||"featured";
  const title=mode==="popular"?"Populares":"Destaques";
  const eyebrow=mode==="popular"?"MAIS USADOS":"SELEÇÃO NEXAUREN";
  const note=mode==="popular"?"Ferramentas mais procuradas e utilizadas.":"Ferramentas escolhidas para começar rapidamente.";
  const grid=document.querySelector("[data-curated-grid]");
  const count=document.querySelector("[data-curated-count]");
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const icon=id=>{
    const paths={
      produtividade:'<path d="M5 4.5h14v15H5z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8.5h8M8 12h6M8 15.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      texto:'<path d="m6 17 4-10h2l4 10M8 13.5h6M16 17l1.8-4.5L20 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      imagem:'<rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/><path d="m6.5 17 4.3-4.2 2.8 2.5 2.1-2.1 2.8 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      tecnologia:'<rect x="5" y="6" width="14" height="10" rx="1.8" stroke="currentColor" stroke-width="1.8"/><path d="M8 19h8M12 16v3M9 10l2 2-2 2M13 14h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    };
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">'+(paths[id]||paths.tecnologia)+'</svg>';
  };
  const card=t=>'<a class="tool-card cat-'+esc(t.category||"geral")+' tool-card-ranked" data-tool-id="'+esc(t.id)+'" href="'+esc(t.path)+'"><div class="tool-card-top"><span class="tool-card-icon">'+icon(t.category)+'</span><span class="tool-arrow">→</span></div><div class="tool-card-badges">'+(t.featured?'<span class="tool-card-badge featured">Destaque</span>':"")+(t.popular?'<span class="tool-card-badge popular">Popular</span>':"")+'</div><h2>'+esc(t.name)+'</h2><p>'+esc(t.description||"")+'</p><small>'+esc((t.tags||[]).slice(0,4).join(" · "))+'</small></a>';
  async function render(){
    try{
      const reg=await window.NexaurenToolRegistry.loadRegistry();
      let tools=reg.tools.filter(t=>t.status==="active");
      tools=mode==="popular"
        ? tools.filter(t=>t.popular).sort((a,b)=>(b.usageCount||0)-(a.usageCount||0)||(a.sortOrder||0)-(b.sortOrder||0))
        : tools.filter(t=>t.featured).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
      document.title=title+" — Ferramentas — Nexauren Story";
      document.querySelector("[data-curated-title]").textContent=title;
      document.querySelector("[data-curated-eyebrow]").textContent=eyebrow;
      document.querySelector("[data-curated-note]").textContent=note;
      if(count)count.textContent=tools.length+" ferramenta"+(tools.length===1?"":"s");
      const cards=tools.map(card).join("");
      if(grid)grid.innerHTML=tools.length?'<div class="tool-marquee" aria-label="'+title+'"><div class="tool-marquee-track"><div class="tool-marquee-group">'+cards+'</div><div class="tool-marquee-group" aria-hidden="true">'+cards+'</div></div></div><div class="tool-grid curated-all-grid">'+cards+'</div>':'<div class="tool-empty">Ainda não existem ferramentas nesta seleção.</div>';
      window.NexaurenUI?.refresh?.();
    }catch(e){if(grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Não foi possível carregar a seleção.")+'</div>';}
  }
  render();
})();