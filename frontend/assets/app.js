const app=document.getElementById("app"),nav=document.getElementById("main-nav"),searchPanel=document.getElementById("search-panel"),searchForm=document.getElementById("search-form"),searchInput=document.getElementById("search-input");
const FALLBACK_CATS=[
  ["breaking-news","Breaking News","⚡","Notícias de última hora e acontecimentos recentes."],
  ["tecnologia","Tecnologia","💻","Tecnologia, inovação, software e dispositivos."],
  ["entretenimento","Entretenimento","🎬","Música, vídeo, jogos e cultura digital."],
  ["nexauren","Nexauren","✦","Produtos, apps, projetos e novidades da Nexauren."],
  ["eventos","Eventos","📅","Eventos, lançamentos ao vivo e encontros."],
  ["ferramentas","Ferramentas","🧰","Ferramentas, utilitários e soluções publicadas."]
];
let cats=FALLBACK_CATS.slice();
let lang=localStorage.getItem("ns_lang")||"";
const I18N={
  pt:{home:"Início",search:"Pesquisar",menu:"Menu",read:"Ler história →",latest:"Mais recentes",latestDesc:"Novos conteúdos publicados pela Nexauren.",featured:"Em destaque",viewAll:"Ver todos →",all:"Todos",explore:"Explorar por categoria",exploreDesc:"Encontre rapidamente o assunto que procura.",about:"Sobre",back:"Voltar",results:"Resultados para",noResults:"Nenhum resultado encontrado.",notFound:"Artigo não encontrado",dbTitle:"Base de dados ainda não inicializada",dbText:"Execute o schema.sql completo no D1 e publique o Worker novamente.",languageTitle:"Escolha o idioma",languageText:"Você poderá alterar o idioma depois no cabeçalho.",continuePt:"Continuar em Português",continueEn:"Continue in English",english:"Inglês",portuguese:"Português",translationFallback:"Esta publicação ainda não possui versão em inglês; exibindo o conteúdo original.",related:"Mais desta categoria",nothing:"Ainda não há publicações nesta categoria.",newsletter:"Acompanhe as novidades do ecossistema Nexauren.",official:"Publicação oficial da Nexauren",footer:"Histórias, lançamentos, guias e a história viva do ecossistema Nexauren.",resources:"Recursos"},
  en:{home:"Home",search:"Search",menu:"Menu",read:"Read story →",latest:"Latest stories",latestDesc:"Fresh content published by Nexauren.",featured:"Featured",viewAll:"View all →",all:"All",explore:"Explore by category",exploreDesc:"Find the subject you are looking for.",about:"About",back:"Back",results:"Results for",noResults:"No results found.",notFound:"Story not found",dbTitle:"Database not initialized",dbText:"Run the complete schema.sql in D1 and deploy the Worker again.",languageTitle:"Choose your language",languageText:"You can change the language later from the header.",continuePt:"Continuar em Português",continueEn:"Continue in English",english:"English",portuguese:"Português",translationFallback:"This post does not have an English version yet; showing the original content.",related:"More from this category",nothing:"Nothing published here yet.",newsletter:"Follow the latest from the Nexauren ecosystem.",official:"The official Nexauren publication",footer:"Stories, releases, guides and the living history of the Nexauren ecosystem.",resources:"Resources"}
};
function t(k){return (I18N[lang||"pt"]||I18N.pt)[k]||k}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function url(v){try{const u=new URL(v,location.origin);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch{return "";}}
function date(v){if(!v)return "";try{return new Intl.DateTimeFormat(lang==="en"?"en-US":"pt-BR",{dateStyle:"medium"}).format(new Date(v));}catch{return v;}}
function typeLabel(v){const m=lang==="en"?{article:"Article",news:"News",guide:"Guide",tutorial:"Tutorial",announcement:"Announcement",release:"Release",update:"Update",story:"Story"}:{article:"Artigo",news:"Notícias",guide:"Guia",tutorial:"Tutorial",announcement:"Comunicado",release:"Lançamento",update:"Atualização",story:"História"};return m[v]||m.article}
function catLabel(slug,name){const en={news:"News",breaking-news:"Breaking News",tecnologia:"Technology",entretenimento:"Entertainment",nexauren:"Nexauren",eventos:"Events",ferramentas:"Tools",apps:"Apps",products:"Products",guides:"Guides",tutorials:"Tutorials",releases:"Releases",updates:"Updates"};const pt={news:"Notícias","breaking-news":"Notícias de última hora",tecnologia:"Tecnologia",entretenimento:"Entretenimento",nexauren:"Nexauren",eventos:"Eventos",ferramentas:"Ferramentas",apps:"Aplicativos",products:"Produtos",guides:"Guias",tutorials:"Tutoriais",releases:"Lançamentos",updates:"Atualizações"};return (lang==="en"?en:pt)[slug]||name||""}
function excerpt(p){if(p.excerpt)return p.excerpt;const s=String(p.content||"").replace(/[#_*\x60>\[\]()!]/g," ").replace(/\s+/g," ").trim();return s?(s.slice(0,180)+(s.length>180?"…":"")):"";}
function md(s){
  let x=esc(s||""),blocks=[];
  x=x.replace(/\x60\x60\x60([\s\S]*?)\x60\x60\x60/g,(m,c)=>{const i=blocks.length;blocks.push("<pre><code>"+c.trim()+"</code></pre>");return "§B"+i+"§";});
  x=x.replace(/^\s*###\s+(.+)$/gm,"<h3>$1</h3>").replace(/^\s*##\s+(.+)$/gm,"<h2>$1</h2>").replace(/^\s*#\s+(.+)$/gm,"<h2>$1</h2>").replace(/^\s*>\s?(.+)$/gm,"<blockquote>$1</blockquote>");
  x=x.replace(/^\s*[-*]\s+(.+)$/gm,"<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g,m=>"<ul>"+m.replace(/\n/g,"")+"</ul>");
  x=x.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*([^*\n]+)\*/g,"<em>$1</em>").replace(/\x60([^\x60\n]+)\x60/g,"<code>$1</code>");
  x=x.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,l,h)=>{const v=url(h);return v?'<a href="'+esc(v)+'" target="_blank" rel="noopener">'+l+"</a>":l;});
  x=x.split(/\n{2,}/).map(c=>{c=c.trim();if(!c)return "";if(/^<(h2|h3|blockquote|ul|pre)/.test(c)||c.includes("§B"))return c;return "<p>"+c.replace(/\n/g,"<br>")+"</p>";}).join("");
  return x.replace(/§B(\d+)§/g,(m,i)=>blocks[Number(i)]);
}
async function api(path,opt){const o=Object.assign({credentials:"same-origin"},opt||{});o.headers=Object.assign({"content-type":"application/json"},o.headers||{});const r=await fetch(path,o),d=await r.json().catch(()=>({ok:false,error:"Resposta inválida do servidor."}));if(!r.ok){const e=new Error(d.error||"Pedido não concluído.");e.code=d.code;throw e;}return d;}
function langQuery(base){return base+(base.includes("?")?"&":"?")+"lang="+encodeURIComponent(lang||"pt")}
function setLanguage(next,persist=true){
  lang=next==="en"?"en":"pt";document.documentElement.lang=lang;document.cookie="ns_lang="+lang+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";if(persist)localStorage.setItem("ns_lang",lang);
  document.getElementById("language-button")?.setAttribute("aria-label",lang==="en"?"Português":"English");
}
function openLanguage(){
  let box=document.getElementById("language-choice");if(!box){box=document.createElement("div");box.id="language-choice";box.className="language-overlay";box.innerHTML='<div class="language-card" role="dialog" aria-modal="true"><div class="language-mark">N</div><div class="eyebrow">Nexauren Story</div><h2>'+t("languageTitle")+'</h2><p>'+t("languageText")+'</p><div class="language-options"><button data-lang="pt">'+t("continuePt")+'</button><button data-lang="en">'+t("continueEn")+'</button></div></div>';document.body.appendChild(box);box.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{setLanguage(b.dataset.lang);box.remove();route();});}else{box.querySelector(".language-card").innerHTML='<div class="language-mark">N</div><div class="eyebrow">Nexauren Story</div><h2>'+t("languageTitle")+'</h2><p>'+t("languageText")+'</p><div class="language-options"><button data-lang="pt">'+t("continuePt")+'</button><button data-lang="en">'+t("continueEn")+'</button></div>';box.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{setLanguage(b.dataset.lang);box.remove();route();});}
}
function card(p){
  return '<article class="card"><a href="/post/'+encodeURIComponent(p.slug)+'"><div class="card-media">'+(p.cover_url?'<img loading="lazy" src="'+esc(p.cover_url)+'" alt="'+esc(p.title)+'">':"<span class="card-placeholder">N</span>")+'</div><div class="card-body"><div class="meta"><span class="pill">'+esc(catLabel(p.category_slug,p.category_name||typeLabel(p.type)))+'</span><span>·</span><span>'+date(p.published_at)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(excerpt(p))+'</p><span class="read-more">'+t("read")+"</span></div></a></article>";
}
function categoryTile(c){
  const [slug,name,icon,desc]=c;const count=c[4]??null;
  return '<a class="category-tile" href="/'+encodeURIComponent(slug)+'"><span class="category-icon">'+esc(icon||"✦")+'</span><span class="category-name">'+esc(catLabel(slug,name))+'</span><span class="category-desc">'+esc((lang==="en"?({"tecnologia":"Technology, innovation and digital products.","entretenimento":"Music, video, games and culture.","nexauren":"Products, apps and Nexauren projects.","eventos":"Events and live launches.","ferramentas":"Tools and utilities.","breaking-news":"Urgent news and recent events."}[slug]||desc):(desc||"")))+'</span><span class="category-arrow">→</span>'+ (count!==null?'<small>'+count+" posts</small>":"")+"</a>";
}
async function loadCategories(){
  try{const d=await api("/api/categories");if((d.categories||[]).length)cats=d.categories.map(c=>[c.slug,c.name,c.icon,c.description,c.post_count]);}
  catch{cats=FALLBACK_CATS.slice();}
}
function setup(){
  setLanguage(lang||"pt",false);
  nav.innerHTML='<a href="/" data-n="home">'+t("home")+"</a>"+cats.map(c=>'<a href="/'+c[0]+'" data-n="'+c[0]+'">'+esc(catLabel(c[0],c[1]))+"</a>").join("");
  let mobile=document.querySelector(".mobile-nav");
  if(!mobile){mobile=document.createElement("div");mobile.className="mobile-nav";document.querySelector(".site-header").appendChild(mobile);}
  mobile.innerHTML=nav.innerHTML+'<button class="mobile-lang" id="mobile-language">'+(lang==="en"?"PT":"EN")+"</button>";
  let lb=document.getElementById("language-button");if(!lb){lb=document.createElement("button");lb.id="language-button";lb.className="language-button";lb.type="button";lb.textContent=lang==="en"?"PT":"EN";document.querySelector(".header-actions").insertBefore(lb,document.getElementById("menu-toggle"));}else lb.textContent=lang==="en"?"PT":"EN";
  lb.onclick=openLanguage;document.getElementById("mobile-language")?.addEventListener("click",openLanguage);
  document.getElementById("search-toggle").setAttribute("aria-label",t("search"));document.getElementById("menu-toggle").setAttribute("aria-label",t("menu"));
  document.getElementById("search-input").placeholder=lang==="en"?"Search Nexauren Story…":"Pesquisar no Nexauren Story…";
  const submit=document.getElementById("search-submit");if(submit)submit.textContent=t("search");
  const fd=document.getElementById("footer-description"),fe=document.getElementById("footer-explore"),fr=document.getElementById("footer-resources");
  if(fd)fd.textContent=t("footer");if(fe)fe.textContent=lang==="en"?"Explore":"Explorar";if(fr)fr.textContent=t("resources");
  const fc=document.getElementById("footer-cats");if(fc)fc.innerHTML=cats.slice(0,6).map(x=>'<a href="/'+x[0]+'">'+esc(catLabel(x[0],x[1]))+"</a>").join("");
  document.getElementById("search-toggle").onclick=()=>{searchPanel.classList.toggle("open");if(searchPanel.classList.contains("open"))searchInput.focus();};
  searchForm.onsubmit=e=>{e.preventDefault();const q=searchInput.value.trim();if(q)location.href="/search?q="+encodeURIComponent(q)};
  document.getElementById("menu-toggle").onclick=()=>document.querySelector(".mobile-nav")?.classList.toggle("open");
  document.getElementById("year").textContent=new Date().getFullYear();
  const p=location.pathname.split("/")[1]||"home";document.querySelectorAll("[data-n]").forEach(a=>a.classList.toggle("active",a.dataset.n===p));
  if(!localStorage.getItem("ns_lang"))setTimeout(openLanguage,120);
}
async function home(){
  app.innerHTML='<section class="hero"><div class="hero-copy"><div class="eyebrow">'+t("official")+'</div><h1>'+ (lang==="en"?"The story behind everything Nexauren.":"A história por trás de tudo o que é Nexauren.") +'</h1><p>'+(lang==="en"?"News, launches, app updates, guides, tutorials and ideas shaping the ecosystem.":"Notícias, lançamentos, atualizações, guias, tutoriais e ideias que moldam o ecossistema.")+'</p></div><div class="hero-card"><div class="hero-orbit"><span>N</span></div><div><div class="eyebrow">NEXAUREN STORY</div><p style="color:var(--muted)">'+(lang==="en"?"One place for the latest from the ecosystem.":"Um só lugar para acompanhar as novidades do ecossistema.")+'</p></div></div></section><section class="section"><div class="section-head"><div><h2>'+t("explore")+'</h2><p>'+t("exploreDesc")+'</p></div></div><div id="cat-grid" class="category-grid"></div></section><section class="section" id="featured"></section><section class="section"><div class="section-head"><div><h2>'+t("latest")+'</h2><p>'+t("latestDesc")+'</p></div><a class="read-more" href="/'+cats[0][0]+'">'+t("viewAll")+'</a></div><div id="latest" class="grid"></div></section>';
  const [cd,pp]=await Promise.all([api("/api/categories").catch(()=>({categories:[]})),api(langQuery("/api/posts?limit=12"))]);
  if((cd.categories||[]).length)cats=cd.categories.map(c=>[c.slug,c.name,c.icon,c.description,c.post_count]);
  document.getElementById("cat-grid").innerHTML=cats.map(categoryTile).join("");
  const ps=pp.posts||[],f=ps.find(p=>p.featured)||ps[0];
  document.getElementById("featured").innerHTML=f?'<div class="section-head"><h2>'+t("featured")+'</h2></div><section class="featured"><a class="featured-media" href="/post/'+encodeURIComponent(f.slug)+'">'+(f.cover_url?'<img src="'+esc(f.cover_url)+'" alt="'+esc(f.title)+'">':"<span class="featured-placeholder">N</span>")+'</a><div class="featured-copy"><div class="pill">'+esc(catLabel(f.category_slug,f.category_name||typeLabel(f.type)))+" · "+t("featured")+'</div><h2>'+esc(f.title)+'</h2><p>'+esc(excerpt(f))+'</p><a class="read-more" href="/post/'+encodeURIComponent(f.slug)+'">'+t("read")+'</a></div></section>':'';
  document.getElementById("latest").innerHTML=ps.length?ps.slice(0,12).map(card).join(""):'<div class="empty">'+t("nothing")+"</div>";
}
async function listing(slug,title){
  app.innerHTML='<section class="listing-head"><div class="eyebrow">Nexauren Story</div><h1>'+esc(catLabel(slug,title))+'</h1><p>'+esc(lang==="en"?"Explore stories, releases and updates in this category.":"Explore histórias, lançamentos e atualizações desta categoria.")+'</p></section><div class="section-head compact-head"><div><h2>'+t("latest")+'</h2></div></div><div id="list" class="grid"></div>';
  const ps=(await api(langQuery("/api/posts?category="+encodeURIComponent(slug)+"&limit=60"))).posts||[];
  document.getElementById("list").innerHTML=ps.length?ps.map(card).join(""):'<div class="empty">'+t("nothing")+"</div>";
}
async function search(q){
  app.innerHTML='<section class="listing-head"><div class="eyebrow">'+t("search")+'</div><h1>'+t("results")+' “'+esc(q)+'”</h1></section><div id="list" class="grid"></div>';
  const ps=(await api(langQuery("/api/search?q="+encodeURIComponent(q)))).posts||[];
  document.getElementById("list").innerHTML=ps.length?ps.map(card).join(""):'<div class="empty">'+t("noResults")+"</div>";
}
async function post(slug){
  app.innerHTML='<article class="article"><div class="hero-card" style="height:320px"></div></article>';
  try{
    const p=(await api(langQuery("/api/posts/slug/"+encodeURIComponent(slug)))).post;
    document.title=(p.meta_title||p.title)+" — Nexauren Story";
    const translationNotice=(lang==="en"&&!p.translation_available)?'<div class="translation-note">'+t("translationFallback")+"</div>":"";
    app.innerHTML='<article class="article"><div class="meta"><span class="pill">'+esc(catLabel(p.category_slug,p.category_name||typeLabel(p.type)))+'</span><span>·</span><span>'+date(p.published_at)+'</span></div><h1>'+esc(p.title)+'</h1>'+(p.excerpt?'<div class="article-excerpt">'+esc(p.excerpt)+"</div>":"")+(p.cover_url?'<img class="article-cover" src="'+esc(p.cover_url)+'" alt="'+esc(p.title)+'">':"")+translationNotice+'<div class="article-content">'+md(p.content)+"</div>"+((p.tags||[]).length?'<div class="tags">'+p.tags.map(x=>'<span class="tag">#'+esc(x.name)+"</span>").join("")+"</div>":"")+'<section class="related-section"><div class="section-head"><h2>'+t("related")+'</h2></div><div id="related" class="grid"></div></section></article>';
    window.NexaurenAds?.apply?.(document.querySelector(".article"));
    const related=(await api(langQuery("/api/posts?category="+encodeURIComponent(p.category_slug||"")+"&limit=4"))).posts||[];
    document.getElementById("related").innerHTML=related.filter(x=>x.slug!==p.slug).slice(0,3).map(card).join("")||'<div class="empty">'+t("nothing")+"</div>";
  }catch(e){
    app.innerHTML='<div class="empty"><h2>'+t("notFound")+'</h2><p>'+esc(e.message)+'</p><a class="read-more" href="/">'+t("back")+" →</a></div>";
  }
}
function about(){app.innerHTML='<section class="listing-head"><div class="eyebrow">'+t("about")+'</div><h1>Nexauren Story</h1><p>'+(lang==="en"?"A public home for Nexauren products, applications, ideas and milestones.":"Um espaço público para produtos, aplicações, ideias e marcos da Nexauren.")+'</p></section><section class="section"><div class="featured"><div class="featured-copy"><div class="pill">NEXAUREN</div><h2>'+(lang==="en"?"Build. Explain. Share the story.":"Construir. Explicar. Partilhar a história.")+'</h2><p>'+t("footer")+'</p></div><div class="hero-card"><div class="hero-orbit"><span>N</span></div><p style="color:var(--muted)">nexaurenstory.com</p></div></div></section>'}
async function route(){await loadCategories();setup();const p=location.pathname;if(p.startsWith("/post/"))return post(decodeURIComponent(p.slice(6)));if(p.startsWith("/search"))return search(new URLSearchParams(location.search).get("q")||"");if(p==="/about")return about();if(p==="/")return home();const c=cats.find(x=>x[0]===p.slice(1));if(c)return listing(c[0],c[1]);return home();}
route().catch(e=>{console.error(e);const ready=e.code==="DB_NOT_READY";app.innerHTML='<div class="empty"><h2>'+ (ready?t("dbTitle"):(lang==="en"?"Unable to load this page":"Não foi possível carregar esta página")) +'</h2><p>'+esc(ready?t("dbText"):(e.message||"Tente novamente."))+'</p></div>';});