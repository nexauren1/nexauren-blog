(()=>{"use strict";
if(window.NexaurenLanguage)return;
if(document.querySelector('script[data-nx-language-legacy-loader]'))return;
const s=document.createElement("script");
s.src="/assets/nexauren-language.js?v=20260928-9";
s.async=false;
s.dataset.nxLanguageLegacyLoader="1";
document.head.appendChild(s);
})();