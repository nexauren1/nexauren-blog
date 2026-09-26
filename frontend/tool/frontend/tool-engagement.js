(()=>{"use strict";
const API_BASE="/api/tool";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const pathOf=v=>{try{const u=new URL(v,location.origin);return u.pathname.replace(/\/+$/,"")||"/";}catch{return String(v||"").replace(/\/+$/,"")||"/";}};
let registry=null,user=null,auth=null,workerFetch=null,engagement={};
let modal=null;

function stars(value){const n=Math.round(Number(value||0));return '<span class="tool-rating-stars" aria-label="'+(Number(value||0).toFixed(1))+' de 5">'+[1,2,3,4,5].map(i=>'<span class="'+(i<=n?"on":"off")+'">★</span>').join("")+'</span>';}
function metaFor(id){return engagement[id]||{tool_id:id,avg_rating:0,review_count:0,favorite_count:0,my_favorite:false,my_review:null};}
function accountUrl(){return "/account?return="+encodeURIComponent(location.pathname+location.search+location.hash);}
function ensureAuthScript(){
  if(auth!==null)return Promise.resolve();
  return import("/account/account-client.js?v=20260926-2").then(mod=>{
    auth=mod.auth;workerFetch=mod.workerFetch;
    mod.onAuthStateChanged(auth,current=>{user=current||null;refreshEngagement(true);});
  }).catch(()=>{auth=null;workerFetch=null;});
}
async function requestPublic(ids,withAuth){
  const params=new URLSearchParams({tool_ids:ids.join(",")});
  const url=API_BASE+"/engagement?"+params.toString();
  if(withAuth&&user){
    const token=await user.getIdToken();
    const r=await fetch(url,{credentials:"same-origin",headers:{Authorization:"Bearer "+token}});
    const d=await r.json();if(r.ok)return d;
  }
  const r=await fetch(url,{credentials:"same-origin"});return r.json();
}
async function refreshEngagement(forceAuth=false){
  if(!registry)return;
  const ids=[...new Set((registry.tools||[]).filter(t=>t.status==="active").map(t=>t.id))].slice(0,100);
  if(!ids.length)return;
  try{const d=await requestPublic(ids,forceAuth||!!user);if(d?.items)engagement={...engagement,...d.items};renderEverything();}catch{}
}
function getTool(id){return registry?.tools?.find(t=>t.id===id&&t.status==="active")||null;}
function attachNav(){
  $$(".tool-links").forEach(nav=>{
    if(nav.querySelector('a[href="/tool/avaliacoes/"]'))return;
    const a=document.createElement("a");a.href="/tool/avaliacoes/";a.textContent="Avaliações";nav.appendChild(a);
  });
  $$(".tool-mobile .tool-wrap").forEach(nav=>{
    if(nav.querySelector('a[href="/tool/avaliacoes/"]'))return;
    const a=document.createElement("a");a.href="/tool/avaliacoes/";a.textContent="Avaliações";nav.appendChild(a);
  });
}
function makeBar(toolId,mode){
  const host=document.createElement("div");
  host.className="tool-engagement";
  host.dataset.toolEngagement=toolId;
  host.dataset.mode=mode;
  return host;
}
function renderBar(host){
  const id=host.dataset.toolEngagement, m=metaFor(id), mine=m.my_review;
  host.innerHTML='<div class="tool-engagement-rating">'+stars(m.avg_rating)+'<span class="tool-rating-number">'+(m.review_count?Number(m.avg_rating||0).toFixed(1):"Sem avaliações")+'</span><span class="tool-rating-count">'+(Number(m.review_count||0)==1?"1 avaliação":Number(m.review_count||0)+" avaliações")+'</span></div><div class="tool-engagement-actions"><button type="button" class="tool-favorite-btn '+(m.my_favorite?"is-active":"")+'" data-eng-favorite="'+esc(id)+'"><span>♥</span><span>'+(m.my_favorite?"Favorito":"Favoritar")+'</span><small>'+Number(m.favorite_count||0)+'</small></button><button type="button" class="tool-review-btn" data-eng-review="'+esc(id)+'">★ <span>'+(mine?"Editar avaliação":"Avaliar")+'</span></button></div>';
}
function renderCards(){
  $$(".tool-card[data-tool-id]").forEach(card=>{
    if(!card.parentElement?.matches(".tool-engagement-item")){
      const wrap=document.createElement("div");
      wrap.className="tool-engagement-item";
      card.parentNode.insertBefore(wrap,card);wrap.appendChild(card);wrap.appendChild(makeBar(card.dataset.toolId,"card"));
    }
  });
  attachNav();
  $$(".tool-engagement").forEach(renderBar);
}
function renderIndividual(){
  if(!registry)return;
  const clean=pathOf(location.pathname);
  const tool=registry.tools?.find(t=>t.status==="active"&&pathOf(t.path)===clean);
  if(!tool||!/^\/tool\/categories\//.test(clean))return;
  let panel=document.querySelector("[data-tool-engagement-hero]");
  if(!panel){
    panel=document.createElement("section");panel.className="tool-engagement-hero";panel.setAttribute("data-tool-engagement-hero",tool.id);
    const main=$("main");
    if(!main)return;
    const ad=main.querySelector(".nx-auto-ad.top");
    if(ad?.parentNode)ad.after(panel);else main.insertBefore(panel,main.firstElementChild||null);
  }
  panel.innerHTML='<div><div class="tool-engagement-kicker">AVALIAÇÕES</div><div class="tool-engagement-title"><strong>'+esc(tool.name||"Ferramenta")+'</strong><span>'+stars(metaFor(tool.id).avg_rating)+' <b>'+ (metaFor(tool.id).review_count?Number(metaFor(tool.id).avg_rating||0).toFixed(1):"—")+'</b> · '+Number(metaFor(tool.id).review_count||0)+' avaliação(ões)</span></div></div><div class="tool-engagement-actions"><button type="button" class="tool-favorite-btn '+(metaFor(tool.id).my_favorite?"is-active":"")+'" data-eng-favorite="'+esc(tool.id)+'">♥ '+(metaFor(tool.id).my_favorite?"Favorito":"Favoritar")+' <small>'+Number(metaFor(tool.id).favorite_count||0)+'</small></button><button type="button" class="tool-review-btn" data-eng-review="'+esc(tool.id)+'">★ '+(metaFor(tool.id).my_review?"Editar avaliação":"Avaliar ferramenta")+'</button><a class="tool-reviews-link" href="/tool/avaliacoes/?tool='+encodeURIComponent(tool.id)+'">Ver avaliações</a></div>';
}
function renderEverything(){renderCards();renderIndividual();}

function closeModal(){modal?.remove();modal=null;document.documentElement.style.removeProperty("overflow");}
function openReview(id){
  const tool=getTool(id);if(!tool)return;
  if(!user){location.href=accountUrl();return;}
  const m=metaFor(id),mine=m.my_review||{};
  closeModal();
  modal=document.createElement("div");modal.className="tool-review-modal";
  modal.innerHTML='<div class="tool-review-backdrop" data-review-close></div><div class="tool-review-dialog" role="dialog" aria-modal="true" aria-labelledby="tool-review-title"><button type="button" class="tool-review-close" data-review-close>×</button><div class="tool-engagement-kicker">AVALIAR FERRAMENTA</div><h2 id="tool-review-title">'+esc(tool.name||"Ferramenta")+'</h2><div class="tool-review-stars-input" role="radiogroup" aria-label="Classificação de 1 a 5 estrelas">'+[1,2,3,4,5].map(i=>'<button type="button" class="'+(Number(mine.rating||0)===i?"active":"")+'" data-rating="'+i+'" aria-label="'+i+' estrela'+(i>1?"s":"")+'">★</button>').join("")+'</div><input type="hidden" id="tool-review-rating" value="'+Number(mine.rating||5)+'"><label>Comentário <span>(opcional)</span><textarea id="tool-review-body" maxlength="2000" placeholder="Conte como foi a sua experiência…">'+esc(mine.body||"")+'</textarea></label><div class="tool-review-visibility"><strong>Como quer aparecer?</strong><label><input type="radio" name="tool-review-display" value="profile" '+((mine.display_mode||"profile")==="profile"?"checked":"")+'> Mostrar o meu perfil</label><label><input type="radio" name="tool-review-display" value="anonymous" '+(mine.display_mode==="anonymous"?"checked":"")+'> Mostrar como anónimo</label><input id="tool-review-anonymous-name" maxlength="40" placeholder="Nome anónimo" value="'+esc(mine.anonymous_name||"")+'" '+(mine.display_mode==="anonymous"?"":"hidden")+'></div><div class="tool-review-feedback" id="tool-review-feedback"></div><div class="tool-review-footer"><button type="button" class="secondary" data-review-close>Cancelar</button><button type="button" class="primary" id="tool-review-save">Guardar avaliação</button></div></div>';
  document.body.appendChild(modal);document.documentElement.style.overflow="hidden";
  const rating=document.getElementById("tool-review-rating"),anon=document.getElementById("tool-review-anonymous-name");
  $$(".tool-review-stars-input [data-rating]",modal).forEach(b=>b.onclick=()=>{$$(".tool-review-stars-input [data-rating]",modal).forEach(x=>x.classList.toggle("active",Number(x.dataset.rating)<=Number(b.dataset.rating)));rating.value=b.dataset.rating;});
  $$('input[name="tool-review-display"]',modal).forEach(r=>r.onchange=()=>{anon.hidden=r.value!=="anonymous"||!r.checked;if(r.checked&&r.value==="anonymous")anon.focus();});
  $$("[data-review-close]",modal).forEach(b=>b.onclick=closeModal);
  $("#tool-review-save",modal).onclick=async()=>{
    const fb=$("#tool-review-feedback",modal),btn=$("#tool-review-save",modal),mode=$('input[name="tool-review-display"]:checked',modal)?.value||"profile";
    const body=$("#tool-review-body",modal).value.trim(),anonymousName=anon.value.trim(),ratingValue=Number(rating.value);
    if(!Number.isInteger(ratingValue)||ratingValue<1||ratingValue>5){fb.textContent="Escolha de 1 a 5 estrelas.";return;}
    if(mode==="anonymous"&&(anonymousName.length<2||anonymousName.length>40)){fb.textContent="Escolha um nome anónimo entre 2 e 40 caracteres.";anon.focus();return;}
    btn.disabled=true;fb.textContent="A guardar…";
    try{await workerFetch("/api/tool/reviews",{method:"POST",body:JSON.stringify({tool_id:id,rating:ratingValue,body,display_mode:mode,anonymous_name:anonymousName})});closeModal();await refreshEngagement(true);}
    catch(e){fb.textContent=e.message||"Não foi possível guardar a avaliação.";btn.disabled=false;}
  };
}
async function toggleFavorite(id){
  if(!user){location.href=accountUrl();return;}
  const m=metaFor(id);
  try{const d=await workerFetch("/api/tool/favorites",{method:"POST",body:JSON.stringify({tool_id:id,favorite:!m.my_favorite})});engagement[id]={...m,my_favorite:d.favorite,favorite_count:Number(d.favorite_count||0)};renderEverything();}
  catch(e){alert(e.message||"Não foi possível atualizar o favorito.");}
}
document.addEventListener("click",e=>{
  const fav=e.target.closest("[data-eng-favorite]");if(fav){e.preventDefault();e.stopPropagation();toggleFavorite(fav.dataset.engFavorite);return;}
  const review=e.target.closest("[data-eng-review]");if(review){e.preventDefault();e.stopPropagation();openReview(review.dataset.engReview);}
});
(async()=>{
  try{
    const [registryModule]=await Promise.all([import("/tool/categories/category.js?v=20260925-static-2"),ensureAuthScript()]);
    registry=registryModule?.default||window.NexaurenToolRegistry?.getCachedRegistry?.()||null;
  }catch{
    try{registry=window.NexaurenToolRegistry?.getCachedRegistry?.()||null;}catch{}
  }
  if(!registry&&window.NexaurenToolRegistry?.getCachedRegistry)registry=window.NexaurenToolRegistry.getCachedRegistry();
  attachNav();
  const cached=window.NexaurenToolRegistry?.getCachedRegistry?.();
  if(cached)registry=cached;
  const load=async()=>{try{registry=await window.NexaurenToolRegistry.loadRegistry();renderEverything();await refreshEngagement(false);}catch{}};
  if(window.NexaurenToolRegistry?.loadRegistry)load();else renderEverything();
  new MutationObserver(()=>renderCards()).observe(document.body,{childList:true,subtree:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshEngagement(!!user);});
})();
})();