(()=>{"use strict";
const root=document.getElementById("tool-reviews-list"),search=document.getElementById("tool-reviews-search"),total=document.getElementById("tool-reviews-total");
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const date=v=>{try{return new Intl.DateTimeFormat("pt-PT",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}catch{return v||"—";}};
const stars=n=>[1,2,3,4,5].map(i=>'<span class="'+(i<=Number(n)?"on":"off")+'">★</span>').join("");
let all=[],registry=null;
const toolById=id=>registry?.tools?.find(t=>t.id===id)||null;
function render(){
  const q=String(search?.value||"").trim().toLowerCase();
  const rows=all.filter(x=>{
    if(!q)return true;
    const tool=toolById(x.tool_id);
    return String(tool?.name||x.tool_id).toLowerCase().includes(q)||String(x.body||"").toLowerCase().includes(q)||String(x.display_mode==="anonymous"?x.anonymous_name:x.display_name).toLowerCase().includes(q);
  });
  if(total)total.textContent=all.length+(all.length===1?" avaliação":" avaliações");
  if(!root)return;
  if(!rows.length){root.innerHTML='<div class="tool-reviews-empty">'+(all.length?"Nenhuma avaliação corresponde à pesquisa.":"Ainda não existem avaliações públicas.")+'</div>';return;}
  root.innerHTML=rows.map(x=>{
    const tool=toolById(x.tool_id),name=x.display_mode==="anonymous"?(x.anonymous_name||"Anónimo"):(x.display_name||"Utilizador Nexauren");
    return '<article class="tool-review-public"><div><div class="tool-review-public-top"><strong>'+esc(name)+'</strong><span class="tool-review-public-meta">· '+esc(date(x.created_at))+'</span></div><a class="tool-review-public-tool" href="'+esc(tool?.path||"/tool/")+'">'+esc(tool?.name||x.tool_id)+'</a>'+(x.body?'<p>'+esc(x.body)+'</p>':"")+'<div class="tool-review-public-meta">Avaliação pública</div></div><div class="tool-review-public-side"><div class="tool-review-public-rating"><span class="tool-rating-stars">'+stars(x.rating)+'</span> '+Number(x.rating||0)+'/5</div><a class="tool-reviews-link" href="/tool/avaliacoes/?tool='+encodeURIComponent(x.tool_id)+'">Ver avaliações</a></div></article>';
  }).join("");
}
(async()=>{
  try{
    if(window.NexaurenToolRegistry)registry=await window.NexaurenToolRegistry.loadRegistry();
    const toolParam=new URLSearchParams(location.search).get("tool");
    const url="/api/tool/reviews?limit=50"+(toolParam?"&tool_id="+encodeURIComponent(toolParam):"");
    const res=await fetch(url,{credentials:"same-origin"}),data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Não foi possível carregar as avaliações.");
    all=data.reviews||[];render();
  }catch(e){if(root)root.innerHTML='<div class="tool-reviews-empty">'+esc(e.message||"Não foi possível carregar as avaliações.")+'</div>';}
})();
search?.addEventListener("input",render);
document.getElementById("year").textContent=new Date().getFullYear();
})();