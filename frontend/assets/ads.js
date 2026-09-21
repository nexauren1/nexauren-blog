(function(){
  // Monetag official integration: In-Page Push (Banner) in <head>.
  // Loaded only when an article is rendered. Vignette and Direct Link are not used.
  const AD={zone:"11183778",src:"https://nap5k.com/tag.min.js"};

  function load(){
    if(document.querySelector('script[data-monetag-zone="'+AD.zone+'"]'))return;
    const script=document.createElement("script");
    script.dataset.monetagZone=AD.zone;
    script.dataset.zone=AD.zone;
    script.src=AD.src;
    script.async=true;
    document.head.appendChild(script);
  }

  function apply(article){
    if(!article||article.dataset.adsReady==="1")return;
    article.dataset.adsReady="1";
    load();
  }

  window.NexaurenAds={apply};
})();
