(() => {
  const GA_ID = "G-5QFVE1W7D7";
  const SCRIPT_ID = "nexauren-google-analytics";

  if (window.__NEXAUREN_GA_INITIALIZED || !GA_ID) return;
  window.__NEXAUREN_GA_INITIALIZED = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
})();