(() => {
  "use strict";

  const root=document.querySelector("[data-category-page]");
  const slug=document.body.dataset.category;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const normalize=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

  const iconSvg=value=>value==="Aa"||value==="text"
    ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 17 4-10h2l4 10M8 13.5h6M16 17l1.8-4.5L20 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';

  const language=(()=>{const q=new URLSearchParams(location.search).get("lang");if(q==="en")return "en";try{return localStorage.getItem("ns_lang")==="en"?"en":"pt"}catch{return "pt"}})();
  const label=(item,key)=>language==="en"?(item?.[key+"_en"]||item?.[key]||""):(item?.[key]||"");
  const localizedTags=v=>language==="en"?(Array.isArray(v?.tags_en)&&v.tags_en.length?v.tags_en:(v?.tags||[])):(v?.tags||[]);

  let state={tools:[],query:"",tag:"",access:"all",sort:"relevance"};
  let isPro=null,user=null,accessApi=null;

  const scoreTool=(tool,query)=>{
    const q=normalize(query),tokens=q.split(/\s+/).filter(Boolean);
    if(!tokens.length)return 0;
    const name=normalize(label(tool,"name")),desc=normalize(label(tool,"description")),tags=localizedTags(tool).map(normalize);
    let score=0;
    tokens.forEach(token=>{
      if(name===token)score+=120;else if(name.startsWith(token))score+=80;else if(name.includes(token))score+=55;
      if(tags.some(tag=>tag===token))score+=75;else if(tags.some(tag=>tag.includes(token)))score+=40;
      if(desc.includes(token))score+=18;
      if(normalize(tool.id).includes(token))score+=25;
    });
    if(name===q)score+=200;
    if(name.startsWith(q))score+=100;
    return score;
  };

  const card=t=>{
    const locked=t.access==="premium"&&isPro===false;
    return '<a class="tool-card cat-'+esc(t.category||slug)+' nx-spotlight nx-reveal'+(locked?" tool-card-locked":"")+'" data-tool-id="'+esc(t.id)+'" data-tool-access="'+esc(t.access||"public")+'" data-tool-path="'+esc(t.path)+'" href="'+esc(t.path)+'">'+
      '<span class="tool-card-icon">'+iconSvg(t.icon)+'</span><span class="tool-arrow">→</span>'+
      '<h2>'+esc(label(t,"name"))+"<\/h2><p>"+esc(label(t,"description")||"")+"</p>"+
      '<small>'+esc(localizedTags(t).slice(0,4).join(" · "))+'</small>'+
      (locked?'<b class="tool-search-premium">PRO</b><span class="tool-lock" aria-hidden="true">🔒</span>':"")+
      '</a>';
  };

  function accountGate(){
    root.innerHTML='<section class="tool-results"><div class="tool-account-gate"><div class="tool-access-icon">⌁</div><h3>Crie uma conta para usar as ferramentas</h3><p>As ferramentas Nexauren estão disponíveis apenas para utilizadores autenticados.</p><a class="primary" href="/account">Entrar ou criar conta</a></div></section>';
  }

  function toolResults(){
    const q=state.query;
    let results=state.tools.filter(t=>{
      const tagOk=!state.tag||(t.tags||[]).some(tag=>normalize(tag)===normalize(state.tag));
      const accessOk=state.access==="all"||String(t.access||"public")===state.access;
      return tagOk&&accessOk;
    }).map(t=>({tool:t,score:scoreTool(t,q)}));
    if(q)results=results.filter(x=>x.score>0);
    results.sort((a,b)=>{
      if(state.sort==="name")return normalize(a.tool.name).localeCompare(normalize(b.tool.name),"pt");
      if(state.sort==="popular")return Number(b.tool.popular)-Number(a.tool.popular)||b.score-a.score;
      if(state.sort==="featured")return Number(b.tool.featured)-Number(a.tool.featured)||b.score-a.score;
      return b.score-a.score||Number(a.tool.sortOrder||999)-Number(b.tool.sortOrder||999);
    });
    return results.map(x=>x.tool);
  }

  function showAccessMessage(data){
    document.querySelector("[data-tool-access-dialog]")?.remove();
    const el=document.createElement("div");
    el.setAttribute("data-tool-access-dialog","");
    el.className="tool-access-dialog";
    el.innerHTML='<div class="tool-access-dialog-backdrop" data-tool-access-close></div><div class="tool-access-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="category-tool-access-title"><button class="tool-access-dialog-close" type="button" data-tool-access-close aria-label="Fechar">×</button><span class="tool-access-dialog-icon">🔒</span><div class="tool-eyebrow">NEXAUREN PRO</div><h3 id="category-tool-access-title">'+esc(data.title)+'</h3><p>'+esc(data.body)+'</p><div class="tool-access-dialog-actions"><a class="primary" href="'+esc(data.actionUrl)+'">'+esc(data.actionLabel)+'</a><button class="secondary" type="button" data-tool-access-close>Agora não</button></div></div>';
    document.body.appendChild(el);
    const close=()=>{el.remove();document.removeEventListener("keydown",onKey)};
    const onKey=e=>{if(e.key==="Escape")close()};
    el.querySelectorAll("[data-tool-access-close]").forEach(b=>b.addEventListener("click",close));
    document.addEventListener("keydown",onKey);
  }

  function renderResults(){
    const grid=root.querySelector("[data-category-results]");
    const count=root.querySelector("[data-category-result-count]");
    const empty=root.querySelector("[data-category-empty]");
    if(!grid||!count||!empty)return;
    const results=toolResults();
    count.textContent=results.length+" "+(language==="en"?"of ":"de ")+state.tools.length+(state.tools.length===1?(language==="en"?" tool":" ferramenta"):(language==="en"?" tools":" ferramentas"));
    grid.innerHTML=results.map(card).join("");
    empty.hidden=results.length>0;
    empty.innerHTML=state.query||state.tag||state.access!=="all"
      ? (language==="en"?"<strong>No tools found.</strong><br>Try another term, remove a filter, or search by feature.":"<strong>Nenhuma ferramenta encontrada.</strong><br>Tente outro termo, remova um filtro ou pesquise por uma funcionalidade.")
      : (language==="en"?"<strong>The category is ready.</strong><br>No tools have been published here yet.":"<strong>A categoria está pronta.</strong><br>Ainda não existem ferramentas publicadas aqui.");
    grid.hidden=results.length===0;
    window.NexaurenUI?.refresh?.();
  }

  function buildSearch(){
    const tags=[...new Set(state.tools.flatMap(t=>localizedTags(t)||[]))].sort((a,b)=>normalize(a).localeCompare(normalize(b),language));
    const params=new URLSearchParams(location.search);
    state.query=params.get("q")||"";
    state.tag=params.get("tag")||"";
    state.access=params.get("access")||"all";
    state.sort=params.get("sort")||"relevance";
    root.querySelector("[data-category-search]").innerHTML='<div class="tool-advanced-search"><div class="tool-search-main"><span aria-hidden="true">⌕</span><input data-category-search-input type="search" value="'+esc(state.query)+'" placeholder="Pesquisar por nome, função, descrição ou palavra-chave…" autocomplete="off"><button type="button" data-category-clear aria-label="Limpar pesquisa">×</button></div><div class="tool-search-controls"><select data-category-tag aria-label="Filtrar por palavra-chave"><option value="">Todas as palavras-chave</option>'+tags.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join("")+'</select><select data-category-access aria-label="Filtrar por acesso"><option value="all">Todos os acessos</option><option value="public">Grátis</option><option value="premium">Pro</option></select><select data-category-sort aria-label="Ordenar resultados"><option value="relevance">Mais relevantes</option><option value="featured">Em destaque</option><option value="popular">Mais populares</option><option value="name">Nome A–Z</option></select></div><div class="tool-search-meta"><span data-category-result-count></span><button type="button" data-category-reset>Limpar filtros</button></div></div>';

    const input=root.querySelector("[data-category-search-input]");
    const tag=root.querySelector("[data-category-tag]"),access=root.querySelector("[data-category-access]"),sort=root.querySelector("[data-category-sort]");
    tag.value=state.tag;access.value=state.access;sort.value=state.sort;
    input.addEventListener("input",()=>{state.query=input.value;updateUrl();renderResults()});
    tag.addEventListener("change",e=>{state.tag=e.target.value;updateUrl();renderResults()});
    access.addEventListener("change",e=>{state.access=e.target.value;updateUrl();renderResults()});
    sort.addEventListener("change",e=>{state.sort=e.target.value;updateUrl();renderResults()});
    root.querySelector("[data-category-clear]").addEventListener("click",()=>{state.query="";input.value="";input.focus();updateUrl();renderResults()});
    root.querySelector("[data-category-reset]").addEventListener("click",()=>{state={...state,query:"",tag:"",access:"all",sort:"relevance"};input.value="";tag.value="";access.value="all";sort.value="relevance";updateUrl();renderResults();input.focus()});
    input.addEventListener("keydown",e=>{if(e.key==="Escape"){state.query="";input.value="";updateUrl();renderResults();input.blur()}});
    document.addEventListener("keydown",e=>{if(e.key!=="/"||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;e.preventDefault();input.focus()});
    renderResults();
  }

  function updateUrl(){
    const p=new URLSearchParams();
    if(state.query)p.set("q",state.query);
    if(state.tag)p.set("tag",state.tag);
    if(state.access!=="all")p.set("access",state.access);
    if(state.sort!=="relevance")p.set("sort",state.sort);
    history.replaceState(null,"",location.pathname+(p.toString()?"?"+p.toString():""));
  }

  async function handleToolClick(event){
    const link=event.target.closest("a[data-tool-id]");
    if(!link||link.dataset.toolAccess!=="premium")return;
    event.preventDefault();
    event.stopPropagation();
    if(!user){
      showAccessMessage({title:"É necessária uma conta",body:"Crie uma conta ou entre na sua conta Nexauren para usar as ferramentas.",actionLabel:"Entrar ou criar conta",actionUrl:"/account"});
      return;
    }
    try{
      const result=await accessApi.verifyToolAccess(link.dataset.toolId);
      if(result.unlocked){location.href=link.dataset.toolPath;return}
      if(result.error){showAccessMessage({title:"Não foi possível verificar o acesso",body:"Não conseguimos confirmar o estado do seu plano agora. Tente novamente.",actionLabel:"Tentar novamente",actionUrl:location.href});return}
      showAccessMessage({title:"Ferramenta exclusiva do Pro",body:"O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.",actionLabel:"Ir para o plano Pro",actionUrl:accessApi.upgradeUrl()});
    }catch{}
  }

  function render(registry){
    const cat=window.NexaurenToolRegistry.getCategory(registry,slug);
    if(!cat){root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>Categoria não encontrada.</strong></div></section>';return}
    document.title=label(cat,"name")+" — "+(language==="en"?"Tools":"Ferramentas")+" — Nexauren Story";
    state.tools=window.NexaurenToolRegistry.getTools(registry,cat.id);
    root.innerHTML='<section class="tool-category-head"><a class="tool-back" href="/tool/">← '+(language==="en"?"All categories":"Todas as categorias")+'</a><div class="tool-eyebrow">'+(language==="en"?"CATEGORY":"CATEGORIA")+'</div><h1>'+esc(label(cat,"name"))+'</h1><p>'+esc(label(cat,"description")||"")+'</p><span class="tool-count">'+state.tools.length+(state.tools.length===1?(language==="en"?" tool available":" ferramenta disponível"):(language==="en"?" tools available":" ferramentas disponíveis"))+'</span></section><section class="tool-category-search" data-category-search aria-label="'+(language==="en"?"Advanced tool search":"Pesquisa avançada de ferramentas")+'"></section><section class="tool-results" aria-label="'+(language==="en"?"Category tools":"Ferramentas da categoria")+'"><div class="tool-grid" data-category-results></div><div class="tool-empty" data-category-empty hidden></div></section>';
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
      isPro=plan.pro;
      render(registry);
    }catch{
      if(!root.querySelector("[data-category-results]"))root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>Não foi possível carregar o catálogo.</strong><br>Tente novamente.</div></section>';
    }
  }

  async function refreshPlan(){
    if(!user)return;
    try{const plan=await accessApi.getPlanState({force:true});isPro=plan.pro;renderResults()}catch{}
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