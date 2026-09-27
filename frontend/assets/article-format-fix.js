/* Compatibility pass for older Blog posts and cached content. */
(function(){
  function safeUrl(value){
    try{
      const u=new URL(String(value||'').trim(),location.origin);
      return ['http:','https:'].includes(u.protocol)?u.href:'';
    }catch{return ''}
  }
  function enhance(root){
    if(!root||root.dataset.nxFormatFixed==='1')return;
    root.dataset.nxFormatFixed='1';

    // Older saved posts can contain the Nexauren markers as plain paragraph text.
    [...root.querySelectorAll('p')].forEach(p=>{
      const text=p.textContent.trim();
      if(/^##\s+/.test(text)){
        const h=document.createElement('h2');h.textContent=text.replace(/^##\s+/,'');p.replaceWith(h);return;
      }
      if(/^#\s+/.test(text)){
        const h=document.createElement('h1');h.textContent=text.replace(/^#\s+/,'');p.replaceWith(h);return;
      }
      if(/^@imagem\s+/i.test(text)){
        const raw=text.replace(/^@imagem\s+/i,'');
        const parts=raw.split('|').map(x=>x.trim());
        const src=safeUrl(parts.shift());
        if(!src)return;
        const fig=document.createElement('figure');fig.className='article-figure';
        const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=src;img.alt=parts.shift()||'Imagem do artigo';fig.appendChild(img);
        const caption=parts.join(' | ');
        if(caption){const cap=document.createElement('figcaption');cap.textContent=caption;fig.appendChild(cap)}
        p.replaceWith(fig);
      }
    });

    // If an image was inserted as a normal image but has no responsive sizing, normalize it.
    root.querySelectorAll('img').forEach(img=>{img.loading=img.loading||'lazy';img.decoding=img.decoding||'async'});
  }
  const run=()=>enhance(document.querySelector('.article-content'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  new MutationObserver(run).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();
