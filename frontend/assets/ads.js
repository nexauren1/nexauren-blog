(function(){
  // Adsterra test ads. This file is intentionally loaded only on selected public pages/tools.
  const UNITS={
    banner:{
      key:"842be0a485a66000fcf7e5d24ee7b149",
      format:"iframe",
      height:60,
      width:468,
      src:"https://www.highrevenueformat.com/842be0a485a66000fcf7e5d24ee7b149/invoke.js"
    },
    responsive:{
      key:"3f0075a42e8847e1779e2499a49436c4",
      src:"https://pl31484671.profitableratecpmnetwork.com/3f0075a42e8847e1779e2499a49436c4/invoke.js"
    }
  };

  function loadBanner(target){
    if(!target||target.dataset.adsterraBannerReady==="1")return;
    target.dataset.adsterraBannerReady="1";
    const config=document.createElement("script");
    config.textContent='atOptions = '+JSON.stringify({key:UNITS.banner.key,format:UNITS.banner.format,height:UNITS.banner.height,width:UNITS.banner.width,params:{}})+';';
    target.appendChild(config);
    const script=document.createElement("script");
    script.src=UNITS.banner.src;
    target.appendChild(script);
  }

  function loadResponsive(target){
    if(!target||target.dataset.adsterraResponsiveReady==="1")return;
    target.dataset.adsterraResponsiveReady="1";
    const script=document.createElement("script");
    script.async=true;
    script.setAttribute("data-cfasync","false");
    script.src=UNITS.responsive.src;
    target.appendChild(script);
    const container=document.createElement("div");
    container.id="container-"+UNITS.responsive.key;
    target.appendChild(container);
  }

  window.NexaurenAds={loadBanner,loadResponsive};
})();
