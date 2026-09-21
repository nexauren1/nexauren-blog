(function(){
  // Monetag official integration: ad-channel tags belong in <head>.
  // We load them only on article pages so ads do not run across the public site.
  const ADS=[
    {zone:"11183778",src:"https://nap5k.com/tag.min.js"},
    {zone:"11177602",src:"https://n6wxm.com/vignette.min.js"}
  ];

  function load(ad){
    if(!ad||document.querySelector('script[data-monetag-zone="'+ad.zone+'"]'))return;
    const script=document.createElement("script");
    script.dataset.monetagZone=ad.zone;
    script.dataset.zone=ad.zone;
    script.src=ad.src;
    script.async=true;
    document.head.appendChild(script);
  }

  function apply(article){
    if(!article||article.dataset.adsReady==="1")return;
    article.dataset.adsReady="1";
    ADS.forEach(load);
  }

  window.NexaurenAds={apply};
})();
