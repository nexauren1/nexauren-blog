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
  function makeSlot(position){
    const slot=document.createElement("div");
    slot.className="post-ad post-ad-"+position;
    slot.dataset.position=position;
    slot.setAttribute("role","region");
    slot.setAttribute("aria-label","Publicidade");
    return slot;
  }
  function apply(article){
    if(!article||article.dataset.adsReady==="1")return;
    const content=article.querySelector(".article-content");
    if(!content)return;
    article.dataset.adsReady="1";

    const blocks=[...content.children];
    const paragraphs=blocks.filter(x=>x.tagName==="P");
    if(!paragraphs.length)return;

    const firstTarget=paragraphs[1]||paragraphs[0];
    const secondTarget=paragraphs[4]||paragraphs[paragraphs.length-1];

    const first=makeSlot("middle");
    if(firstTarget?.parentNode)firstTarget.parentNode.insertBefore(first,firstTarget.nextSibling);
    load(first,ZONES[0],SOURCES[0]);

    if(secondTarget!==firstTarget){
      const second=makeSlot("lower");
      if(secondTarget?.parentNode)secondTarget.parentNode.insertBefore(second,secondTarget.nextSibling);
      else content.appendChild(second);
      load(second,ZONES[1],SOURCES[1]);
    }
  }
  window.NexaurenAds={apply};
})();