(() => {
  "use strict";

  const root=document.querySelector("[data-category-page]");
  const slug=document.body.dataset.category;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const normalize=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

  const language=(()=>{const q=new URLSearchParams(location.search).get("lang");if(q==="en")return "en";try{return localStorage.getItem("ns_lang")==="en"?"en":"pt"}catch{return "pt"}})();
  const label=(item,key)=>language==="en"?(item?.[key+"_en"]||item?.[key]||""):(item?.[key]||"");
  const localizedTags=item=>language==="en"?(Array.isArray(item?.tags_en)&&item.tags_en.length?item.tags_en:(item?.tags||[])):(item?.tags||[]);
  const ui=Object.freeze(language==="en" ? {
    tools:"Tools",
    tool:"tool",
    toolsPlural:"tools",
    category:"CATEGORY",
    allCategories:"All categories",
    categoryTools:"Category tools",
    advancedSearch:"Advanced tool search",
    searchPlaceholder:"Search by name, function, description, or keyword…",
    clearSearch:"Clear search",
    filterKeyword:"Filter by keyword",
    filterAccess:"Filter by access",
    allKeywords:"All keywords",
    allAccess:"All access",
    free:"Free",
    pro:"Pro",
    sort:"Sort results",
    relevance:"Most relevant",
    featured:"Featured",
    popular:"Most popular",
    name:"Name A–Z",
    clearFilters:"Clear filters",
    noTools:"No tools found.",
    noToolsHint:"Try another term, remove a filter, or search by feature.",
    ready:"The category is ready.",
    empty:"No tools have been published here yet.",
    accountTitle:"Create an account to use the tools",
    accountBody:"Nexauren tools are available only to authenticated users.",
    signIn:"Sign in or create an account",
    featuredBadge:"Featured",
    proOnly:"Pro-only tool",
    accountRequired:"An account is required",
    accountRequiredBody:"Create an account or sign in to your Nexauren account to use the tools.",
    cannotVerify:"Could not verify access",
    cannotVerifyBody:"We couldn't confirm your plan status right now. Please try again.",
    proTitle:"Pro-only tool",
    proBody:"Your current plan does not include this tool. Upgrade to Nexauren Pro to unlock access.",
    goPro:"Go to Pro",
    notNow:"Not now",
    unavailable:"Could not load the catalog.",
    tryAgain:"Try again",
    unavailableInit:"Could not start the tools."
  } : {
    tools:"Ferramentas",
    tool:"ferramenta",
    toolsPlural:"ferramentas",
    category:"CATEGORIA",
    allCategories:"Todas as categorias",
    categoryTools:"Ferramentas da categoria",
    advancedSearch:"Pesquisa avançada de ferramentas",
    searchPlaceholder:"Pesquisar por nome, função, descrição ou palavra-chave…",
    clearSearch:"Limpar pesquisa",
    filterKeyword:"Filtrar por palavra-chave",
    filterAccess:"Filtrar por acesso",
    allKeywords:"Todas as palavras-chave",
    allAccess:"Todos os acessos",
    free:"Grátis",
    pro:"Pro",
    sort:"Ordenar resultados",
    relevance:"Mais relevantes",
    featured:"Em destaque",
    popular:"Mais populares",
    name:"Nome A–Z",
    clearFilters:"Limpar filtros",
    noTools:"Nenhuma ferramenta encontrada.",
    noToolsHint:"Tente outro termo, remova um filtro ou pesquise por uma funcionalidade.",
    ready:"A categoria está pronta.",
    empty:"Ainda não existem ferramentas publicadas aqui.",
    accountTitle:"Crie uma conta para usar as ferramentas",
    accountBody:"As ferramentas Nexauren estão disponíveis apenas para utilizadores autenticados.",
    signIn:"Entrar ou criar conta",
    featuredBadge:"Destaque",
    proOnly:"Ferramenta exclusiva do Pro",
    accountRequired:"É necessária uma conta",
    accountRequiredBody:"Crie uma conta ou entre na sua conta Nexauren para usar as ferramentas.",
    cannotVerify:"Não foi possível verificar o acesso",
    cannotVerifyBody:"Não conseguimos confirmar o estado do seu plano agora. Tente novamente.",
    proTitle:"Ferramenta exclusiva do Pro",
    proBody:"O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.",
    goPro:"Ir para o plano Pro",
    notNow:"Agora não",
    unavailable:"Não foi possível carregar o catálogo.",
    tryAgain:"Tente novamente",
    unavailableInit:"Não foi possível iniciar as ferramentas."
  });

  const iconSvg=value=>value==="Aa"||value==="text"
    ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 17 4-10h2l4 10M8 13.5h6M16 17l1.8-4.5L20 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';

  let state={tools:[],query:"",tag:"",access:"all",sort:"relevance"};
  let isPro=null,user=null,accessApi=null;

  const scoreTool=(tool,query)=>{
    const q=normalize(query),tokens=q.split(/\s+/).filter(Boolean);
    if(!tokens.length)return 0;
    const name=normalize(label(tool,"name"));
    const desc=normalize(label(tool,"description"));
    const tagList=localizedTags(tool).map(normalize);
    let score=0;
    tokens.forEach(token=>{
      if(name===token)score+=120;else if(name.startsWith(token))score+=80;else if(name.includes(token))score+=55;
      if(tagList.some(tag=>tag===token))score+=75;else if(tagList.some(tag=>tag.includes(token)))score+=40;
      if(desc.includes(token))score+=18;
      if(normalize(tool.id).includes(token))score+=25;
    });
    if(name===q)score+=200;
    if(name.startsWith(q))score+=100;
    return score;
  };

  const card=tool=>{
    const locked=tool.access==="premium"&&isPro===false;
    const badges=(tool.featured?'<span class="tool-card-badge featured">'+ui.featuredBadge+'</span>':"")+(tool.popular?'<span class="tool-card-badge popular">'+ui.popular+'</span>':"")+(locked?'<span class="tool-card-badge pro">PRO</span>':"");
    return '<a class="tool-card cat-'+esc(tool.category||slug)+' nx-spotlight nx-reveal'+(locked?" tool-card-locked":"")+'" data-tool-id="'+esc(tool.id)+'" data-tool-access="'+esc(tool.access||"public")+'" data-tool-path="'+esc(tool.path)+'" href="'+esc(tool.path)+'">'+
      '<span class="tool-card-icon">'+iconSvg(tool.icon)+'</span><span class="tool-arrow">→</span>'+
      '<div class="tool-card-badges">'+badges+'</div>'+
      '<h2>'+esc(label(tool,"name"))+'</h2><p>'+esc(label(tool,"description")||"")+'</p>'+
      '<small>'+esc(localizedTags(tool).slice(0,4).join(" · "))+'</small>'+
      (locked?'<b class="tool-search-premium">PRO</b><span class="tool-lock" aria-hidden="true">🔒</span>':"")+
      '</a>';
  };

  function accountGate(){
    root.innerHTML='<section class="tool-results"><div class="tool-account-gate"><div class="tool-access-icon">⌁</div><h3>'+ui.accountTitle+'</h3><p>'+ui.accountBody+'</p><a class="primary" href="/account">'+ui.signIn+'</a></div></section>';
  }

  function showAccessMessage(data){
    document.querySelector("[data-tool-access-dialog]")?.remove();
    const el=document.createElement("div");
    el.setAttribute("data-tool-access-dialog","");
    el.className="tool-access-dialog";
    el.innerHTML='<div class="tool-access-dialog-backdrop" data-tool-access-close></div><div class="tool-access-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="category-tool-access-title"><button class="tool-access-dialog-close" type="button" data-tool-access-close aria-label="'+esc(ui.notNow)+'">×</button><span class="tool-access-dialog-icon">🔒</span><div class="tool-eyebrow">NEXAUREN PRO</div><h3 id="category-tool-access-title">'+esc(data.title)+'</h3><p>'+esc(data.body)+'</p><div class="tool-access-dialog-actions"><a class="primary" href="'+esc(data.actionUrl||"/account")+'">'+esc(data.actionLabel||ui.signIn)+'</a><button class="secondary" type="button" data-tool-access-close>'+esc(ui.notNow)+'</button></div></div>';
    document.body.appendChild(el);
    const close=()=>{el.remove();document.removeEventListener("keydown",onKey)};
    const onKey=e=>{if(e.key==="Escape")close()};
    el.querySelectorAll("[data-tool-access-close]").forEach(button=>button.addEventListener("click",close));
    document.addEventListener("keydown",onKey);
  }

  function toolResults(){
    const q=state.query;
    let results=state.tools.filter(tool=>{
      const tagOk=!state.tag||localizedTags(tool).some(tag=>normalize(tag)===normalize(state.tag));
      const accessOk=state.access==="all"||String(tool.access||"public")===state.access;
      return tagOk&&accessOk;
    }).map(tool=>({tool,score:scoreTool(tool,q)}));
    if(q)results=results.filter(item=>item.score>0);
    results.sort((a,b)=>{
      if(state.sort==="name")return normalize(label(a.tool,"name")).localeCompare(normalize(label(b.tool,"name")),language);
      if(state.sort==="popular")return Number(b.tool.popular)-Number(a.tool.popular)||b.score-a.score;
      if(state.sort==="featured")return Number(b.tool.featured)-Number(a.tool.featured)||b.score-a.score;
      return b.score-a.score||Number(a.tool.sortOrder||999)-Number(b.tool.sortOrder||999);
    });
    return results.map(item=>item.tool);
  }

  function renderResults(){
    const grid=root.querySelector("[data-category-results]");
    const count=root.querySelector("[data-category-result-count]");
    const empty=root.querySelector("[data-category-empty]");
    if(!grid||!count||!empty)return;
    const results=toolResults();
    count.textContent=results.length+" "+(language==="en"?"of ":"de ")+state.tools.length+(state.tools.length===1?" "+ui.tool:" "+ui.toolsPlural);
    grid.innerHTML=results.map(card).join("");
    empty.hidden=results.length>0;
    empty.innerHTML=state.query||state.tag||state.access!=="all"
      ? "<strong>"+ui.noTools+"</strong><br>"+ui.noToolsHint
      : "<strong>"+ui.ready+"</strong><br>"+ui.empty;
    grid.hidden=results.length===0;
    window.NexaurenUI?.refresh?.();
  }

  function buildSearch(){
    const keywords=[...new Set(state.tools.flatMap(tool=>localizedTags(tool)||[]))].sort((a,b)=>normalize(a).localeCompare(normalize(b),language));
    const params=new URLSearchParams(location.search);
    state.query=params.get("q")||"";
    state.tag=params.get("tag")||"";
    state.access=params.get("access")||"all";
    state.sort=params.get("sort")||"relevance";
    const host=root.querySelector("[data-category-search]");
    if(!host)return;
    host.innerHTML='<div class="tool-advanced-search"><div class="tool-search-main"><span aria-hidden="true">⌕</span><input data-category-search-input type="search" value="'+esc(state.query)+'" placeholder="'+esc(ui.searchPlaceholder)+'" autocomplete="off"><button type="button" data-category-clear aria-label="'+esc(ui.clearSearch)+'">×</button></div><div class="tool-search-controls"><select data-category-tag aria-label="'+esc(ui.filterKeyword)+'"><option value="">'+esc(ui.allKeywords)+'</option>'+keywords.map(keyword=>'<option value="'+esc(keyword)+'">'+esc(keyword)+'</option>').join("")+'</select><select data-category-access aria-label="'+esc(ui.filterAccess)+'"><option value="all">'+esc(ui.allAccess)+'</option><option value="public">'+esc(ui.free)+'</option><option value="premium">'+esc(ui.pro)+'</option></select><select data-category-sort aria-label="'+esc(ui.sort)+'"><option value="relevance">'+esc(ui.relevance)+'</option><option value="featured">'+esc(ui.featured)+'</option><option value="popular">'+esc(ui.popular)+'</option><option value="name">'+esc(ui.name)+'</option></select></div><div class="tool-search-meta"><span data-category-result-count></span><button type="button" data-category-reset>'+esc(ui.clearFilters)+'</button></div></div>';

    const input=root.querySelector("[data-category-search-input]");
    const tag=root.querySelector("[data-category-tag]");
    const access=root.querySelector("[data-category-access]");
    const sort=root.querySelector("[data-category-sort]");
    tag.value=state.tag;access.value=state.access;sort.value=state.sort;
    input.addEventListener("input",()=>{state.query=input.value;updateUrl();renderResults()});
    tag.addEventListener("change",event=>{state.tag=event.target.value;updateUrl();renderResults()});
    access.addEventListener("change",event=>{state.access=event.target.value;updateUrl();renderResults()});
    sort.addEventListener("change",event=>{state.sort=event.target.value;updateUrl();renderResults()});
    root.querySelector("[data-category-clear]").addEventListener("click",()=>{state.query="";input.value="";input.focus();updateUrl();renderResults()});
    root.querySelector("[data-category-reset]").addEventListener("click",()=>{state={...state,query:"",tag:"",access:"all",sort:"relevance"};input.value="";tag.value="";access.value="all";sort.value="relevance";updateUrl();renderResults();input.focus()});
    input.addEventListener("keydown",event=>{if(event.key==="Escape"){state.query="";input.value="";updateUrl();renderResults();input.blur()}});
    document.addEventListener("keydown",event=>{if(event.key!=="/"||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;event.preventDefault();input.focus()});
    renderResults();
  }

  function updateUrl(){
    const params=new URLSearchParams();
    if(language==="en")params.set("lang","en");
    if(state.query)params.set("q",state.query);
    if(state.tag)params.set("tag",state.tag);
    if(state.access!=="all")params.set("access",state.access);
    if(state.sort!=="relevance")params.set("sort",state.sort);
    history.replaceState(null,"",location.pathname+(params.toString()?"?"+params.toString():""));
  }

  async function handleToolClick(event){
    const link=event.target.closest("a[data-tool-id]");
    if(!link||link.dataset.toolAccess!=="premium")return;
    event.preventDefault();
    event.stopPropagation();
    if(!user){
      showAccessMessage({title:ui.accountRequired,body:ui.accountRequiredBody,actionLabel:ui.signIn,actionUrl:"/account"});
      return;
    }
    try{
      const result=await accessApi.verifyToolAccess(link.dataset.toolId);
      if(result.unlocked){location.href=link.dataset.toolPath+(language==="en"?"?lang=en":"");return}
      if(result.error){
        showAccessMessage({title:ui.cannotVerify,body:ui.cannotVerifyBody,actionLabel:ui.tryAgain,actionUrl:location.href});
        return;
      }
      showAccessMessage({title:ui.proTitle,body:ui.proBody,actionLabel:ui.goPro,actionUrl:"/account"});
    }catch{
      showAccessMessage({title:ui.cannotVerify,body:ui.cannotVerifyBody,actionLabel:ui.tryAgain,actionUrl:location.href});
    }
  }

  function render(registry){
    const cat=window.NexaurenToolRegistry.getCategory(registry,slug);
    if(!cat){
      root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>'+esc(language==="en"?"Category not found.":"Categoria não encontrada.")+'</strong></div></section>';
      return;
    }
    document.title=label(cat,"name")+" — "+ui.tools+" — Nexauren Story";
    state.tools=window.NexaurenToolRegistry.getTools(registry,cat.id);
    root.innerHTML='<section class="tool-category-head"><a class="tool-back" href="/tool/'+(language==="en"?'?lang=en':'')+'">← '+esc(ui.allCategories)+'</a><div class="tool-eyebrow">'+ui.category+'</div><h1>'+esc(label(cat,"name"))+'</h1><p>'+esc(label(cat,"description")||"")+'</p><span class="tool-count">'+state.tools.length+(state.tools.length===1?" "+ui.tool+" available":" "+ui.toolsPlural+" available")+'</span></section><section class="tool-category-search" data-category-search aria-label="'+esc(ui.advancedSearch)+'"></section><section class="tool-results" aria-label="'+esc(ui.categoryTools)+'"><div class="tool-grid" data-category-results></div><div class="tool-empty" data-category-empty hidden></div></section>';
    buildSearch();
  }

  async function load(){
    if(!user){isPro=null;accountGate();return}
    const cached=window.NexaurenToolRegistry.getCachedRegistry?.();
    if(cached)render(cached);
    try{
      const [registry,plan]=await Promise.all([
        window.NexaurenToolRegistry.loadRegistry(),
        accessApi.getPlanState({force:false})
      ]);
      isPro=plan.pro===true;
      render(registry);
    }catch{
      if(!root.querySelector("[data-category-results]"))root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>'+esc(ui.unavailable)+'</strong><br>'+esc(ui.tryAgain)+'.</div></section>';
    }
  }

  async function refreshPlan(){
    if(!user)return;
    try{const plan=await accessApi.getPlanState({force:true});isPro=plan.pro===true;renderResults()}catch{}
  }

  document.addEventListener("click",handleToolClick,true);
  window.addEventListener("nexauren:tool-registry-updated",event=>{if(user&&event.detail)render(event.detail)});
  window.addEventListener("pageshow",()=>{if(user)refreshPlan()});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&user)refreshPlan()});

  (async()=>{
    try{
      accessApi=await import("/tool/frontend/tool-access.js?v=20260923-access-2");
      accessApi.onAuthStateChanged(accessApi.auth,async currentUser=>{
        user=currentUser;
        if(!user){accountGate();return}
        await load();
        refreshPlan();
      });
    }catch{
      accountGate();
    }
  })();
})();
