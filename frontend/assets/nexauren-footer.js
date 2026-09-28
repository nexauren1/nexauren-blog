(()=>{
  "use strict";
  if(window.__nexaurenFooterReady)return;
  window.__nexaurenFooterReady=true;

  const esc=value=>String(value??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  const path=location.pathname||"/";
  const toolLike=/^\/tool(?:\/|$)/i.test(path);
  const query=new URLSearchParams();
  if(toolLike){query.set("from",path);query.set("kind","problem");}
  const reportHref="/support/?"+query.toString();
  const feedbackHref="/feedback/"+(toolLike?"?from="+encodeURIComponent(path):"");
  const labels={
    en:{
      description:"Nexauren brings content, tools and useful digital experiences together in one evolving ecosystem.",
      explore:"Explore",tools:"Tools",account:"Account",story:"Story",support:"Support",problem:"Report a problem",help:"Help Center",feedback:"Suggestions & feedback",legal:"Legal",privacy:"Privacy",terms:"Terms",cookies:"Cookies",need:"Need help or have an idea?",send:"Send us a message and include the context that helps us understand it.",contact:"Contact support",built:"Built to evolve."
    },
    pt:{
      description:"A Nexauren reúne conteúdo, ferramentas e experiências digitais úteis num ecossistema em evolução.",
      explore:"Explorar",tools:"Ferramentas",account:"Conta",story:"Story",support:"Suporte",problem:"Reportar um problema",help:"Central de suporte",feedback:"Sugestões e feedback",legal:"Legal",privacy:"Privacidade",terms:"Termos",cookies:"Cookies",need:"Precisa de ajuda ou tem uma ideia?",send:"Envie-nos uma mensagem com o contexto que nos ajuda a compreender o pedido.",contact:"Contactar suporte",built:"Construído para evoluir."
    }
  };

  function injectStyles(){
    if(document.getElementById("nexauren-footer-css"))return;
    const link=document.createElement("link");
    link.id="nexauren-footer-css";
    link.rel="stylesheet";
    link.href="/assets/nexauren-footer.css?v=20260928-1";
    document.head.appendChild(link);
  }

  function applyLanguage(){
    const footer=document.querySelector("footer.nx-global-footer");
    if(!footer)return;
    const lang=window.NexaurenLanguage?.get?.()||localStorage.getItem("ns_lang_v2")||"en";
    const t=labels[lang]==null?labels.en:labels[lang];
    const map={
      description:t.description,explore:t.explore,tools:t.tools,account:t.account,story:t.story,support:t.support,
      problem:t.problem,help:t.help,feedback:t.feedback,legal:t.legal,privacy:t.privacy,terms:t.terms,cookies:t.cookies,
      need:t.need,send:t.send,contact:t.contact,built:t.built
    };
    footer.querySelectorAll("[data-footer-key]").forEach(el=>{const key=el.dataset.footerKey;if(map[key]!=null)el.textContent=map[key];});
  }

  function render(){
    if(document.querySelector("footer.nx-global-footer"))return;
    const year=new Date().getFullYear();
    const footer=document.createElement("footer");
    footer.className="nx-global-footer";
    footer.innerHTML=`
      <div class="nx-footer-shell">
        <div class="nx-footer-main">
          <div class="nx-footer-brand-block">
            <a class="nx-footer-brand" href="/" aria-label="Nexauren Story">
              <span class="nx-footer-mark">✦</span>
              <span><strong>Nexauren</strong><small>Story</small></span>
            </a>
            <p data-footer-key="description">${labels.en.description}</p>
            <a class="nx-footer-email" href="mailto:nexaurenx@gmail.com">nexaurenx@gmail.com</a>
          </div>
          <div class="nx-footer-column">
            <span class="nx-footer-label" data-footer-key="explore">Explore</span>
            <a href="/tool/" data-footer-key="tools">Tools</a>
            <a href="/account" data-footer-key="account">Account</a>
            <a href="/" data-footer-key="story">Story</a>
          </div>
          <div class="nx-footer-column">
            <span class="nx-footer-label" data-footer-key="support">Support</span>
            <a href="${esc(reportHref)}" data-footer-key="problem">Report a problem</a>
            <a href="/support/" data-footer-key="help">Help Center</a>
            <a href="${esc(feedbackHref)}" data-footer-key="feedback">Suggestions & feedback</a>
          </div>
          <div class="nx-footer-column">
            <span class="nx-footer-label" data-footer-key="legal">Legal</span>
            <a href="/legal/privacidade/" data-footer-key="privacy">Privacy</a>
            <a href="/legal/termos/" data-footer-key="terms">Terms</a>
            <a href="/legal/cookies/" data-footer-key="cookies">Cookies</a>
          </div>
        </div>
        <div class="nx-footer-support-card">
          <div>
            <span class="nx-footer-pulse"></span>
            <strong data-footer-key="need">Need help or have an idea?</strong>
            <p data-footer-key="send">Send us a message and include the context that helps us understand it.</p>
          </div>
          <a href="${esc(toolLike?reportHref:'/support/')}" class="nx-footer-cta" data-footer-key="contact">Contact support</a>
        </div>
        <div class="nx-footer-bottom">
          <span>© ${year} Nexauren Story</span>
          <span data-footer-key="built">Built to evolve.</span>
        </div>
      </div>`;
    document.body.appendChild(footer);
    injectStyles();
    applyLanguage();
    window.addEventListener("nexauren:language-changed",applyLanguage);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();
