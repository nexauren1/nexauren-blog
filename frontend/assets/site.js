(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  document.documentElement.classList.add("nx-enhanced");

  function ensureProgress(){
    if($(".nx-progress")) return;
    const el=document.createElement("div");
    el.className="nx-progress";
    document.body.appendChild(el);
    const update=()=>{
      const max=document.documentElement.scrollHeight-window.innerHeight;
      el.style.width=(max>0?Math.min(100,Math.max(0,window.scrollY/max*100)):0)+"%";
    };
    window.addEventListener("scroll",update,{passive:true});
    window.addEventListener("resize",update,{passive:true});
    update();
  }

  function closePanel(button,panel){
    if(!panel)return;
    panel.classList.remove("open");
    button?.setAttribute("aria-expanded","false");
  }

  function ensureResponsiveNav(){
    const header=document.querySelector("body>header");
    if(!header||header.querySelector(".menu-toggle,.tool-menu,.nx-auto-menu"))return;
    const nav=header.querySelector("nav");
    if(!nav)return;
    const button=document.createElement("button");
    button.className="menu-toggle nx-auto-menu";
    button.type="button";
    button.setAttribute("aria-label","Abrir menu");
    button.setAttribute("aria-expanded","false");
    button.innerHTML="<span></span>";
    const links=[...nav.querySelectorAll("a")].map(a=>({href:a.getAttribute("href"),text:(a.textContent||"").trim()})).filter(x=>x.href&&x.text);
    if(!links.length)return;
    const panel=document.createElement("div");
    panel.className="mobile-menu nx-auto-mobile";
    panel.innerHTML='<div style="width:min(1160px,calc(100% - 24px));margin:auto">'+[...links,{href:"/legal/privacidade/",text:"Privacidade"},{href:"/legal/termos/",text:"Termos"},{href:"/legal/cookies/",text:"Cookies"}].filter((x,i,a)=>a.findIndex(y=>y.href===x.href)===i).map(x=>'<a href="'+String(x.href).replaceAll('"',"&quot;")+'">'+String(x.text).replace(/[&<>]/g,"")+"</a>").join("")+"</div>";
    header.querySelector(".nav")?.appendChild(button) || header.firstElementChild?.appendChild(button);
    header.appendChild(panel);
  }

  function setupMenus(){
    const pairs=[
      [".menu-toggle",".mobile-menu"],
      [".menu-toggle",".mobile-nav"],
      [".tool-menu",".tool-mobile"]
    ];
    for(const [buttonSelector,panelSelector] of pairs){
      const button=$(buttonSelector),panel=$(panelSelector);
      if(!button||!panel||button.dataset.nxBound)continue;
      button.dataset.nxBound="1";
      button.addEventListener("click",()=>{
        const open=!panel.classList.contains("open");
        panel.classList.toggle("open",open);
        button.setAttribute("aria-expanded",String(open));
      });
      panel.addEventListener("click",e=>{if(e.target.closest("a"))closePanel(button,panel)});
      document.addEventListener("keydown",e=>{if(e.key==="Escape")closePanel(button,panel)});
      document.addEventListener("click",e=>{
        if(!panel.contains(e.target)&&!button.contains(e.target))closePanel(button,panel);
      });
    }
  }

  function ensureAutoNavigation(){
    if(document.querySelector("header")) return;
    const header=document.createElement("header");
    header.className="nx-auto-header";
    header.innerHTML='<div style="width:min(1160px,calc(100% - 24px));margin:auto"><div class="nav"><a class="brand" href="/" aria-label="Nexauren"><img class="brand-logo" src="/nexauren-story-favicon.svg" alt="" width="42" height="42"><span class="brand-copy"><strong>Nexauren</strong><span>Story</span></span></a><nav class="nav-links" aria-label="Navegação principal"><a href="/blog/">Blog</a><a href="/tool/">Ferramentas</a><a href="/account">Conta</a></nav><button class="menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span></button></div><div class="mobile-menu"><div style="width:min(1160px,calc(100% - 24px));margin:auto"><a href="/blog/">Blog</a><a href="/tool/">Ferramentas</a><a href="/account">Conta</a><a href="/legal/privacidade/">Privacidade</a><a href="/legal/termos/">Termos</a><a href="/legal/cookies/">Cookies</a></div></div></div>';
    document.body.prepend(header);
  }

  function ensureAutoFooter(){
    if(document.querySelector("footer")) return;
    const footer=document.createElement("footer");
    footer.className="nx-auto-footer site-footer";
    footer.innerHTML='<div style="width:min(1160px,calc(100% - 24px));margin:auto"><div class="nx-footer-grid"><div><div style="font-weight:950">Nexauren Story</div><p class="nx-footer-copy">Conteúdo, ferramentas e experiências num só ecossistema.</p></div><div><div class="nx-footer-title">Explorar</div><a class="nx-footer-link" href="/blog/">Blog</a><a class="nx-footer-link" href="/tool/">Ferramentas</a><a class="nx-footer-link" href="/account">Conta</a></div><div><div class="nx-footer-title">Legal</div><a class="nx-footer-link" href="/legal/privacidade/">Privacidade</a><a class="nx-footer-link" href="/legal/termos/">Termos</a><a class="nx-footer-link" href="/legal/cookies/">Cookies</a></div></div><div class="nx-footer-bottom"><div><span>© 2026 Nexauren Story</span><span>Uma experiência Nexauren.</span></div></div></div>';
    document.body.appendChild(footer);
  }

  function activeNav(){
    const path=window.location.pathname.replace(/\/+$/,"")||"/";
    $$("nav a").forEach(a=>{
      const href=a.getAttribute("href");
      if(!href||/^https?:/i.test(href)||href==="#")return;
      try{
        const target=new URL(href,window.location.origin).pathname.replace(/\/+$/,"")||"/";
        const active=(target==="/"&&path==="/")||(target!=="/"&&(path===target||path.startsWith(target+"/")));
        if(active)a.setAttribute("aria-current","page");
      }catch{}
    });
  }

  function reveal(){
    const targets=$$(".door,.tool-card,.mini-card,.tool-overview,.account-card,article,.panel-card,.hero-panel,.tool,.nx-reveal");
    targets.forEach((el,i)=>{
      if(el.classList.contains("nx-reveal"))return;
      el.classList.add("nx-reveal","nx-stagger");
      el.style.transitionDuration=reduce?"0ms":(420+Math.min(i,6)*35)+"ms";
    });
    if(reduce){targets.forEach(x=>x.classList.add("is-visible"));return;}
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}
    },{threshold:.08,rootMargin:"0px 0px -40px 0px"});
    targets.forEach(x=>observer.observe(x));
  }

  function spotlight(){
    if(reduce)return;
    $$(".nx-spotlight,.door,.tool-card,.tool-overview").forEach(el=>{
      el.addEventListener("pointermove",e=>{
        const r=el.getBoundingClientRect();
        el.style.setProperty("--nx-px",(e.clientX-r.left)+"px");
        el.style.setProperty("--nx-py",(e.clientY-r.top)+"px");
      });
    });
  }

  function ripple(){
    if(reduce)return;
    document.addEventListener("pointerdown",e=>{
      const target=e.target.closest("button,.button,.primary,.secondary,.google,.logout,.nx-action,.actions button");
      if(!target||target.disabled)return;
      const r=target.getBoundingClientRect();
      const dot=document.createElement("span");
      dot.style.cssText='position:absolute;width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.45);pointer-events:none;left:'+(e.clientX-r.left-5)+'px;top:'+(e.clientY-r.top-5)+'px;transform:scale(1);transition:transform .55s ease,opacity .55s ease;opacity:.8;z-index:2';
      target.appendChild(dot);
      requestAnimationFrame(()=>{dot.style.transform="scale(24)";dot.style.opacity="0"});
      setTimeout(()=>dot.remove(),600);
    });
  }

  function transitions(){
    if(reduce)return;
    document.addEventListener("click",e=>{
      const a=e.target.closest("a");
      if(!a||a.target==="_blank"||a.hasAttribute("download")||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      const u=new URL(a.href,location.href);
      if(u.origin!==location.origin||u.pathname.startsWith("/blog/")||u.pathname==="/blog")return;
      if(u.pathname===location.pathname&&u.search===location.search)return;
      document.body.classList.add("nx-leaving");
      setTimeout(()=>document.body.classList.remove("nx-leaving"),220);
    });
  }

  function keyboardHints(){
    const link=$(".nx-skip");
    if(link)return;
    const main=$("main");
    if(!main)return;
    if(!main.id)main.id="main-content";
    const a=document.createElement("a");
    a.className="nx-skip";
    a.href="#main-content";
    a.textContent="Saltar para o conteúdo";
    a.style.cssText="position:fixed;left:12px;top:10px;z-index:1001;padding:8px 12px;border-radius:10px;background:#0b1020;color:#fff;font-size:11px;font-weight:900;transform:translateY(-150%);transition:transform .2s ease";
    a.addEventListener("focus",()=>a.style.transform="translateY(0)");
    a.addEventListener("blur",()=>a.style.transform="translateY(-150%)");
    document.body.prepend(a);
  }

  function boot(){
    ensureAutoNavigation();
    ensureAutoFooter();
    ensureProgress();
    ensureResponsiveNav();
    setupMenus();
    activeNav();
    reveal();
    spotlight();
    ripple();
    transitions();
    keyboardHints();
    document.body.classList.add("nx-ready");
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();