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
  const language=(()=>{const q=new URLSearchParams(location.search).get("lang");if(q==="en")return "en";try{return localStorage.getItem("ns_lang")==="en"?"en":"pt"}catch{return "pt"}})();
  const label=(item,key)=>language==="en"?(item?.[key+"_en"]||item?.[key]||""):(item?.[key]||"");
  const tags=v=>language==="en"?(Array.isArray(v?.tags_en)&&v.tags_en.length?v.tags_en:(v?.tags||[])):(v?.tags||[]);

  const iconSvg=id=>({produtividade:"◷",texto:"Aa",imagem:"▧",tecnologia:"⌘"}[id]||"✦");
  let categories=[],tools=[],isPro=false,user=null,accessApi=null,registryReady=false;

  function toolCard(t){
    const locked=t.access==="premium"&&isPro!==true;
    const badges=(t.featured?'<span class="tool-card-badge featured">Destaque</span>':"")+(t.popular?'<span class="tool-card-badge popular">Popular</span>':"")+(locked?'<span class="tool-card-badge pro">PRO</span>':"");
    return `<a class="tool-card cat-${esc(t.category||"geral")}${locked?" tool-card-locked":""} nx-spotlight nx-reveal" data-tool-id="${esc(t.id)}" data-tool-access="${esc(t.access||"public")}" data-tool-path="${esc(t.path)}" href="${esc(t.path)}"><div class="tool-card-top"><span class="tool-card-icon">${iconSvg(t.category)}</span><span class="tool-arrow">→</span></div><div class="tool-card-badges">${badges}</div><h2>${esc(t.name)}</h2><p>${esc(t.description||"")}</p><small>${esc((t.tags||[]).slice(0,4).join(" · "))}</small>${locked?'<span class="tool-lock" aria-hidden="true">🔒</span>':""}</a>`;
  const categoryCard=c=>'<a class="tool-card category-card cat-'+esc(c.id)+' nx-spotlight nx-reveal" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'"><div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(c.id)+'</span><span class="tool-arrow">→</span></div><h2>'+esc(label(c,"name"))+"</h2><p>"+esc(label(c,"description"))+"</p><small>"+Number(c.count||0)+" "+(language==="en"?(Number(c.count||0)===1?"tool":"tools"):(Number(c.count||0)===1?"ferramenta":"ferramentas"))+"</small></a>';

  const categoryCard=c=>'<a class="tool-card category-card cat-'+esc(c.id)+' nx-spotlight nx-reveal" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'"><div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(c.id)+'</span><span class="tool-arrow">→</span></div><h2>'+esc(c.name)+"</h2><p>"+esc(c.description||"")+"</p><small>"+Number(c.count||0)+" ferramenta(s)</small></a>";

  function renderCategories(list=categories){
    if(!grid)return;
    if(search)search.disabled=false;
    grid.innerHTML=list.length?list.map(categoryCard).join(""):'<div class="tool-empty">Nenhuma categoria encontrada.</div>';
    window.NexaurenUI?.refresh?.();
  }

  function renderResults(list){
    if(resultCount)resultCount.textContent=list.length+(list.length===1?(language==="en"?" tool found":" ferramenta encontrada"):(language==="en"?" tools found":" ferramentas encontradas"));
    liveSection.hidden=!list.length;
    if(resultCount)resultCount.textContent=list.length+(list.length===1?" ferramenta encontrada":" ferramentas encontradas");
    resultsGrid.innerHTML=list.slice(0,24).map(toolCard).join("");
    window.NexaurenUI?.refresh?.();
  }

  function closeAccessDialog(){
    const dialog=document.querySelector("[data-tool-access-dialog]");
    if(dialog)dialog.remove();
    document.documentElement.style.removeProperty("overflow");
    document.body?.style.removeProperty("overflow");
    document.querySelectorAll('[data-tool-id][aria-busy="true"]').forEach(link=>{
      link.removeAttribute("aria-busy");
      link.dataset.toolChecking="false";
    });
  }

  function renderAccessMessage(message){
    closeAccessDialog();
    const el=document.createElement("div");
    el.setAttribute("data-tool-access-dialog","");
    el.className="tool-access-dialog";
    el.innerHTML='<div class="tool-access-dialog-backdrop" data-tool-access-close></div><div class="tool-access-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="tool-access-title"><button class="tool-access-dialog-close" type="button" data-tool-access-close aria-label="Fechar">×</button><span class="tool-access-dialog-icon">🔒</span><div class="tool-eyebrow">NEXAUREN PRO</div><h3 id="tool-access-title">'+esc(message.title)+"</h3><p>"+esc(message.body)+'</p><div class="tool-access-dialog-actions"><a class="primary" href="'+esc(message.actionUrl||"/account")+'">'+esc(message.actionLabel||"Continuar")+'</a><button class="secondary" type="button" data-tool-access-close>Agora não</button></div></div>';
    document.body.appendChild(el);
    const close=()=>{closeAccessDialog();document.removeEventListener("keydown",onKey)};
    const onKey=e=>{if(e.key==="Escape")close()};
    el.querySelectorAll("[data-tool-access-close]").forEach(b=>b.addEventListener("click",close));
    document.addEventListener("keydown",onKey);
  }

  function updateSearch(){
    const q=norm(search?.value||"").trim();
    if(q)localStorage.setItem("nexauren-tool-search",String(search.value).slice(0,100));
    renderCategories(categories.filter(c=>norm(label(c,"name")+" "+(label(c,"description")||"")).includes(q)));
    renderResults(tools.filter(t=>norm([label(t,"name"),label(t,"description"),tags(t).join(" "),t.category].join(" ")).includes(q)));
    renderCategories(categories.filter(c=>norm(c.name+" "+(c.description||"")).includes(q)));
    renderResults(tools.filter(t=>norm([t.name,t.description,(t.tags||[]).join(" "),t.category].join(" ")).includes(q)));
  }

  async function handleToolClick(event){
    const link=event.target.closest("a[data-tool-id]");
    if(!link||link.dataset.toolAccess!=="premium")return;
    event.preventDefault();
    event.stopPropagation();
    if(link.dataset.toolChecking==="true")return;

    if(!accessApi){
      renderAccessMessage({title:"Ferramentas a iniciar",body:"A verificação de acesso ainda está a iniciar. Tente novamente.",actionLabel:"Tentar novamente",actionUrl:location.href});
      return;
    }
    if(!user){
      renderAccessMessage({title:"É necessária uma conta",body:"Crie uma conta ou entre na sua conta Nexauren para usar as ferramentas.",actionLabel:"Entrar ou criar conta",actionUrl:"/account"});
      return;
    }

    link.dataset.toolChecking="true";
    link.setAttribute("aria-busy","true");
    try{
      const result=await accessApi.verifyToolAccess(link.dataset.toolId);
      if(result.unlocked){
        location.href=link.dataset.toolPath;
        return;
      }
      if(result.error){
        renderAccessMessage({title:"Não foi possível verificar o acesso",body:"Não conseguimos confirmar o estado do seu plano agora. Tente novamente.",actionLabel:"Tentar novamente",actionUrl:location.href});
        return;
      }
      renderAccessMessage({title:"Ferramenta exclusiva do Pro",body:"O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.",actionLabel:"Ir para o plano Pro",actionUrl:accessApi.upgradeUrl()});
    }catch{
      renderAccessMessage({title:"Não foi possível verificar o acesso",body:"Não conseguimos confirmar o estado do seu plano agora. Tente novamente.",actionLabel:"Tentar novamente",actionUrl:location.href});
    }finally{
      link.dataset.toolChecking="false";
      link.removeAttribute("aria-busy");
    }
  }

  function applyRegistry(registry){
    tools=registry.tools.filter(t=>t.status==="active");
    categories=registry.categories.map(c=>({...c,count:tools.filter(t=>t.category===c.id).length}));
    registryReady=true;
    if(countEl)countEl.textContent=tools.length;
    const stored=localStorage.getItem("nexauren-tool-search")||"";
    if(search&&stored)search.value=stored;
    updateSearch();
  }

  async function loadCatalog(){
    const cached=window.NexaurenToolRegistry.getCachedRegistry?.();
    if(cached)applyRegistry(cached);
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry();
      applyRegistry(registry);
    }catch(e){
      if(!registryReady&&grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Não foi possível carregar o catálogo.")+"</div>";
    }
  }

  async function refreshPlan(force=false){
    if(!user||!accessApi)return;
    try{
      const plan=await accessApi.getPlanState({force});
      isPro=plan.pro===true;
      updateSearch();
    }catch{
      isPro=false;
      updateSearch();
    }
  }

  document.addEventListener("click",handleToolClick,true);
  search?.addEventListener("input",updateSearch);
  window.addEventListener("nexauren:tool-registry-updated",event=>{if(event.detail)applyRegistry(event.detail)});
  window.addEventListener("pageshow",()=>{closeAccessDialog();if(user)refreshPlan(true)});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){closeAccessDialog();if(user)refreshPlan(true)}});

  (async()=>{
    try{
      const cached=window.NexaurenToolRegistry.getCachedRegistry?.();
      if(cached)applyRegistry(cached);
      loadCatalog();

      accessApi=await import("/tool/frontend/tool-access.js?v=20260923-access-4");
      accessApi.onAuthStateChanged(accessApi.auth,async currentUser=>{
        user=currentUser;
        isPro=false;
        updateSearch();
        if(user)await refreshPlan(false);
      });
    }catch(e){
      if(!registryReady&&grid)grid.innerHTML='<div class="tool-empty">Não foi possível iniciar as ferramentas.</div>';
    }
  })();
})();
