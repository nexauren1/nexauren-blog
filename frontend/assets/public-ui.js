/* Nexauren Public Experience — shared behavior for non-blog pages. */
(() => {
  "use strict";
  const config=Object.freeze({
    reducedMotion:window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    selectors:Object.freeze({menuButton:".menu-toggle,.tool-menu",menuPanel:"[data-mobile-menu],[data-mobile-nav],[data-tool-mobile]",reveal:".nx-reveal,[data-nx-reveal]",spotlight:".nx-spotlight,.tool-card"}),
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
    const pairs=[];
    $$(config.selectors.menuButton).forEach(button=>{
      const header=button.closest("header"),panel=header?$(config.selectors.menuPanel,header):$(config.selectors.menuPanel);
      if(!panel)return;pairs.push({button,panel});
      const sync=open=>{button.setAttribute("aria-expanded",String(open));button.setAttribute("aria-label",open?"Fechar menu":"Abrir menu");panel.classList.toggle("open",open);document.body.classList.toggle("nx-menu-open",open);};
      button.addEventListener("click",()=>sync(!panel.classList.contains("open")));
      $$("a",panel).forEach(a=>a.addEventListener("click",()=>sync(false)));
    });
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      pairs.forEach(({button,panel})=>{if(panel.classList.contains("open")){button.setAttribute("aria-expanded","false");button.setAttribute("aria-label","Abrir menu");panel.classList.remove("open");}});
      document.body.classList.remove("nx-menu-open");
    });
    document.addEventListener("click",event=>{
      pairs.forEach(({button,panel})=>{
        if(!panel.classList.contains("open")||panel.contains(event.target)||button.contains(event.target))return;
        button.setAttribute("aria-expanded","false");button.setAttribute("aria-label","Abrir menu");panel.classList.remove("open");
      });
      if(!pairs.some(x=>x.panel.classList.contains("open")))document.body.classList.remove("nx-menu-open");
    });
  }

  function initReveal(){
    const nodes=$$(config.selectors.reveal);if(!nodes.length)return;
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

  function exposeApi(){window.NexaurenUI=Object.freeze({config,initReveal,initMenus,initSpotlight,initScrollProgress,initTopButton,setActiveNavigation,refresh(){setActiveNavigation();initReveal();}});}
  function init(){if(!document.body)return;document.body.classList.add("nx-ready");ensureLegalNavigation();setActiveNavigation();initMenus();initReveal();initSpotlight();initScrollProgress();initTopButton();initSkipLink();updateYears();exposeApi();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();