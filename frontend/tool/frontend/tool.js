(() => {
  const grid=document.querySelector("[data-category-grid]"),search=document.querySelector("[data-tool-search]"),empty=document.querySelector("[data-tool-empty]");
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const card=c=>'<a class="tool-card" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'"><span class="tool-card-icon">'+esc(c.icon||"✦")+'</span><h2>'+esc(c.name)+'</h2><p>'+esc(c.description||"")+'</p><small class="tool-category-count">'+Number(c.count||0)+' ferramenta(s)</small><span class="tool-arrow">→</span></a>';
  let categories=[];
  async function render(){
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry();
      if(countEl)countEl.textContent=registry.tools.filter(t=>t.status!=="disabled").length;
      categories=registry.categories.map(c=>({...c,count:window.NexaurenToolRegistry.getTools(registry,c.id).length}));
      draw(categories);
    }catch(e){if(grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message)+'</div>'}
  }
  function draw(list){if(!grid)return;grid.innerHTML=list.length?list.map(card).join(""):'<div class="tool-empty">Nenhuma categoria encontrada.</div>';if(empty)empty.hidden=true}
  search?.addEventListener("input",()=>{
    const q=search.value.trim().toLowerCase();
    draw(categories.filter(c=>(c.name+" "+c.description).toLowerCase().includes(q)));
  });
  render();
})();