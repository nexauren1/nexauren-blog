(function(){
  const ZONES=["11183778","11177602"];
  const SOURCES=["https://nap5k.com/tag.min.js","https://n6wxm.com/vignette.min.js"];
  function load(slot,zone,src){
    if(!slot||slot.dataset.loaded==="1")return;
    slot.dataset.loaded="1";
    const script=document.createElement("script");
    script.dataset.zone=zone;
    script.src=src;
    script.async=true;
    slot.appendChild(script);
  }
  function apply(article){
    if(!article||article.dataset.adsReady==="1")return;
    article.dataset.adsReady="1";
    const content=article.querySelector(".article-content");
    if(!content)return;
    const nodes=[...content.children].filter(x=>x.tagName==="P");
    const top=document.createElement("div");top.className="post-ad post-ad-top";top.setAttribute("aria-label","Publicidade");content.insertBefore(top,content.firstChild);load(top,ZONES[0],SOURCES[0]);
    const middle=document.createElement("div");middle.className="post-ad post-ad-middle";middle.setAttribute("aria-label","Publicidade");
    const target=nodes[2]||nodes[Math.max(0,nodes.length-1)];
    if(target&&target.parentNode)target.parentNode.insertBefore(middle,target.nextSibling);else content.appendChild(middle);
    load(middle,ZONES[1],SOURCES[1]);
  }
  window.NexaurenAds={apply};
})();