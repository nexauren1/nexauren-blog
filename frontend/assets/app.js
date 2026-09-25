const app=document.getElementById("app"),nav=document.getElementById("main-nav"),searchPanel=document.getElementById("search-panel"),searchForm=document.getElementById("search-form"),searchInput=document.getElementById("search-input");
const BLOG_BASE="/blog";
const FALLBACK_CATS=[
  ["breaking-news","Breaking News","⚡","Notícias de última hora e acontecimentos recentes."],
  ["tecnologia","Tecnologia","💻","Tecnologia, inovação, software e dispositivos."],
  ["entretenimento","Entretenimento","🎬","Música, vídeo, jogos e cultura digital."],
  ["nexauren","Nexauren","✦","Produtos, apps, projetos e novidades da Nexauren."],
  ["eventos","Eventos","📅","Eventos, lançamentos ao vivo e encontros."],
  ["ferramentas","Ferramentas","🧰","Ferramentas, utilitários e soluções publicadas."]
];
let cats=FALLBACK_CATS.slice();
const urlLanguage=new URLSearchParams(location.search).get("lang");
let lang=(urlLanguage==="en"||urlLanguage==="pt")?urlLanguage:(localStorage.getItem("ns_lang")||"");
const I18N={
  pt:{home:"Início",search:"Pesquisar",menu:"Menu",read:"Ler história →",latest:"Mais recentes",latestDesc:"Novos conteúdos publicados pela Nexauren.",featured:"Em destaque",viewAll:"Ver todos →",all:"Todos",explore:"Explorar por categoria",exploreDesc:"Encontre rapidamente o assunto que procura.",about:"Sobre",back:"Voltar",results:"Resultados para",noResults:"Nenhum resultado encontrado.",notFound:"Artigo não encontrado",dbTitle:"Base de dados ainda não inicializada",dbText:"Execute o schema.sql completo no D1 e publique o Worker novamente.",languageTitle:"Escolha o idioma",languageText:"Você poderá alterar o idioma depois no cabeçalho.",continuePt:"Continuar em Português",continueEn:"Continue in English",english:"Inglês",portuguese:"Português",translationFallback:"Esta publicação ainda não possui versão em inglês; exibindo o conteúdo original.",related:"Mais desta categoria",nothing:"Ainda não há publicações nesta categoria.",newsletter:"Acompanhe as novidades do ecossistema Nexauren.",official:"Publicação oficial da Nexauren",footer:"Histórias, lançamentos, guias e a história viva do ecossistema Nexauren.",resources:"Recursos"},
  en:{home:"Home",search:"Search",menu:"Menu",read:"Read story →",latest:"Latest stories",latestDesc:"Fresh content published by Nexauren.",featured:"Featured",viewAll:"View all →",all:"All",explore:"Explore by category",exploreDesc:"Find the subject you are looking for.",about:"About",back:"Back",results:"Results for",noResults:"No results found.",notFound:"Story not found",dbTitle:"Database not initialized",dbText:"Run the complete schema.sql in D1 and deploy the Worker again.",languageTitle:"Choose your language",languageText:"You can change the language later from the header.",continuePt:"Continuar em Português",continueEn:"Continue in English",english:"English",portuguese:"Português",translationFallback:"This post does not have an English version yet; showing the original content.",related:"More from this category",nothing:"Nothing published here yet.",newsletter:"Follow the latest from the Nexauren ecosystem.",official:"The official Nexauren publication",footer:"Stories, releases, guides and the living history of the Nexauren ecosystem.",resources:"Resources"}
};
async function loadPostAds(){if(window.NexaurenAds)return true;return await new Promise(resolve=>{const s=document.createElement("script");s.src="/assets/ads.js";s.async=true;s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
function t(k){return (I18N[lang||"pt"]||I18N.pt)[k]||k}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function url(v){try{const u=new URL(v,location.origin);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch{return "";}}
function date(v){if(!v)return "";try{return new Intl.DateTimeFormat(lang==="en"?"en-US":"pt-BR",{dateStyle:"medium"}).format(new Date(v));}catch{return v;}}
function typeLabel(v){const m=lang==="en"?{article:"Article",news:"News",guide:"Guide",tutorial:"Tutorial",announcement:"Announcement",release:"Release",update:"Update",story:"Story"}:{article:"Artigo",news:"Notícias",guide:"Guia",tutorial:"Tutorial",announcement:"Comunicado",release:"Lançamento",update:"Atualização",story:"História"};return m[v]||m.article}
function catLabel(slug,name){const en={news:"News","breaking-news":"Breaking News",tecnologia:"Technology",entretenimento:"Entertainment",nexauren:"Nexauren",eventos:"Events",ferramentas:"Tools",apps:"Apps",products:"Products",guides:"Guides",tutorials:"Tutorials",releases:"Releases",updates:"Updates"};const pt={news:"Notícias","breaking-news":"Notícias de última hora",tecnologia:"Tecnologia",entretenimento:"Entretenimento",nexauren:"Nexauren",eventos:"Eventos",ferramentas:"Ferramentas",apps:"Aplicativos",products:"Produtos",guides:"Guias",tutorials:"Tutoriais",releases:"Lançamentos",updates:"Atualizações"};return (lang==="en"?en:pt)[slug]||name||""}
function excerpt(p){if(p.excerpt)return p.excerpt;const s=String(p.content||"").replace(/[#_*\x60>\[\]()!]/g," ").replace(/\s+/g," ").trim();return s?(s.slice(0,180)+(s.length>180?"…":"")):"";}
function md(s){
  let lines=String(s||"").replace(/\r/g,"").split("\n"),out="",i=0;
  const inline=s=>{let x=esc(s||"");x=x.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*([^*\n]+)\*/g,"<em>$1</em>");x=x.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,l,h)=>{const v=url(h);return v?'<a href="'+esc(v)+'" target="_blank" rel="noopener">'+l+"</a>":l;});return x;};
  while(i<lines.length){
    const line=lines[i].trim();
    if(!line){i++;continue}
    if(/^#\s+/.test(line)){out+="<h2>"+inline(line.replace(/^#\s+/,""))+"</h2>";i++;continue}
    if(/^##\s+/.test(line)){out+="<h3>"+inline(line.replace(/^##\s+/,""))+"</h3>";i++;continue}
    if(/^::\s*/.test(line)){out+="<p>"+inline(line.replace(/^::\s*/,""))+"</p>";i++;continue}
    if(/^>\s?/.test(line)){out+="<blockquote>"+inline(line.replace(/^>\s?/,""))+"</blockquote>";i++;continue}
    if(/^---+$/.test(line)){out+="<hr>";i++;continue}
    if(/^@imagem\s+/i.test(line)){const parts=line.replace(/^@imagem\s+/i,"").split("|").map(x=>x.trim()),src=parts.shift()||"",alt=parts.shift()||"",cap=parts.join(" | "),v=url(src);if(v)out+='<figure class="article-figure"><img loading="lazy" decoding="async" src="'+esc(v)+'" alt="'+esc(alt)+'">'+(cap?'<figcaption>'+esc(cap)+"</figcaption>":"")+"</figure>";i++;continue}
    if(/^-\s+/.test(line)){const items=[];while(i<lines.length&&/^\s*-\s+/.test(lines[i])){items.push("<li>"+inline(lines[i].replace(/^\s*-\s+/,""))+"</li>");i++}out+="<ul>"+items.join("")+"</ul>";continue}
    if(/^\d+\.\s+/.test(line)){const items=[];while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i])){items.push("<li>"+inline(lines[i].replace(/^\s*\d+\.\s+/,""))+"</li>");i++}out+="<ol>"+items.join("")+"</ol>";continue}
    const para=[];while(i<lines.length&&lines[i].trim()&&!/^#\s+|^##\s+|^::\s*|^>\s?|^---+$|^@imagem\s+|^-\s+|^\d+\.\s+/i.test(lines[i].trim())){para.push(lines[i].trim());i++}out+="<p>"+inline(para.join("\n")).replace(/\n/g,"<br>")+"</p>";
  }
  return out;
}

async function api(path,opt){const o=Object.assign({credentials:"same-origin"},opt||{});o.headers=Object.assign({"content-type":"application/json"},o.headers||{});const r=await fetch(path,o),d=await r.json().catch(()=>({ok:false,error:"Resposta inválida do servidor."}));if(!r.ok){const e=new Error(d.error||"Pedido não concluído.");e.code=d.code;throw e;}return d;}
function langQuery(base){return base+(base.includes("?")?"&":"?")+"lang="+encodeURIComponent(lang||"pt")}
function hrefFor(path){const u0=new URL(path,location.origin),p=u0.pathname;const target=p.startsWith(BLOG_BASE)?p:(p==="/"?(BLOG_BASE+"/"):(BLOG_BASE+p));const u=new URL(target+(u0.search||""),location.origin);if(lang==="en")u.searchParams.set("lang","en");else u.searchParams.delete("lang");return u.pathname+(u.search||"")}
function setMeta(attr,key,value){let m=document.head.querySelector("meta["+attr+"=\""+key+"\"]");if(!m){m=document.createElement("meta");m.setAttribute(attr,key);document.head.appendChild(m)}m.setAttribute("content",value||"")}
function setLink(rel,hrefLang,href){let l=document.head.querySelector('link[rel="'+rel+'"][hreflang="'+hrefLang+'"]');if(!l){l=document.createElement("link");l.rel=rel;l.hreflang=hrefLang;document.head.appendChild(l)}l.href=href}
function setCanonical(href){let l=document.head.querySelector('link[rel="canonical"]');if(!l){l=document.createElement("link");l.rel="canonical";document.head.appendChild(l)}l.href=href}
function updateSeo(meta){
  const baseTitle=meta.title||"Nexauren Story";
  const fullTitle=baseTitle+" — Nexauren Story";
  const desc=String(meta.description||"Nexauren Story").slice(0,300);
  const pageUrl=meta.url||location.href;
  const image=meta.image||location.origin+"/social-preview.png?v=20260922-1";
  document.title=fullTitle;
  document.documentElement.lang=lang;
  setMeta("name","description",desc);
  setMeta("name","robots",meta.robots||"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  setMeta("property","og:title",fullTitle);
  setMeta("property","og:description",desc);
  setMeta("property","og:type",meta.type==="article"?"article":"website");
  setMeta("property","og:url",pageUrl);
  setMeta("property","og:image",image);
  setMeta("property","og:image:alt",fullTitle);
  setMeta("property","og:locale",lang==="en"?"en_US":"pt_PT");
  setMeta("property","og:locale:alternate",lang==="en"?"pt_PT":"en_US");
  setMeta("name","twitter:card","summary_large_image");
  setMeta("name","twitter:title",fullTitle);
  setMeta("name","twitter:description",desc);
  setMeta("name","twitter:image",image);
  setMeta("name","twitter:image:alt",fullTitle);
  setCanonical(pageUrl);
  const pt=new URL(location.pathname,location.origin);
  const en=new URL(location.pathname,location.origin);
  en.searchParams.set("lang","en");
  setLink("alternate","pt",pt.href);
  if(meta.hasEnglish===false){document.head.querySelector('link[rel="alternate"][hreflang="en"]')?.remove();}else setLink("alternate","en",en.href);
  setLink("alternate","x-default",pt.href);
}
function updatePageSeo(path){
  const image=location.origin+"/social-preview.png?v=20260922-1";
  const current=new URL(location.href);
  if(path==="/"){
    updateSeo({title:"Nexauren Story",description:lang==="en"?"Official stories, launches, guides and updates from the Nexauren ecosystem.":"Histórias, lançamentos, guias e atualizações oficiais do ecossistema Nexauren.",image,url:new URL("/"+(lang==="en"?"?lang=en":""),location.origin).href});
  }else if(path==="/posts"){
    updateSeo({title:lang==="en"?"Latest stories":"Mais recentes",description:lang==="en"?"Browse the latest stories, launches, guides and updates from Nexauren.":"Veja as histórias, lançamentos, guias e atualizações mais recentes da Nexauren.",image,url:hrefFor("/posts")&&new URL(hrefFor("/posts"),location.origin).href});
  }else if(path==="/about"){
    updateSeo({title:lang==="en"?"About Nexauren Story":"Sobre o Nexauren Story",description:lang==="en"?"The official public home for Nexauren products, applications, ideas and milestones.":"O espaço público oficial para produtos, aplicações, ideias e marcos da Nexauren.",image,url:new URL(hrefFor("/about"),location.origin).href});
  }else if(path==="/search"){
    updateSeo({title:lang==="en"?"Search":"Pesquisar",description:lang==="en"?"Search Nexauren Story.":"Pesquisar no Nexauren Story.",image,robots:"noindex,follow",url:new URL(hrefFor("/search"+(current.search||"")),location.origin).href});
  }else{
    const cat=cats.find(x=>x[0]===path.slice(1));
    if(cat){
      const descriptions={
        "breaking-news":lang==="en"?"Urgent news and recent events.":"Notícias urgentes e acontecimentos recentes.",
        "tecnologia":lang==="en"?"Technology, innovation and digital products.":"Tecnologia, inovação e produtos digitais.",
        "entretenimento":lang==="en"?"Music, video, games and culture.":"Música, vídeo, jogos e cultura.",
        "nexauren":lang==="en"?"Products, apps and Nexauren projects.":"Produtos, aplicativos e projetos Nexauren.",
        "eventos":lang==="en"?"Events and live launches.":"Eventos e lançamentos ao vivo.",
        "ferramentas":lang==="en"?"Tools and utilities.":"Ferramentas e utilitários."
      };
      updateSeo({title:catLabel(cat[0],cat[1]),description:descriptions[cat[0]]||cat[3]||"Explore stories and updates.",image,url:new URL(hrefFor("/"+cat[0]),location.origin).href});
    }
  }
}
function setLanguage(next,persist=true){
  lang=next==="en"?"en":"pt";
  document.documentElement.lang=lang;
  document.cookie="ns_lang="+lang+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
  if(persist)localStorage.setItem("ns_lang",lang);
  const current=new URL(location.href);
  if(lang==="en")current.searchParams.set("lang","en");else current.searchParams.delete("lang");
  history.replaceState(null,"",current.pathname+(current.search?"?"+current.searchParams.toString():""));
  document.getElementById("language-button")?.setAttribute("aria-label",lang==="en"?"Português":"English");
}

function openLanguage(){
  let box=document.getElementById("language-choice");if(!box){box=document.createElement("div");box.id="language-choice";box.className="language-overlay";box.innerHTML='<div class="language-card" role="dialog" aria-modal="true"><div class="language-mark">N</div><div class="eyebrow">Nexauren Story</div><h2>'+t("languageTitle")+'</h2><p>'+t("languageText")+'</p><div class="language-options"><button data-lang="pt">'+t("continuePt")+'</button><button data-lang="en">'+t("continueEn")+'</button></div></div>';document.body.appendChild(box);box.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{setLanguage(b.dataset.lang);box.remove();route();});}else{box.querySelector(".language-card").innerHTML='<div class="language-mark">N</div><div class="eyebrow">Nexauren Story</div><h2>'+t("languageTitle")+'</h2><p>'+t("languageText")+'</p><div class="language-options"><button data-lang="pt">'+t("continuePt")+'</button><button data-lang="en">'+t("continueEn")+'</button></div>';box.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{setLanguage(b.dataset.lang);box.remove();route();});}
}
function trackPageView(){
  if(typeof window.gtag!=="function")return;
  window.gtag("event","page_view",{page_title:document.title,page_location:location.href,page_path:location.pathname+location.search});
}
function card(p){
  const link=hrefFor("/post/"+encodeURIComponent(p.slug));
  const media=p.cover_url?'<img loading="lazy" decoding="async" src="'+esc(p.cover_url)+'" alt="'+esc(p.title)+'"'+(p.cover_width?' width="'+esc(p.cover_width)+'"':'')+(p.cover_height?' height="'+esc(p.cover_height)+'"':'')+'>':'<span class="card-placeholder">N</span>';
  return '<article class="card"><a href="'+link+'"><div class="card-media">'+media+'</div><div class="card-body"><div class="meta"><span class="pill">'+esc(catLabel(p.category_slug,p.category_name||typeLabel(p.type)))+'</span><span>·</span><span>'+date(p.published_at)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(excerpt(p))+'</p><span class="read-more">'+t("read")+'</span></div></a></article>';
}

function categoryTile(c){
  const [slug,name,icon,desc]=c;const count=c[4]??null;
  const enDesc={"tecnologia":"Technology, innovation and digital products.","entretenimento":"Music, video, games and culture.","nexauren":"Products, apps and Nexauren projects.","eventos":"Events and live launches.","ferramentas":"Tools and utilities.","breaking-news":"Urgent news and recent events."}[slug];
  return '<a class="category-tile" href="'+hrefFor("/"+encodeURIComponent(slug))+'"><span class="category-icon">'+esc(icon||"✦")+'</span><span class="category-name">'+esc(catLabel(slug,name))+'</span><span class="category-desc">'+esc(lang==="en"?(enDesc||desc||"Explore stories and updates."):desc||"")+'</span><span class="category-arrow">→</span>'+(count!==null?'<small>'+count+" "+(lang==="en"?"posts":"publicações")+'</small>':"")+'</a>';
}

async function loadCategories(){
  try{const d=await api("/api/categories");if((d.categories||[]).length)cats=d.categories.map(c=>[c.slug,c.name,c.icon,c.description,c.post_count]);}
  catch{cats=FALLBACK_CATS.slice();}
}
function setup(){
  setLanguage(lang||"pt",false);
  nav.innerHTML='<a href="'+hrefFor("/")+'" data-n="home">'+t("home")+"</a>"+cats.map(c=>'<a href="'+hrefFor("/"+c[0])+'" data-n="'+c[0]+'">'+esc(catLabel(c[0],c[1]))+"</a>").join("")+'<a href="/tool/">Ferramentas</a><a href="/account">Conta</a><a href="/legal/privacidade/">Legal</a>';
  let mobile=document.querySelector(".mobile-nav");
  if(!mobile){mobile=document.createElement("div");mobile.className="mobile-nav";document.querySelector(".site-header").appendChild(mobile);}
  mobile.innerHTML=nav.innerHTML+'<button class="mobile-lang" id="mobile-language">'+(lang==="en"?"PT":"EN")+"</button>";
  let lb=document.getElementById("language-button");
  if(!lb){lb=document.createElement("button");lb.id="language-button";lb.className="language-button";lb.type="button";lb.textContent=lang==="en"?"PT":"EN";document.querySelector(".header-actions").insertBefore(lb,document.getElementById("menu-toggle"));}else lb.textContent=lang==="en"?"PT":"EN";
  lb.onclick=openLanguage;
  document.getElementById("mobile-language")?.addEventListener("click",openLanguage);
  document.getElementById("search-toggle").setAttribute("aria-label",t("search"));
  document.getElementById("menu-toggle").setAttribute("aria-label",t("menu"));
  document.getElementById("search-input").placeholder=lang==="en"?"Search Nexauren Story…":"Pesquisar no Nexauren Story…";
  const submit=document.getElementById("search-submit");if(submit)submit.textContent=t("search");
  const fd=document.getElementById("footer-description"),fe=document.getElementById("footer-explore"),fr=document.getElementById("footer-resources");
  if(fd)fd.textContent=t("footer");if(fe)fe.textContent=lang==="en"?"Explore":"Explorar";if(fr)fr.textContent=t("resources");
  const fc=document.getElementById("footer-cats");if(fc)fc.innerHTML=cats.slice(0,6).map(x=>'<a href="'+hrefFor("/"+x[0])+'">'+esc(catLabel(x[0],x[1]))+"</a>").join("")+'<a href="/legal/privacidade/">Privacidade</a><a href="/legal/termos/">Termos</a><a href="/legal/cookies/">Cookies</a>';
  document.getElementById("search-toggle").onclick=()=>{searchPanel.classList.toggle("open");if(searchPanel.classList.contains("open"))searchInput.focus();};
  searchForm.onsubmit=e=>{e.preventDefault();const q=searchInput.value.trim();if(q)location.href=hrefFor("/search?q="+encodeURIComponent(q));};
  document.getElementById("menu-toggle").onclick=()=>document.querySelector(".mobile-nav")?.classList.toggle("open");
  document.getElementById("year").textContent=new Date().getFullYear();
  const rawPath=location.pathname;const blogPath=rawPath===BLOG_BASE||rawPath===BLOG_BASE+"/"?"/":(rawPath.startsWith(BLOG_BASE+"/")?rawPath.slice(BLOG_BASE.length):rawPath);const p=blogPath==="/"?"home":blogPath.split("/")[1]||"home";document.querySelectorAll("[data-n]").forEach(a=>a.classList.toggle("active",a.dataset.n===p));
  if(!localStorage.getItem("ns_lang")&&!urlLanguage)setTimeout(openLanguage,120);
}

async function home(){
  app.innerHTML='<section class="hero"><div class="hero-copy"><div class="eyebrow">'+t("official")+'</div><h1>'+(lang==="en"?"The story behind everything Nexauren.":"A história por trás de tudo o que é Nexauren.")+'</h1><p>'+(lang==="en"?"News, launches, app updates, guides, tutorials and ideas shaping the ecosystem.":"Notícias, lançamentos, atualizações, guias, tutoriais e ideias que moldam o ecossistema.")+'</p></div><div class="hero-card"><div class="hero-orbit"><span>N</span></div><div><div class="eyebrow">NEXAUREN STORY</div><p class="hero-note">'+(lang==="en"?"One place for the latest from the ecosystem.":"Um só lugar para acompanhar as novidades do ecossistema.")+'</p></div></div></section><section class="section"><div class="section-head"><div><h2>'+t("explore")+'</h2><p>'+t("exploreDesc")+'</p></div></div><div id="cat-grid" class="category-grid"></div></section><section class="section" id="featured"></section><section class="section"><div class="section-head"><div><h2>'+t("latest")+'</h2><p>'+t("latestDesc")+'</p></div><a class="read-more" href="'+hrefFor("/posts")+'">'+t("viewAll")+'</a></div><div id="latest" class="grid"></div></section>';
  const [cd,pp]=await Promise.all([api("/api/categories").catch(()=>({categories:[]})),api(langQuery("/api/posts?limit=12"))]);
  if((cd.categories||[]).length)cats=cd.categories.map(c=>[c.slug,c.name,c.icon,c.description,c.post_count]);
  document.getElementById("cat-grid").innerHTML=cats.map(categoryTile).join("");
  const ps=pp.posts||[],f=ps.find(p=>p.featured)||ps[0],side=ps.filter(p=>!f||p.slug!==f.slug).slice(0,2);
  if(f){
    const sideHtml=side.map(card).join("")||'<div class="empty">'+t("nothing")+"</div>";
    document.getElementById("featured").innerHTML='<div class="section-head"><h2>'+t("featured")+'</h2><span class="eyebrow">'+(lang==="en"?"Editor’s pick":"Seleção editorial")+'</span></div><div class="featured-layout"><section class="featured-primary"><a class="featured-media" href="'+hrefFor("/post/"+encodeURIComponent(f.slug))+'">'+(f.cover_url?'<img loading="eager" fetchpriority="high" decoding="async" src="'+esc(f.cover_url)+'" alt="'+esc(f.title)+'">':'<span class="featured-placeholder">N</span>')+'</a><div class="featured-copy"><div class="pill">'+esc(catLabel(f.category_slug,f.category_name||typeLabel(f.type)))+'</div><h2>'+esc(f.title)+'</h2><p>'+esc(excerpt(f))+'</p><a class="read-more" href="'+hrefFor("/post/"+encodeURIComponent(f.slug))+'">'+t("read")+'</a></div></section><div class="featured-secondary">'+sideHtml+'</div></div>';
  }else document.getElementById("featured").innerHTML="";
  document.getElementById("latest").innerHTML=ps.length?ps.slice(0,12).map(card).join(""):'<div class="empty">'+t("nothing")+"</div>";
}

async function allPosts(){
  app.innerHTML='<section class="listing-head"><div class="eyebrow">Nexauren Story</div><h1>'+t("latest")+'</h1><p>'+t("latestDesc")+'</p></section><div id="list" class="grid"></div>';
  const ps=(await api(langQuery("/api/posts?limit=60"))).posts||[];
  document.getElementById("list").innerHTML=ps.length?ps.map(card).join(""):'<div class="empty">'+t("nothing")+"</div>";
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
    const description=p.meta_description||p.excerpt||excerpt(p);
    const canonical=new URL(location.pathname,location.origin);if(lang==="en")canonical.searchParams.set("lang","en");
    const canonicalUrl=(lang==="en"&&!p.translation_available)?new URL(location.pathname,location.origin).href:canonical.href;
    updateSeo({title:p.meta_title||p.title,description,type:"article",image:new URL(p.social_image||p.cover_url||"/social-preview.png",location.origin).href,url:canonicalUrl,hasEnglish:p.translation_available,robots:(lang==="en"&&!p.translation_available)?"noindex,follow":undefined});
    const translationNotice=(lang==="en"&&!p.translation_available)?'<div class="translation-note">'+t("translationFallback")+"</div>":"";
    const words=String(p.content||"").replace(/https?:\/\/\S+|[#*_\x60>\[\](){}/!-]/g," ").trim().split(/\s+/).filter(Boolean).length;
    const reading=Math.max(1,Math.round(words/200));
    const cover=p.cover_url?'<img class="article-cover" loading="eager" fetchpriority="high" decoding="async" src="'+esc(p.cover_url)+'" alt="'+esc(p.cover_alt||p.title)+'"'+(p.cover_width?' width="'+esc(p.cover_width)+'"':'')+(p.cover_height?' height="'+esc(p.cover_height)+'"':'')+'>':"";
    const shareUrl=canonical.href;
    const encodedShareUrl=encodeURIComponent(shareUrl);
    const encodedTitle=encodeURIComponent(p.title||"Nexauren Story");
    const socialActions='<a class="share-button share-link share-whatsapp" href="https://wa.me/?text='+encodedTitle+'%20'+encodedShareUrl+'" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="share-button share-link" href="https://t.me/share/url?url='+encodedShareUrl+'&text='+encodedTitle+'" target="_blank" rel="noopener noreferrer">Telegram</a><a class="share-button share-link" href="https://www.facebook.com/sharer/sharer.php?u='+encodedShareUrl+'" target="_blank" rel="noopener noreferrer">Facebook</a><a class="share-button share-link" href="https://twitter.com/intent/tweet?text='+encodedTitle+'&url='+encodedShareUrl+'" target="_blank" rel="noopener noreferrer">X</a>';
    app.innerHTML='<article class="article"><div class="meta"><span class="pill">'+esc(catLabel(p.category_slug,p.category_name||typeLabel(p.type)))+'</span><span>·</span><span>'+date(p.published_at)+'</span><span>·</span><span>'+reading+" "+(lang==="en"?"min read":"min de leitura")+'</span></div><h1>'+esc(p.title)+'</h1>'+(p.excerpt?'<div class="article-excerpt">'+esc(p.excerpt)+"</div>":"")+cover+translationNotice+'<div class="article-actions"><button id="share-story" class="share-button" type="button">↗ '+(lang==="en"?"Share":"Partilhar")+'</button>'+socialActions+'<button id="copy-story" class="share-button share-secondary" type="button">▣ '+(lang==="en"?"Copy link":"Copiar link")+'</button></div><div class="article-content">'+md(p.content)+"</div>"+((p.tags||[]).length?'<div class="tags">'+p.tags.map(x=>'<span class="tag">#'+esc(x.name)+"</span>").join("")+"</div>":"")+'<section class="related-section"><div class="section-head"><h2>'+t("related")+'</h2></div><div id="related" class="grid"></div></section></article>';
    document.getElementById("share-story")?.addEventListener("click",async()=>{
      try{
        if(navigator.share){await navigator.share({title:p.title,text:p.excerpt||p.title,url:shareUrl});return;}
        await navigator.clipboard.writeText(shareUrl);
        const b=document.getElementById("share-story");if(b){b.textContent="✓ "+(lang==="en"?"Copied":"Copiado");setTimeout(()=>b.textContent="↗ "+(lang==="en"?"Share":"Partilhar"),1800);}
      }catch{}
    });
    document.getElementById("copy-story")?.addEventListener("click",async()=>{
      try{
        await navigator.clipboard.writeText(shareUrl);
        const b=document.getElementById("copy-story");if(b){b.textContent="✓ "+(lang==="en"?"Copied":"Copiado");setTimeout(()=>b.textContent="▣ "+(lang==="en"?"Copy link":"Copiar link"),1800);}
      }catch{}
    });
    await loadPostAds();
    const articleEl=document.querySelector(".article");
    if(articleEl&&window.NexaurenAds){
      articleEl.querySelector('[data-nx-ad-position="top"]')?.remove();
      articleEl.querySelector('[data-nx-ad-position="bottom"]')?.remove();
      const makeAdSlot=position=>{
        const el=document.createElement("div");
        el.dataset.nxAdPosition=position;
        el.className="nx-ad-slot nx-ad-"+position;
        el.setAttribute("aria-label","Advertisement");
        el.setAttribute("role","complementary");
        el.style.cssText="width:100%;min-height:60px;display:flex;align-items:center;justify-content:center;margin:18px 0;overflow:hidden;clear:both";
        return el;
      };
      const topAd=makeAdSlot("top");
      const bottomAd=makeAdSlot("bottom");
      articleEl.insertBefore(topAd,articleEl.firstElementChild||null);
      const related=articleEl.querySelector(".related-section");
      articleEl.insertBefore(bottomAd,related||null);
      window.NexaurenAds.loadBanner(topAd);
      window.NexaurenAds.loadResponsive(bottomAd);
    }
    const related=(await api(langQuery("/api/posts?category="+encodeURIComponent(p.category_slug||"")+"&limit=6"))).posts||[];
    document.getElementById("related").innerHTML=related.filter(x=>x.slug!==p.slug).slice(0,3).map(card).join("")||'<div class="empty">'+t("nothing")+"</div>";
  }catch(e){
    app.innerHTML='<div class="empty"><h2>'+t("notFound")+'</h2><p>'+esc(e.message)+'</p><a class="read-more" href="'+hrefFor("/")+'">'+t("back")+" →</a></div>";
  }
}

function about(){app.innerHTML='<section class="listing-head"><div class="eyebrow">'+t("about")+'</div><h1>Nexauren Story</h1><p>'+(lang==="en"?"A public home for Nexauren products, applications, ideas and milestones.":"Um espaço público para produtos, aplicações, ideias e marcos da Nexauren.")+'</p></section><section class="section"><div class="featured"><div class="featured-copy"><div class="pill">NEXAUREN</div><h2>'+(lang==="en"?"Build. Explain. Share the story.":"Construir. Explicar. Partilhar a história.")+'</h2><p>'+t("footer")+'</p></div><div class="hero-card"><div class="hero-orbit"><span>N</span></div><p style="color:var(--muted)">nexaurenstory.com</p></div></div></section>'}
function notFound(){updateSeo({title:"404 — "+(lang==="en"?"Page not found":"Página não encontrada")+" · Nexauren Story",description:lang==="en"?"The page you requested could not be found.":"A página que procura não foi encontrada.",robots:"noindex,follow",url:location.href});app.innerHTML='<section class="blog-404"><div class="blog-404-card"><span class="blog-404-kicker">Nexauren Story</span><div class="blog-404-code">404</div><h1 class="blog-404-title">'+(lang==="en"?"This page went off the map.":"Esta página saiu do mapa.")+'</h1><p class="blog-404-copy">'+(lang==="en"?"The address may be wrong, the page may have moved, or it may no longer exist.":"O endereço pode estar incorreto, ter sido movido ou já não existir.")+'</p><div class="blog-404-actions"><a class="blog-404-primary" href="'+hrefFor("/")+'">'+(lang==="en"?"← Back home":"← Voltar ao início")+'</a><a class="blog-404-secondary" href="'+hrefFor("/posts")+'">'+(lang==="en"?"Explore stories →":"Explorar histórias →")+'</a><a class="blog-404-secondary" href="/tool/">Ferramentas</a></div></div></section>'}

async function route(){
  await loadCategories();
  setup();
  const rawPath=location.pathname;
  const p=rawPath===BLOG_BASE||rawPath===BLOG_BASE+"/"?"/":(rawPath.startsWith(BLOG_BASE+"/")?rawPath.slice(BLOG_BASE.length):rawPath);
  let result;
  if(p.startsWith("/post/"))result=await post(decodeURIComponent(p.slice(6)));
  else{
    updatePageSeo(p);
    if(p.startsWith("/search"))result=await search(new URLSearchParams(location.search).get("q")||"");
    else if(p==="/about")result=about();
    else if(p==="/posts")result=allPosts();
    else if(p==="/")result=home();
    else{
      const c=cats.find(x=>x[0]===p.slice(1));
      result=c?listing(c[0],c[1]):notFound();
    }
  }
  trackPageView();
  return result;
}
route().catch(e=>{console.error(e);const ready=e.code==="DB_NOT_READY";app.innerHTML='<div class="empty"><h2>'+ (ready?t("dbTitle"):(lang==="en"?"Unable to load this page":"Não foi possível carregar esta página")) +'</h2><p>'+esc(ready?t("dbText"):(e.message||"Tente novamente."))+'</p></div>';});