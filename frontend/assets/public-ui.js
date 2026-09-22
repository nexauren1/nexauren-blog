/* Nexauren Public Experience — shared behavior for non-blog pages. */
(() => {
  "use strict";
  const config=Object.freeze({
    reducedMotion:window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    selectors:Object.freeze({menuButton:"[data-nx-menu]",menuPanel:"[data-nx-panel]",reveal:".nx-reveal,[data-nx-reveal]",spotlight:".nx-spotlight,.tool-card"}),
    routes:Object.freeze({home:"/",blog:"/blog/",tools:"/tool/",account:"/account",legal:"/legal/privacidade/"})
  });
  const $=(s,scope=document)=>scope.querySelector(s);
  const $$=(s,scope=document)=>[...scope.querySelectorAll(s)];
  const currentPath=()=>{const p=window.location.pathname||"/";return p.length>1?p.replace(/\/+$/,""):"/";};

  function setActiveNavigation(){
    const path=currentPath();
    $$("header nav a").forEach(link=>{
      const href=link.getAttribute("href");if(!href||!href.startsWith("/"))return;
      const target=href.split("#")[0].replace(/\/+$/,"")||"/";
      const matches=target===path||(target==="/blog"&&path.startsWith("/blog/"))||(target==="/tool"&&path.startsWith("/tool/"))||(target==="/legal/privacidade"&&path.startsWith("/legal/"));
      if(matches)link.setAttribute("aria-current","page");else if(link.getAttribute("aria-current")==="page")link.removeAttribute("aria-current");
    });
  }

  function ensureLegalNavigation(){
    $$("header nav").forEach(nav=>{
      const hasLegal=$$("a",nav).some(a=>String(a.getAttribute("href")||"").startsWith("/legal/"));
      if(hasLegal)return;
      const a=document.createElement("a");a.href="/legal/privacidade/";a.textContent="Legal";nav.appendChild(a);
    });
  }

  function initMenus(){
    const pairs=[
      ...$$(config.selectors.menuButton).map(button=>({button,panel:button.closest("header")?.querySelector(config.selectors.menuPanel)})),
      ...$$(".menu-toggle").map(button=>({button,panel:button.closest("header")?.querySelector(".mobile-menu,.mobile-nav,.tool-mobile")})),
      ...$$(".tool-menu").map(button=>({button,panel:button.closest("header")?.querySelector(".tool-mobile")}))
    ].filter(x=>x.button&&x.panel&&x.button.dataset.nxMenuBound!=="1");
    if(!pairs.length)return;
    pairs.forEach(({button,panel})=>{
      button.dataset.nxMenuBound="1";
      const sync=open=>{
        button.setAttribute("aria-expanded",String(open));
        button.setAttribute("aria-label",open?"Fechar menu":"Abrir menu");
        panel.classList.toggle("open",open);
        document.body.classList.toggle("nx-menu-open",open);
      };
      button.addEventListener("click",()=>sync(!panel.classList.contains("open")));
      $$("a",panel).forEach(a=>a.addEventListener("click",()=>sync(false)));
      sync(panel.classList.contains("open"));
    });
    if(!document.body.dataset.nxMenuGlobal){
      document.body.dataset.nxMenuGlobal="1";
      document.addEventListener("keydown",event=>{
        if(event.key!=="Escape")return;
        $$(".nx-menu-open").forEach(()=>document.body.classList.remove("nx-menu-open"));
        $$(".mobile-menu.open,.mobile-nav.open,.tool-mobile.open").forEach(panel=>{
          panel.classList.remove("open");
          panel.closest("header")?.querySelector(".menu-toggle,.tool-menu,[data-nx-menu]")?.setAttribute("aria-expanded","false");
        });
      });
    }
  }

  function initReveal(){
    if(!config.reducedMotion)document.documentElement.classList.add("nx-motion");
    const autoCandidates=$("main > section,main > article,main .legal-article");
    autoCandidates.forEach(node=>{if(!node.classList.contains("nx-reveal"))node.classList.add("nx-reveal");});
    const nodes=$(config.selectors.reveal);if(!nodes.length)return;
    if(config.reducedMotion||!("IntersectionObserver"in window)){nodes.forEach(n=>n.classList.add("nx-visible"));return;}
    const observer=new IntersectionObserver((entries,obs)=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add("nx-visible");obs.unobserve(entry.target);}),{threshold:.12,rootMargin:"0px 0px -8% 0px"});
    nodes.forEach((node,index)=>{if(!node.dataset.nxRevealOrder)node.style.transitionDelay=Math.min(index*45,360)+"ms";observer.observe(node);});
  }

  function initSpotlight(){
    if(config.reducedMotion)return;
    $$(config.selectors.spotlight).forEach(card=>{
      card.addEventListener("pointermove",event=>{const r=card.getBoundingClientRect();card.style.setProperty("--nx-x",(event.clientX-r.left)+"px");card.style.setProperty("--nx-y",(event.clientY-r.top)+"px");},{passive:true});
      card.addEventListener("pointerleave",()=>{card.style.removeProperty("--nx-x");card.style.removeProperty("--nx-y");},{passive:true});
    });
  }

  function initScrollProgress(){
    let bar=$(".nx-scroll-progress");
    if(!bar){bar=document.createElement("div");bar.className="nx-scroll-progress";bar.setAttribute("aria-hidden","true");document.body.prepend(bar);}
    const update=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;bar.style.transform="scaleX("+(max>0?Math.min(1,Math.max(0,window.scrollY/max)):0)+")";};
    update();window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update,{passive:true});
  }

  function initTopButton(){
    let button=$(".nx-top");
    if(!button){button=document.createElement("button");button.className="nx-top";button.type="button";button.setAttribute("aria-label","Voltar ao topo");button.innerHTML="↑";document.body.appendChild(button);}
    const toggle=()=>button.classList.toggle("visible",window.scrollY>480);toggle();
    button.addEventListener("click",()=>window.scrollTo({top:0,behavior:config.reducedMotion?"auto":"smooth"}));
    window.addEventListener("scroll",toggle,{passive:true});
  }

  function initSkipLink(){
    if($(".nx-skip"))return;const main=$("main");if(!main)return;if(!main.id)main.id="conteudo";
    const a=document.createElement("a");a.className="nx-skip";a.href="#"+main.id;a.textContent="Saltar para o conteúdo";document.body.prepend(a);
  }

  function updateYears(){const year=String(new Date().getFullYear());$$("[id='year']").forEach(el=>{el.textContent=year;});}

  function exposeApi(){window.NexaurenUI=Object.freeze({config,initReveal,initMenus,initSpotlight,initScrollProgress,initTopButton,initHeaderMotion,initCursorGlow,initButtonFeedback,initPageTransition,setActiveNavigation,refresh(){setActiveNavigation();initReveal();initSpotlight();}});}

  function initHeaderMotion(){
    const headers=$("header");
    if(!headers.length)return;
    const update=()=>headers.forEach(header=>header.classList.toggle("nx-scrolled",window.scrollY>10));
    update();window.addEventListener("scroll",update,{passive:true});
  }

  function initCursorGlow(){
    if(config.reducedMotion||window.matchMedia("(pointer:coarse)").matches)return;
    let glow=$(".nx-cursor-glow");
    if(!glow){glow=document.createElement("div");glow.className="nx-cursor-glow";glow.setAttribute("aria-hidden","true");document.body.appendChild(glow);}
    let raf=0,x=0,y=0;
    const move=e=>{x=e.clientX;y=e.clientY;if(raf)return;raf=requestAnimationFrame(()=>{glow.style.transform="translate3d("+x+"px,"+y+"px,0) translate(-50%,-50%)";raf=0;});};
    window.addEventListener("pointermove",move,{passive:true});
    document.body.classList.add("nx-pointer-ready");
  }

  function initButtonFeedback(){
    if(config.reducedMotion)return;
    document.addEventListener("pointerdown",event=>{
      const target=event.target.closest("button,.button,.primary,.secondary,.google,.logout,.nx-action");
      if(!target||target.disabled||target.dataset.nxRipple)return;
      const rect=target.getBoundingClientRect(),ripple=document.createElement("i");
      target.dataset.nxRipple="1";
      ripple.setAttribute("aria-hidden","true");
      ripple.style.cssText="position:absolute;width:12px;height:12px;border-radius:50%;pointer-events:none;background:rgba(255,255,255,.42);left:"+(event.clientX-rect.left-6)+"px;top:"+(event.clientY-rect.top-6)+"px;transform:scale(1);opacity:.75;transition:transform .5s ease,opacity .5s ease";
      target.appendChild(ripple);
      requestAnimationFrame(()=>{ripple.style.transform="scale(20)";ripple.style.opacity="0";});
      setTimeout(()=>{ripple.remove();delete target.dataset.nxRipple;},520);
    });
  }


  function initNavigationLoader(){
    let loader=$(".nx-navigation-loader");
    if(!loader){
      loader=document.createElement("div");
      loader.className="nx-navigation-loader";
      loader.setAttribute("aria-hidden","true");
      loader.innerHTML='<div class="nx-navigation-loader-box"><svg class="nx-navigation-loader-gear" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.8 2h2.4l.55 2.1c.44.13.86.31 1.26.52l1.93-1.02 1.7 1.7-1.02 1.93c.21.4.39.82.52 1.26L20 9.04v2.4l-2.1.55c-.13.44-.31.86-.52 1.26l1.02 1.93-1.7 1.7-1.93-1.02c-.4.21-.82.39-1.26.52l-.55 2.1h-2.4l-.55-2.1c-.44-.13-.86-.31-1.26-.52l-1.93 1.02-1.7-1.7 1.02-1.93a9 9 0 0 1-.52-1.26L4 11.44v-2.4l2.1-.55c.13-.44.31-.86.52-1.26L5.6 5.3 7.3 3.6l1.93 1.02c.4-.21.82-.39 1.26-.52L10.8 2Zm1.2 6.2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z"/></svg><span class="nx-navigation-loader-label">A carregar</span></div>';
      document.body.appendChild(loader);
    }
    let hideTimer=0;
    const show=()=>{clearTimeout(hideTimer);loader.classList.add("is-active");};
    const hide=(delay=70)=>{clearTimeout(hideTimer);hideTimer=window.setTimeout(()=>loader.classList.remove("is-active"),delay);};
    window.NexaurenNavigation=Object.freeze({show,hide});
    show();
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>hide(120),{once:true});else hide(120);
    window.addEventListener("pageshow",()=>hide(80),{passive:true});
    window.addEventListener("popstate",()=>show(),{passive:true});
    document.addEventListener("click",event=>{
      const link=event.target.closest("a[href]");
      if(!link||link.target==="_blank"||link.hasAttribute("download")||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const href=link.getAttribute("href")||"";
      if(!href||href.startsWith("#")||href.startsWith("mailto:")||href.startsWith("tel:"))return;
      let target;try{target=new URL(href,location.href)}catch{return}
      if(target.origin!==location.origin||target.pathname.startsWith("/blog"))return;
      if(target.pathname===location.pathname&&target.search===location.search)return;
      show();
    },{capture:true});
  }

  function initPageTransition(){
    if(config.reducedMotion)return;
    document.addEventListener("click",event=>{
      const link=event.target.closest("a[href]");
      if(!link||link.target==="_blank"||link.hasAttribute("download")||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const href=link.getAttribute("href")||"";
      if(!href||href.startsWith("#")||href.startsWith("mailto:")||href.startsWith("tel:"))return;
      let target;try{target=new URL(href,location.href);}catch{return}
      if(target.origin!==location.origin||target.pathname.startsWith("/blog"))return;
      if(target.href===location.href)return;
      document.body.classList.add("nx-leaving");
      window.setTimeout(()=>document.body.classList.remove("nx-leaving"),420);
    },{capture:true});
  }

  function initKeyboardNavigation(){
    document.addEventListener("keydown",event=>{
      if(event.key!=="Enter"||event.altKey||event.ctrlKey||event.metaKey)return;
      const target=event.target;
      if(target instanceof HTMLAnchorElement && target.href)target.click();
    });
  }

  function init(){if(!document.body)return;document.body.classList.add("nx-ready");ensureLegalNavigation();setActiveNavigation();initMenus();initReveal();initSpotlight();initScrollProgress();initTopButton();initSkipLink();initHeaderMotion();initCursorGlow();initButtonFeedback();initPageTransition();initKeyboardNavigation();initNavigationLoader();updateYears();exposeApi();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();