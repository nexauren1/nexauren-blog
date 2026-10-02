(() => {
  "use strict";

  const grid=document.querySelector("[data-category-grid]");
  const search=document.querySelector("[data-tool-search]");
  const countEl=document.querySelector("[data-tool-count]");
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const norm=v=>String(v??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
  let language="pt";
  const label=(item,key)=>language==="en"?(item?.[key+"_en"]||item?.[key]||""):(item?.[key]||"");
  const tags=v=>language==="en"?(Array.isArray(v?.tags_en)&&v.tags_en.length?v.tags_en:(v?.tags||[])):(v?.tags||[]);
  const pageTitle=language==="en"?"Tools | Nexauren Story":"Ferramentas | Nexauren Story";
  const pageDescription=language==="en"?"Online tools from Nexauren Story, organized by category.":"Ferramentas online do Nexauren Story, organizadas por categorias.";
  document.title=pageTitle;
  const descriptionMeta=document.querySelector('meta[name="description"]');
  if(descriptionMeta)descriptionMeta.setAttribute("content",pageDescription);

  const iconSvg=id=>({produtividade:"◷",texto:"Aa",imagem:"▧",tecnologia:"⌘",marketplace:"🛒",pdf:"▤",audio:"♫"}[id]||"✦");
  let categories=[],tools=[],isPro=false,user=null,accessApi=null,registryReady=false;

  const categoryCard=c=>'<a class="tool-card category-card cat-'+esc(c.id)+' nx-spotlight nx-reveal" href="'+esc(c.path||("/tool/categories/"+c.id+"/"))+'"><div class="tool-card-top"><span class="tool-card-icon">'+iconSvg(c.id)+'</span><span class="tool-arrow">→</span></div><h2>'+esc(label(c,"name"))+"</h2><p>"+esc(label(c,"description"))+"</p><small>"+Number(c.count||0)+" "+(language==="en"?(Number(c.count||0)===1?"tool":"tools"):(Number(c.count||0)===1?"ferramenta":"ferramentas"))+"</small></a>";

  function renderCategories(list=categories){
    if(!grid)return;
    if(search)search.disabled=false;
    grid.innerHTML=list.length?list.map(categoryCard).join(""):'<div class="tool-empty">Nenhuma categoria encontrada.</div>';
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
    else localStorage.removeItem("nexauren-tool-search");

    if(!q){
      renderCategories(categories);
      return;
    }

    const matchedCategoryIds=new Set(
      categories
        .filter(c=>norm(label(c,"name")+" "+(label(c,"description")||"")).includes(q))
        .map(c=>c.id)
    );
    for(const tool of tools){
      const haystack=norm([label(tool,"name"),label(tool,"description"),tags(tool).join(" "),tool.category].join(" "));
      if(haystack.includes(q))matchedCategoryIds.add(tool.category);
    }

    renderCategories(categories.filter(c=>matchedCategoryIds.has(c.id)));
  }

  async function handleToolClick(event){
    const link=event.target.closest("a[data-tool-id]");
    if(!link||link.dataset.toolAccess!=="premium")return;
    event.preventDefault();
    event.stopPropagation();
    if(link.dataset.toolChecking==="true")return;

    if(!accessApi){
      renderAccessMessage({title:"Tools are starting",body:"Access verification is still starting. Please try again.",actionLabel:"Try again",actionUrl:location.href});
      return;
    }
    if(!user){
      renderAccessMessage({title:"An account is required",body:"Create an account or sign in to your Nexauren account to use the tools.",actionLabel:"Sign in or create an account",actionUrl:"/account"});
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
        renderAccessMessage({title:"Could not verify access",body:"We could not confirm your plan status right now. Please try again.",actionLabel:"Try again",actionUrl:location.href});
        return;
      }
      renderAccessMessage({title:"Pro-only tool",body:"Your current plan does not include this tool. Upgrade to Nexauren Pro to unlock access.",actionLabel:"Go to Pro",actionUrl:accessApi.upgradeUrl()});
    }catch{
      renderAccessMessage({title:"Could not verify access",body:"We could not confirm your plan status right now. Please try again.",actionLabel:"Try again",actionUrl:location.href});
    }finally{
      link.dataset.toolChecking="false";
      link.removeAttribute("aria-busy");
    }
  }

  function applyRegistry(registry){
    tools=registry.tools.filter(t=>t.status==="active");
    categories=registry.categories.map(c=>({...c,count:tools.filter(t=>t.category===c.id).length})).filter(c=>c.count>0||c.showWhenEmpty===true);
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
      if(!registryReady&&grid)grid.innerHTML='<div class="tool-empty">'+esc(e.message||"Could not load the catalog.")+"</div>";
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
  window.addEventListener("nexauren:language-changed",event=>{language=event.detail?.lang==="en"?"en":"pt";if(registryReady)updateSearch()});
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
      if(!registryReady&&grid)grid.innerHTML='<div class="tool-empty">Could not start the tools.</div>';
    }
  })();
})();
