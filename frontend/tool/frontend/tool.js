(() => {
  "use strict";

  const grid=document.querySelector("[data-category-grid]");
  const search=document.querySelector("[data-tool-search]");
  const countEl=document.querySelector("[data-tool-count]");
  const liveSection=document.querySelector("[data-tool-live-results]");
  const resultsGrid=document.querySelector("[data-tool-results]");
  const resultCount=document.querySelector("[data-tool-result-count]");
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const norm=v=>String(v??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");

  const iconSvg=id=>({produtividade:"◷",texto:"Aa",imagem:"▧",tecnologia:"⌘"}[id]||"✦");
  let categories=[],tools=[],isPro=null,user=null,accessApi=null,loading=false;

  function toolCard(t){
    const locked=t.access==="premium"&&isPro===false;
    const badges=(t.featured?'<span class="tool-card-badge featured">Destaque</span>':"")+(t.popular?'<span class="tool-card-badge popular">Popular</span>':"")+(locked?'<span class="tool-card-badge pro">PRO</span>':"");
    return '<a class="tool-card cat-'+esc(t.category||"geral")+(locked?" tool-card-locked":"")+' nx-spotlight nx-reveal" data-tool-id="'+esc(t.id)+'" data-tool-access="'+esc(t.access||"public")+'" data-tool-path="'+esc(t.path)+'" href="'+esc(t.path)+'">'+'<div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(t.category)+'</span><span class="tool-arrow">→</span></div>'+'<div class="tool-card-badges">'+badges+'</div><h2>'+esc(t.name)+'</h2><p>'+esc(t.description||"")+'</p><small>'+esc((t.tags||[]).slice(0,4).join(" · "))+'</small>'+(locked?'<span class="tool-lock" aria-hidden="true">🔒</span>':"")+'</a>';
  }
  const categoryCard=c=>'<a class="tool-card category-card cat-'+esc(c.id)+' nx-spotlight nx-reveal" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'"><div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(c.id)+'</span><span class="tool-arrow">→</span></div><h2>'+esc(c.name)+'</h2><p>'+esc(c.description||"")+'</p><small>'+Number(c.count||0)+' ferramenta(s)</small></a>';
  function renderAccountGate(){
    if(!grid)return;
    if(search){search.disabled=true;search.value="";}
    grid.innerHTML='<div class="tool-account-gate"><div class="tool-access-icon">⌁</div><h3>Crie uma conta para usar as ferramentas</h3><p>As ferramentas Nexauren estão disponíveis apenas para utilizadores autenticados.</p><a class="primary" href="/account">Entrar ou criar conta</a></div>';
    if(liveSection)liveSection.hidden=true;if(countEl)countEl.textContent="—";
  }
  function renderCategories(list=categories){if(!grid)return;if(search)search.disabled=false;grid.innerHTML=list.length?list.map(categoryCard).join(""):'<div class="tool-empty">Nenhuma categoria encontrada.</div>';window.NexaurenUI?.refresh?.();}
  function renderResults(list){if(!liveSection||!resultsGrid)return;liveSection.hidden=!list.length;if(resultCount)resultCount.textContent=list.length+(list.length===1?" ferramenta encontrada":" ferramentas encontradas");resultsGrid.innerHTML=list.slice(0,24).map(toolCard).join("");window.NexaurenUI?.refresh?.();}
  function renderAccessMessage(message){document.querySelector("[data-tool-access-dialog]")?.remove();const el=document.createElement("div");el.setAttribute("data-tool-access-dialog","");el.className="tool-access-dialog";el.innerHTML='<div class="tool-access-dialog-backdrop" data-tool-access-close></div><div class="tool-access-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="tool-access-title"><button class="tool-access-dialog-close" type="button" data-tool-access-close aria-label="Fechar">×</button><span class="tool-access-dialog-icon">🔒</span><div class="tool-eyebrow">NEXAUREN PRO</div><h3 id="tool-access-title">'+esc(message.title)+'</h3><p>'+esc(message.body)+'</p><div class="tool-access-dialog-actions"><a class="primary" href="'+esc(message.actionUrl||"/account")+'">'+esc(message.actionLabel||"Continuar")+'</a><button class="secondary" type="button" data-tool-access-close>Agora não</button></div></div>';document.body.appendChild(el);const close=()=>el.remove();el.querySelectorAll("[data-tool-access-close]").forEach(b=>b.addEventListener("click",close));const onKey=e=>{if(e.key==="Escape"){close();document.removeEventListener("keydown",onKey)}};document.addEventListener("keydown",onKey);}
  function updateSearch(){const q=norm(search?.value||"").trim();if(q)localStorage.setItem("nexauren-tool-search",String(search.value).slice(0,100));else localStorage.removeItem("nexauren-tool-search");if(!q){renderCategories();renderResults([]);return}renderCategories(categories.filter(c=>norm(c.name+" "+(c.description||"")).includes(q)));renderResults(tools.filter(t=>norm([t.name,t.description,(t.tags||[]).join(" "),t.category].join(" ")).includes(q)));}
  async function handleToolClick(event){const link=event.target.closest("a[data-tool-id]");if(!link||link.dataset.toolAccess!=="premium")return;event.preventDefault();event.stopPropagation();if(!user){renderAccessMessage({title:"É necessária uma conta",body:"Crie uma conta ou entre na sua conta Nexauren para usar as ferramentas.",actionLabel:"Entrar ou criar conta",actionUrl:"/account"});return}if(loading)return;loading=true;try{const result=await accessApi.verifyToolAccess(link.dataset.toolId);if(result.unlocked){location.href=link.dataset.toolPath;return}if(result.error){renderAccessMessage({title:"Não foi possível verificar o acesso",body:"Não conseguimos confirmar o estado do seu plano agora. Tente novamente.",actionLabel:"Tentar novamente",actionUrl:location.href});return}renderAccessMessage({title:"Ferramenta exclusiva do Pro",body:"O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.",actionLabel:"Ir para o plano Pro",actionUrl:accessApi.upgradeUrl()});}finally{loading=false}}
  function applyRegistry(registry){tools=registry.tools.filter(t=>t.status==="active");categories=registry.categories.map(c=>({...c,count:tools.filter(t=>t.category===c.id).length}));if(countEl)countEl.textContent=tools.length;const stored=localStorage.getItem("nexauren-tool-search")||"";if(search&&stored)search.value=stored;if(search&&stored)updateSearch();else{renderCategories();renderResults([])}}
  async function loadCatalog(){if(!user){if(!categories.length)renderAccountGate();return}const cached=window.NexaurenToolRegistry.getCachedRegistry?.();if(cached)applyRegistry(cached);try{const [registry,plan]=await Promise.all([window.NexaurenToolRegistry.loadRegistry(),accessApi.getPlanState({force:false})]);applyRegistry(registry);isPro=plan.pro;updateSearch();}catch(e){if(!categories.length)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Não foi possível carregar o catálogo.")+'</div>';}}
  async function refreshPlan(){if(!user)return;try{const plan=await accessApi.getPlanState({force:true});isPro=plan.pro;updateSearch()}catch{}}

  document.addEventListener("click",handleToolClick,true);search?.addEventListener("input",updateSearch);window.addEventListener("nexauren:tool-registry-updated",event=>{if(event.detail)applyRegistry(event.detail)});window.addEventListener("pageshow",()=>{if(user)refreshPlan()});document.addEventListener("visibilitychange",()=>{if(!document.hidden&&user)refreshPlan()});

  (async()=>{
    try{
      accessApi=await import("/tool/frontend/tool-access.js?v=20260923-access-3");
      const cached=window.NexaurenToolRegistry.getCachedRegistry?.();
      if(cached)applyRegistry(cached);
      accessApi.onAuthStateChanged(accessApi.auth,async currentUser=>{user=currentUser;if(!user){isPro=null;tools=[];return}await loadCatalog();refreshPlan();});
    }catch(e){if(!categories.length&&grid)grid.innerHTML='<div class="tool-empty">Não foi possível iniciar a autenticação das ferramentas.</div>';}
  })();
})();
