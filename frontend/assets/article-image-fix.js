/* Nexauren Blog — resilient article image renderer.
   Supports @imagem, @image, Markdown images and existing cover metadata.
   The current resize tutorial also gets its two supplied images until its saved
   record is edited once through the repaired Admin editor. */
(()=>{
  if(window.__NX_ARTICLE_IMAGE_FIX__)return;
  window.__NX_ARTICLE_IMAGE_FIX__=true;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const valid=v=>{try{const u=new URL(String(v||""),location.origin);return /^https?:$/.test(u.protocol)?u.href:""}catch{return""}};
  const figure=(src,alt,cap)=>{const v=valid(src);if(!v)return null;const f=document.createElement("figure");f.className="article-figure";const img=document.createElement("img");img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";img.src=v;img.alt=alt||"Imagem do artigo";if(cap){const c=document.createElement("figcaption");c.textContent=cap;f.append(img,c)}else f.append(img);return f};
  function replaceMarkers(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
    while(walker.nextNode())if(/@(imagem|image)\s+https?:\/\//i.test(walker.currentNode.nodeValue)||/!\[[^\]]*\]\(https?:\/\/[^)]+\)/.test(walker.currentNode.nodeValue))nodes.push(walker.currentNode);
    for(const n of nodes){
      const value=n.nodeValue;const re=/@(imagem|image)\s+(https?:\/\/\S+?)(?:\s*\|\s*([^|\n]*))?(?:\s*\|\s*(.*))?(?=\n|$)|!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"([^"]*)")?\)/ig;
      let m,last=0,changed=false,frag=document.createDocumentFragment();
      while((m=re.exec(value))){changed=true;if(m.index>last)frag.append(value.slice(last,m.index));const f=figure(m[2]||m[6],m[3]||m[5],m[4]||m[7]);if(f)frag.append(f);else frag.append(m[0]);last=re.lastIndex}
      if(changed){if(last<value.length)frag.append(value.slice(last));n.parentNode?.replaceChild(frag,n)}
    }
  }
  function run(){
    const root=document.querySelector(".article-content, article .article-content, article");if(!root)return;
    replaceMarkers(root);
    if(root.querySelector("img"))return;
    const slug=(location.pathname.match(/\/blog\/post\/([^/]+)/)||[])[1]||"";
    const fallback={
      "como-redimensionar-uma-imagem":[
        ["https://ik.imagekit.io/rvvqacl3z/nexauren-story/1000520483_h-vraY2Wr.webp","Imagem principal para redimensionamento","Exemplo de uma imagem antes do redimensionamento."],
        ["https://ik.imagekit.io/rvvqacl3z/nexauren-story/1000520478_8ZDXD_H01.webp","Imagem redimensionada","Exemplo do resultado após redimensionar a imagem."]
      ]
    };
    const meta=document.querySelector('meta[property="og:image"],meta[name="twitter:image"]');
    const imgs=fallback[slug]||[];
    if(!imgs.length&&meta?.content){const f=figure(meta.content,"Imagem de capa do artigo","");if(f)root.prepend(f)}
    else imgs.slice(0,2).reverse().forEach(([src,alt,cap])=>{const f=figure(src,alt,cap);if(f)root.prepend(f)});
  }
  const start=()=>{run();const root=document.querySelector("#app");if(root)new MutationObserver(()=>run()).observe(root,{childList:true,subtree:true})};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
