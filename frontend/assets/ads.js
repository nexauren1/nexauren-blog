(function(){
  const ADS=[
    {zone:"11183778",src:"https://nap5k.com/tag.min.js",position:"middle"},
    {zone:"11177602",src:"https://n6wxm.com/vignette.min.js",position:"lower"}
  ];

  function inject(slot,ad){
    if(!slot||slot.dataset.loaded==="1")return;
    slot.dataset.loaded="1";
    const script=document.createElement("script");
    script.dataset.zone=ad.zone;
    script.src=ad.src;
    script.async=true;
    slot.appendChild(script);
  }

  function slot(position){
    const el=document.createElement("div");
    el.className="post-ad-slot post-ad-slot-"+position;
    el.dataset.postAd=position;
    return el;
  }

  function apply(article){
    if(!article||article.dataset.adsReady==="1")return;
    const content=article.querySelector(".article-content");
    if(!content)return;
    article.dataset.adsReady="1";

    const paragraphs=[...content.children].filter(el=>el.tagName==="P");
    if(!paragraphs.length)return;

    const firstTarget=paragraphs[1]||paragraphs[0];
    const secondTarget=paragraphs[4]||paragraphs[paragraphs.length-1];

    const first=slot("middle");
    firstTarget.parentNode.insertBefore(first,firstTarget.nextSibling);
    inject(first,ADS[0]);

    if(secondTarget!==firstTarget){
      const second=slot("lower");
      secondTarget.parentNode.insertBefore(second,secondTarget.nextSibling);
      inject(second,ADS[1]);
    }
  }

  window.NexaurenAds={apply};
})();