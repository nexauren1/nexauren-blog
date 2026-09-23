(() => {
  "use strict";

  const root=document.querySelector("[data-category-page]");
  const slug=document.body.dataset.category;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const normalize=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const iconSvg=value=>value==="Aa"||value==="text"
    ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 17 4-10h2l4 10M8 13.5h6M16 17l1.8-4.5L20 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg>';

  const scoreTool=(tool,query)=>{
    const q=normalize(query),tokens=q.split(/\s+/).filter(Boolean);
    if(!tokens.length)return 0;
    const name=normalize(tool.name),desc=normalize(tool.description),tags=(tool.tags||[]).map(normalize);
    let score=0;
    tokens.forEach(token=>{
      if(name===token)score+=120;
      else if(name.startsWith(token))score+=80;
      else if(name.includes(token))score+=55;
      if(tags.some(tag=>tag===token))score+=75;
      else if(tags.some(tag=>tag.includes(token)))score+=40;
      if(desc.includes(token))score+=18;
      if(normalize(tool.id).includes(token))score+=25;
    });
    if(name===q)score+=200;
    if(name.startsWith(q))score+=100;
    return score;
  };

  let state={tools:[],query:"",tag:"",access:"all",sort:"relevance"};
  let isPro=false;
  async function getProAccess(){
    try{
      const mod=await import("/account/account-client.js?v=20260923-tool-access");
      if(!mod.auth?.currentUser)return false;
      const data=await mod.workerFetch("/api/account/billing",{method:"GET"});
      return String(data?.billing?.plan||"").toLowerCase()==="pro" && ["ACTIVE","APPROVED"].includes(String(data?.billing?.status||"").toUpperCase());
    }catch{return false;}
  }

  const card=t=>{
    const locked=t.access==="premium"&&!isPro;
    return '<a class="tool-card cat-'+esc(t.category||slug)+' nx-spotlight nx-reveal'+(locked?" tool-card-locked":"")+'" data-category="'+esc(t.category||slug)+'" href="'+esc(locked?"/account/upgrade/":t.path)+'" aria-label="'+esc(t.name+(locked?" — requer Pro":""))+'">'+
      '<span class="tool-card-icon">'+iconSvg(t.icon)+'</span><span class="tool-arrow">→</span>'+
      '<h2>'+esc(t.name)+'</h2><p>'+esc(t.description||"")+'</p>'+
      '<small>'+esc((t.tags||[]).slice(0,4).join(" · "))+'</small>'+
      (t.access==="premium"?'<b class="tool-search-premium">PRO</b><span class="tool-lock" aria-hidden="true">🔒</span>':"")+
      '</a>';
  };

  function updateUrl(){
    const p=new URLSearchParams();
    if(state.query)p.set("q",state.query);
    if(state.tag)p.set("tag",state.tag);
    if(state.access!=="all")p.set("access",state.access);
    if(state.sort!=="relevance")p.set("sort",state.sort);
    const next=location.pathname+(p.toString()?"?"+p.toString():"");
    history.replaceState(null,"",next);
  }

  function searchTools(){
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
      return b.score-a.score||Number(b.tool.sortOrder||999)-Number(a.tool.sortOrder||999);
    });
    return results.map(x=>x.tool);
  }

  function renderResults(){
    const grid=root.querySelector("[data-category-results]");
    const count=root.querySelector("[data-category-result-count]");
    const empty=root.querySelector("[data-category-empty]");
    if(!grid||!count||!empty)return;
    const results=searchTools();
    count.textContent=results.length+" de "+state.tools.length+(state.tools.length===1?" ferramenta":" ferramentas");
    grid.innerHTML=results.map(card).join("");
    empty.hidden=results.length>0;
    empty.innerHTML=state.query||state.tag||state.access!=="all"
      ? "<strong>Nenhuma ferramenta encontrada.</strong><br>Tente outro termo, remova um filtro ou pesquise por uma funcionalidade."
      : "<strong>A categoria está pronta.</strong><br>Ainda não existem ferramentas publicadas aqui.";
    grid.hidden=results.length===0;
    window.NexaurenUI?.refresh?.();
  }

  function buildSearch(cat){
    const tags=[...new Set(state.tools.flatMap(t=>t.tags||[]))].sort((a,b)=>normalize(a).localeCompare(normalize(b),"pt"));
    const params=new URLSearchParams(location.search);
    state.query=params.get("q")||"";
    state.tag=params.get("tag")||"";
    state.access=params.get("access")||"all";
    state.sort=params.get("sort")||"relevance";
    root.querySelector("[data-category-search]").innerHTML=
      '<div class="tool-advanced-search">'+
        '<div class="tool-search-main"><span aria-hidden="true">⌕</span><input data-category-search-input type="search" value="'+esc(state.query)+'" placeholder="Pesquisar por nome, função, descrição ou palavra-chave…" autocomplete="off"><button type="button" data-category-clear aria-label="Limpar pesquisa">×</button></div>'+
        '<div class="tool-search-controls">'+
          '<select data-category-tag aria-label="Filtrar por palavra-chave"><option value="">Todas as palavras-chave</option>'+tags.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join("")+'</select>'+
          '<select data-category-access aria-label="Filtrar por acesso"><option value="all">Todos os acessos</option><option value="public">Grátis</option><option value="premium">Pro</option></select>'+
          '<select data-category-sort aria-label="Ordenar resultados"><option value="relevance">Mais relevantes</option><option value="featured">Em destaque</option><option value="popular">Mais populares</option><option value="name">Nome A–Z</option></select>'+
        '</div>'+
        '<div class="tool-search-meta"><span data-category-result-count></span><button type="button" data-category-reset>Limpar filtros</button></div>'+
      '</div>';
    const input=root.querySelector("[data-category-search-input]");
    root.querySelector("[data-category-tag]").value=state.tag;
    root.querySelector("[data-category-access]").value=state.access;
    root.querySelector("[data-category-sort]").value=state.sort;
    input.addEventListener("input",()=>{state.query=input.value;updateUrl();renderResults();});
    root.querySelector("[data-category-tag]").addEventListener("change",e=>{state.tag=e.target.value;updateUrl();renderResults();});
    root.querySelector("[data-category-access]").addEventListener("change",e=>{state.access=e.target.value;updateUrl();renderResults();});
    root.querySelector("[data-category-sort]").addEventListener("change",e=>{state.sort=e.target.value;updateUrl();renderResults();});
    root.querySelector("[data-category-clear]").addEventListener("click",()=>{state.query="";input.value="";input.focus();updateUrl();renderResults();});
    root.querySelector("[data-category-reset]").addEventListener("click",()=>{
      state={...state,query:"",tag:"",access:"all",sort:"relevance"};
      input.value="";root.querySelector("[data-category-tag]").value="";root.querySelector("[data-category-access]").value="all";root.querySelector("[data-category-sort]").value="relevance";
      updateUrl();renderResults();input.focus();
    });
    input.addEventListener("keydown",e=>{if(e.key==="Escape"){state.query="";input.value="";updateUrl();renderResults();input.blur();}});
    document.addEventListener("keydown",e=>{
      if(e.key!=="/"||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;
      e.preventDefault();input.focus();
    },{once:false});
    renderResults();
  }

  async function render(){
    try{
      const registry=await window.NexaurenToolRegistry.loadRegistry();
      isPro=await getProAccess();
      const cat=window.NexaurenToolRegistry.getCategory(registry,slug);
      if(!cat){root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>Categoria não encontrada.</strong></div></section>';return;}
      document.title=cat.name+" — Ferramentas — Nexauren Story";
      state.tools=window.NexaurenToolRegistry.getTools(registry,cat.id);
      root.innerHTML=
        '<section class="tool-category-head">'+
          '<a class="tool-back" href="/tool/">← Todas as categorias</a>'+
          '<div class="tool-eyebrow">CATEGORIA</div>'+
          '<h1>'+esc(cat.name)+'</h1>'+
          '<p>'+esc(cat.description||"")+'</p>'+
          '<span class="tool-count">'+state.tools.length+(state.tools.length===1?" ferramenta disponível":" ferramentas disponíveis")+'</span>'+
        '</section>'+
        '<section class="tool-category-search" data-category-search aria-label="Pesquisa avançada de ferramentas"></section>'+
        '<section class="tool-results" aria-label="Ferramentas da categoria">'+
          '<div class="tool-grid" data-category-results></div>'+
          '<div class="tool-empty" data-category-empty hidden></div>'+
        '</section>';
      buildSearch(cat);
    }catch(e){
      root.innerHTML='<section class="tool-results"><div class="tool-empty"><strong>Não foi possível carregar o catálogo.</strong><br>'+esc(e.message||"Tente novamente.")+'</div></section>';
    }
  }
  render();
})();