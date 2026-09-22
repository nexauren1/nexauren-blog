const COOKIE = "ns_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_SOCIAL_IMAGE = "https://nexaurenstory.com/social-preview.png?v=20260922-1";
const ACCOUNT_COOKIE = "ns_account";
const ACCOUNT_SESSION_SECONDS = 60 * 60 * 24 * 30;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", ...headers }
  });
}
function fail(message,status=400,code="BAD_REQUEST"){return json({ok:false,error:message,code},status);}
function nowIso(){return new Date().toISOString();}
function normalizeEmail(email){return String(email||"").trim().toLowerCase();}
function slugify(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/['’"]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-").slice(0,180);}
function text(v,max=1000000){return String(v??"").slice(0,max);}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function xml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function publicUrl(path,language="pt"){const u=new URL(path,"https://nexaurenstory.com");if(language==="en")u.searchParams.set("lang","en");return u.href;}
function blogPublicPath(path){const p=String(path||"/");return p==="/"?"/blog/":"/blog"+(p.startsWith("/")?p:"/"+p)}
function safeJsonLd(v){return JSON.stringify(v).replace(/</g,"\\u003c");}
function stripMarkdown(v){return String(v??"").replace(/!\[[^\]]*\]\([^)]*\)/g," ").replace(/\[[^\]]+\]\([^)]*\)/g," ").replace(/[#>*_\x60~]/g," ").replace(/\s+/g," ").trim();}
function seoDesc(excerpt,content){const s=stripMarkdown(excerpt)||stripMarkdown(content);return s.slice(0,160)+(s.length>160?"…":"");}
function cookie(name,value,opts={}){const p=[name+"="+encodeURIComponent(value),`Max-Age=${opts.maxAge??0}`,"Path=/","HttpOnly","Secure","SameSite=Lax"];return p.join("; ");}
function getCookie(request,name){const c=request.headers.get("Cookie")||"";const p=c.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));return p?decodeURIComponent(p.slice(name.length+1)):null;}
async function sha256(value){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function b64(bytes){let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);}
function bytes(v){const s=atob(v);return Uint8Array.from(s,c=>c.charCodeAt(0));}
function rand(n){const x=new Uint8Array(n);crypto.getRandomValues(x);return x;}
async function hashPassword(password,saltB64=null){
  const salt=saltB64?bytes(saltB64):rand(16);
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:100000,hash:"SHA-256"},key,256);
  return "pbkdf2$100000$"+b64(salt)+"$"+b64(new Uint8Array(bits));
}
async function verifyPassword(password,stored){
  try{
    const [scheme,it,saltB64,expectedB64]=String(stored||"").split("$");
    if(scheme!=="pbkdf2"||Number(it)!==100000||!saltB64||!expectedB64)return false;
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
    const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:bytes(saltB64),iterations:100000,hash:"SHA-256"},key,256);
    const a=new Uint8Array(bits),b=bytes(expectedB64);if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0;
  }catch{return false;}
}
async function hmacSha1(message,keyText){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(keyText),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function audit(env,userId,action,type=null,entityId=null,metadata={}){
  try{await env.DB.prepare("INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),userId||null,action,type,entityId,JSON.stringify(metadata),nowIso()).run();}catch{}
}
async function createSession(env,userId,request){
  const token=crypto.randomUUID()+"."+crypto.randomUUID(),hash=await sha256(token),ts=nowIso(),exp=new Date(Date.now()+SESSION_SECONDS*1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at,ip_hash,user_agent) VALUES (?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),userId,hash,exp,ts,ts,await sha256(request.headers.get("CF-Connecting-IP")||""),(request.headers.get("User-Agent")||"").slice(0,500)).run();
  return {token};
}
async function auth(env,request){
  const raw=getCookie(request,COOKIE);if(!raw)return null;
  const row=await env.DB.prepare(`SELECT u.id,u.email,u.display_name,u.role,u.status,u.email_verified,s.id session_id
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='active' LIMIT 1`)
    .bind(await sha256(raw),nowIso()).first();
  if(!row)return null;await env.DB.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").bind(nowIso(),row.session_id).run();return row;
}
async function createAccountSession(env,accountId,request){
  const token=crypto.randomUUID()+"."+crypto.randomUUID(),hash=await sha256(token),ts=nowIso(),exp=new Date(Date.now()+ACCOUNT_SESSION_SECONDS*1000).toISOString();
  await env.DB.prepare("INSERT INTO account_sessions (id,account_id,token_hash,expires_at,created_at,last_seen_at,ip_hash,user_agent) VALUES (?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),accountId,hash,exp,ts,ts,await sha256(request.headers.get("CF-Connecting-IP")||""),(request.headers.get("User-Agent")||"").slice(0,500)).run();
  return {token};
}
async function accountAuth(env,request){
  const raw=getCookie(request,ACCOUNT_COOKIE);if(!raw)return null;
  const row=await env.DB.prepare("SELECT a.id,a.email,a.display_name,a.status,a.email_verified,s.id session_id FROM account_sessions s JOIN account_profiles a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.status='active' LIMIT 1")
    .bind(await sha256(raw),nowIso()).first();
  if(!row)return null;
  await env.DB.prepare("UPDATE account_sessions SET last_seen_at=? WHERE id=?").bind(nowIso(),row.session_id).run();
  return row;
}
async function accountSchemaReady(env){
  try{
    const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('account_profiles','account_sessions','account_login_attempts')").all();
    return new Set((r.results||[]).map(x=>x.name)).size===3;
  }catch{return false;}
}

function sameOrigin(request){const o=request.headers.get("Origin");if(!o)return true;try{return o===new URL(request.url).origin;}catch{return false;}}
async function guard(env,request,owner=false){
  if(!sameOrigin(request))return {error:fail("Origem não autorizada.",403,"ORIGIN")};
  const a=await auth(env,request);if(!a)return {error:fail("Sessão expirada ou não autenticada.",401,"UNAUTHENTICATED")};
  if(owner&&!["owner","admin"].includes(a.role))return {error:fail("Permissão insuficiente.",403,"FORBIDDEN")};return {auth:a};
}
async function bodyJson(request){try{return await request.json();}catch{return null;}}
async function publishDue(env){const t=nowIso();await env.DB.prepare("UPDATE posts SET status='published',published_at=COALESCE(published_at,scheduled_at,?),updated_at=? WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at<=?").bind(t,t,t).run();}
async function cleanup(env){const t=nowIso();await env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(t).run();await env.DB.prepare("DELETE FROM login_attempts WHERE created_at<?").bind(new Date(Date.now()-2592000000).toISOString()).run();if(await accountSchemaReady(env)){await env.DB.prepare("DELETE FROM account_sessions WHERE expires_at<=?").bind(t).run();await env.DB.prepare("DELETE FROM account_login_attempts WHERE created_at<?").bind(new Date(Date.now()-2592000000).toISOString()).run();}}
async function dbCheck(env){
  const required={
    users:["id","email","password_hash","display_name","role","status","email_verified","last_login_at","created_at","updated_at"],
    sessions:["id","user_id","token_hash","expires_at","created_at","last_seen_at","ip_hash","user_agent"],
    login_attempts:["id","identifier","success","created_at"],
    categories:["id","name","slug","description","icon","parent_id","sort_order","created_at","updated_at"],
    tags:["id","name","slug","created_at"],
    media:["id","imagekit_file_id","url","thumbnail_url","filename","mime_type","size_bytes","width","height","alt_text","caption","uploaded_by","created_at"],
    posts:["id","author_id","title","slug","excerpt","content","content_format","type","status","category_id","cover_media_id","social_image","published_at","scheduled_at","featured","allow_comments","meta_title","meta_description","created_at","updated_at"],
    post_translations:["id","post_id","language","title","excerpt","content","meta_title","meta_description","created_at","updated_at"],
    post_tags:["post_id","tag_id"], revisions:["id","post_id","editor_id","title","excerpt","content","revision_number","created_at"],
    settings:["key","value","type","updated_at"], navigation:["id","location","label","url","icon","sort_order","visible","parent_id"],
    redirects:["id","source","destination","status_code","created_at"],
    audit_logs:["id","user_id","action","entity_type","entity_id","metadata","ip_hash","created_at"],
    notifications:["id","user_id","type","title","message","link","read_at","created_at"]
  };
  try{
    const tables=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const existing=new Set((tables.results||[]).map(x=>x.name));
    const missingTables=[],missingColumns=[];
    for(const [table,cols] of Object.entries(required)){
      if(!existing.has(table)){missingTables.push(table);continue;}
      let info=await env.DB.prepare("PRAGMA table_info("+table+")").all();
      let have=new Set((info.results||[]).map(x=>x.name));
      if(table==="posts"&&!have.has("social_image")){
        try{await env.DB.prepare("ALTER TABLE posts ADD COLUMN social_image TEXT DEFAULT ''").run();info=await env.DB.prepare("PRAGMA table_info(posts)").all();have=new Set((info.results||[]).map(x=>x.name));}catch{}
      }
      for(const col of cols)if(!have.has(col))missingColumns.push(table+"."+col);
    }
    return {ready:missingTables.length===0&&missingColumns.length===0,missingTables,missingColumns};
  }catch(e){return {ready:false,missingTables:[],missingColumns:[],error:String(e?.message||e)};}
}
async function dbReady(env){return (await dbCheck(env)).ready;}


async function autoTranslatePost(env,postId){
  if(!env.AI)return;
  try{
    const p=await env.DB.prepare("SELECT title,excerpt,content,meta_title,meta_description FROM posts WHERE id=? LIMIT 1").bind(postId).first();
    if(!p?.title)return;
    const tr=await env.DB.prepare("SELECT language,title,excerpt,content,meta_title,meta_description FROM post_translations WHERE post_id=? AND language='en' LIMIT 1").bind(postId).first();
    const needsTranslation=!tr;
    const needsPtMeta=!String(p.meta_title||"").trim()||!String(p.meta_description||"").trim();
    const needsEnMeta=!!tr&&(!String(tr.meta_title||"").trim()||!String(tr.meta_description||"").trim());
    if(!needsTranslation&&!needsPtMeta&&!needsEnMeta)return;

    const model=env.TRANSLATION_AI_MODEL||"@cf/google/gemma-4-26b-a4b-it";
    const prompt=needsTranslation
      ? [
          "You are the SEO editor and translator for Nexauren Story.",
          "Source language: Portuguese (pt). Target language: natural international English (en).",
          "Do not invent facts. Preserve names, URLs, Markdown structure, code, numbers and meaning.",
          'Return ONLY valid JSON with this exact shape: {"pt_meta_title":"","pt_meta_description":"","en":{"title":"","excerpt":"","content":"","meta_title":"","meta_description":""}}',
          "",
          "PT TITLE:\n"+p.title,
          "PT EXCERPT:\n"+(p.excerpt||""),
          "PT CONTENT:\n"+String(p.content||"").slice(0,115000),
          "EXISTING PT META TITLE:\n"+(p.meta_title||""),
          "EXISTING PT META DESCRIPTION:\n"+(p.meta_description||"")
        ].join("\n")
      : [
          "You are the SEO editor for Nexauren Story.",
          "Generate missing metadata only; do not invent facts or change the article.",
          'Return ONLY valid JSON with this exact shape: {"pt_meta_title":"","pt_meta_description":"","en_meta_title":"","en_meta_description":""}',
          "",
          "PT TITLE:\n"+p.title,
          "PT EXCERPT:\n"+(p.excerpt||""),
          "PT CONTENT:\n"+String(p.content||"").slice(0,18000),
          "CURRENT PT META TITLE:\n"+(p.meta_title||""),
          "CURRENT PT META DESCRIPTION:\n"+(p.meta_description||""),
          "EN TITLE:\n"+(tr?.title||""),
          "EN EXCERPT:\n"+(tr?.excerpt||""),
          "CURRENT EN META TITLE:\n"+(tr?.meta_title||""),
          "CURRENT EN META DESCRIPTION:\n"+(tr?.meta_description||"")
        ].join("\n");

    const response=await env.AI.run(model,{
      messages:[
        {role:"system",content:"Return only valid JSON. No markdown fences. Keep facts unchanged."},
        {role:"user",content:prompt}
      ],
      temperature:0.2,
      max_tokens:needsTranslation?7000:900
    });
    let raw=String(response?.response||response||"").trim();
    raw=raw.replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"").trim();
    const first=raw.indexOf("{"),last=raw.lastIndexOf("}");
    if(first>=0&&last>first)raw=raw.slice(first,last+1);
    const ai=JSON.parse(raw);

    if(needsTranslation&&ai?.en?.title&&ai?.en?.content){
      await saveTranslations(env,postId,{en:{
        title:String(ai.en.title).trim(),
        excerpt:String(ai.en.excerpt||"").trim(),
        content:String(ai.en.content),
        meta_title:String(ai.en.meta_title||"").trim(),
        meta_description:String(ai.en.meta_description||"").trim()
      }});
    }

    if(needsPtMeta){
      const ptTitle=String(ai.pt_meta_title||"").trim().slice(0,180);
      const ptDesc=String(ai.pt_meta_description||"").trim().slice(0,300);
      const nextTitle=String(p.meta_title||"").trim()||ptTitle;
      const nextDesc=String(p.meta_description||"").trim()||ptDesc;
      if(nextTitle||nextDesc)await env.DB.prepare("UPDATE posts SET meta_title=?,meta_description=?,updated_at=? WHERE id=?").bind(nextTitle,nextDesc,nowIso(),postId).run();
    }

    if(tr){
      const enTitle=String(tr.meta_title||"").trim()||String(ai.en_meta_title||"").trim();
      const enDesc=String(tr.meta_description||"").trim()||String(ai.en_meta_description||"").trim();
      if(enTitle||enDesc)await env.DB.prepare("UPDATE post_translations SET meta_title=?,meta_description=?,updated_at=? WHERE post_id=? AND language='en'").bind(enTitle.slice(0,180),enDesc.slice(0,300),nowIso(),postId).run();
    }
  }catch(e){console.error("autoTranslatePost",e);}
}
async function saveTranslations(env,postId,translations){
  for(const lang of ["pt","en"]){
    const t=translations?.[lang];if(!t)continue;
    const title=text(t.title,180).trim(),content=text(t.content,2000000),excerpt=text(t.excerpt,500).trim();
    if(!title&&!content&&!excerpt)continue;
    const row=await env.DB.prepare("SELECT id FROM post_translations WHERE post_id=? AND language=?").bind(postId,lang).first();
    const id=row?.id||crypto.randomUUID(),ts=nowIso();
    await env.DB.prepare(`INSERT INTO post_translations (id,post_id,language,title,excerpt,content,meta_title,meta_description,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(post_id,language) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,meta_title=excluded.meta_title,meta_description=excluded.meta_description,updated_at=excluded.updated_at`)
      .bind(id,postId,lang,title||"",excerpt,content,text(t.meta_title,180).trim(),text(t.meta_description,300).trim(),ts,ts).run();
  }
}
async function getPost(env,id){
  const p=await env.DB.prepare(`SELECT p.*,c.name category_name,c.slug category_slug,m.url cover_url,m.alt_text cover_alt,m.caption cover_caption,u.display_name author_name
    FROM posts p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN media m ON m.id=p.cover_media_id LEFT JOIN users u ON u.id=p.author_id
    WHERE p.id=? LIMIT 1`).bind(id).first();
  if(!p)return null;const tags=await env.DB.prepare("SELECT t.id,t.name,t.slug FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=? ORDER BY t.name").bind(id).all();
  const trs=await env.DB.prepare("SELECT language,title,excerpt,content,meta_title,meta_description FROM post_translations WHERE post_id=?").bind(id).all();
  return {...p,social_image:p.cover_url||DEFAULT_SOCIAL_IMAGE,tags:tags.results,translations:Object.fromEntries((trs.results||[]).map(x=>[x.language,x]))};
}
async function saveTags(env,postId,tags){
  await env.DB.prepare("DELETE FROM post_tags WHERE post_id=?").bind(postId).run();
  for(const item of (Array.isArray(tags)?tags:[]).slice(0,12)){
    const name=text(item,60).trim(),slug=slugify(name);if(!name||!slug)continue;
    const old=await env.DB.prepare("SELECT id FROM tags WHERE slug=?").bind(slug).first(),id=old?.id||crypto.randomUUID();
    if(!old)await env.DB.prepare("INSERT INTO tags (id,name,slug,created_at) VALUES (?,?,?,?)").bind(id,name,slug,nowIso()).run();
    await env.DB.prepare("INSERT OR IGNORE INTO post_tags (post_id,tag_id) VALUES (?,?)").bind(postId,id).run();
  }
}
async function postsAdmin(env,url){
  const w=["1=1"],b=[],status=url.searchParams.get("status"),type=url.searchParams.get("type"),q=url.searchParams.get("search");
  if(status){w.push("p.status=?");b.push(status)}if(type){w.push("p.type=?");b.push(type)}if(q){w.push("(p.title LIKE ? OR p.slug LIKE ? OR p.excerpt LIKE ?)");const s="%"+q+"%";b.push(s,s,s)}
  const r=await env.DB.prepare(`SELECT p.id,p.title,p.slug,p.excerpt,p.type,p.status,p.published_at,p.scheduled_at,p.featured,p.created_at,p.updated_at,c.name category_name,u.display_name author_name,m.url cover_url
    FROM posts p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN users u ON u.id=p.author_id LEFT JOIN media m ON m.id=p.cover_media_id
    WHERE ${w.join(" AND ")} ORDER BY COALESCE(p.published_at,p.scheduled_at,p.created_at) DESC LIMIT ? OFFSET ?`).bind(...b,Math.min(Number(url.searchParams.get("limit")||100),100),Math.max(Number(url.searchParams.get("offset")||0),0)).all();
  return json({ok:true,posts:(r.results||[]).map(x=>({...x,social_image:x.cover_url||DEFAULT_SOCIAL_IMAGE}))});
}
async function publicPosts(env,url){
  const w=["p.status='published'","p.published_at IS NOT NULL"],b=[],type=url.searchParams.get("type"),cat=url.searchParams.get("category"),lang=["en","pt"].includes(url.searchParams.get("lang"))?url.searchParams.get("lang"):"pt";
  if(type){w.push("p.type=?");b.push(type)}if(cat){w.push("c.slug=?");b.push(cat)}
  const r=await env.DB.prepare(`SELECT p.id,COALESCE(NULLIF(t.title,''),p.title) title,p.slug,COALESCE(NULLIF(t.excerpt,''),p.excerpt) excerpt,COALESCE(NULLIF(t.content,''),p.content) content,p.type,CASE WHEN NULLIF(m.url,'') IS NOT NULL THEN m.url ELSE 'https://nexaurenstory.com/social-preview.png?v=20260922-1' END social_image,p.published_at,p.featured,c.name category_name,c.slug category_slug,m.url cover_url,m.width cover_width,m.height cover_height,m.alt_text cover_alt,CASE WHEN t.id IS NULL THEN 0 ELSE 1 END translation_available
    FROM posts p LEFT JOIN post_translations t ON t.post_id=p.id AND t.language=? LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN media m ON m.id=p.cover_media_id
    WHERE ${w.join(" AND ")} ORDER BY p.featured DESC,p.published_at DESC LIMIT ? OFFSET ?`)
    .bind(lang,...b,Math.min(Number(url.searchParams.get("limit")||24),60),Math.max(Number(url.searchParams.get("offset")||0),0)).all();
  return json({ok:true,language:lang,posts:r.results});
}
async function createPost(env,a,d,ctx){
  const title=text(d.title,180).trim();if(!title)return fail("Título é obrigatório.",422);const slug=slugify(d.slug||title);if(!slug)return fail("Slug inválido.",422);
  let status=["draft","scheduled","published","archived"].includes(d.status)?d.status:"draft";const type=["article","news","guide","tutorial","announcement","release","update","story"].includes(d.type)?d.type:"article";
  const scheduled=d.scheduled_at?new Date(d.scheduled_at).toISOString():null;let published=d.published_at?new Date(d.published_at).toISOString():null;
  if(status==="scheduled"&&!scheduled)return fail("Um artigo agendado precisa de data.",422);if(status==="published"&&!published)published=nowIso();
  if(status==="scheduled"&&scheduled&&new Date(scheduled)<=new Date()){status="published";published=nowIso();}
  const id=crypto.randomUUID(),ts=nowIso(),excerpt=text(d.excerpt,500).trim(),content=text(d.content,2000000);const coverMediaId=d.cover_media_id||null;let socialImage=DEFAULT_SOCIAL_IMAGE;if(coverMediaId){const cm=await env.DB.prepare("SELECT url FROM media WHERE id=? LIMIT 1").bind(coverMediaId).first();socialImage=text(cm?.url,2000).trim()||DEFAULT_SOCIAL_IMAGE;}
  if(coverMediaId&&(d.cover_alt!==undefined||d.cover_caption!==undefined))await env.DB.prepare("UPDATE media SET alt_text=?,caption=? WHERE id=?").bind(text(d.cover_alt,300).trim(),text(d.cover_caption,500).trim(),coverMediaId).run();
  await env.DB.prepare(`INSERT INTO posts (id,author_id,title,slug,excerpt,content,content_format,type,status,category_id,cover_media_id,social_image,published_at,scheduled_at,featured,allow_comments,meta_title,meta_description,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,a.id,title,slug,excerpt,content,"markdown",type,status,d.category_id||null,coverMediaId,socialImage,published,scheduled,d.featured?1:0,d.allow_comments===false?0:1,text(d.meta_title,180).trim(),text(d.meta_description,300).trim(),ts,ts).run();
  await saveTags(env,id,d.tags);await saveTranslations(env,id,d.translations);if(ctx?.waitUntil)ctx.waitUntil(autoTranslatePost(env,id));await env.DB.prepare("INSERT INTO revisions (id,post_id,editor_id,title,excerpt,content,revision_number,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,a.id,title,excerpt,content,1,ts).run();
  await audit(env,a.id,"post.created","post",id,{status,type});return json({ok:true,post:await getPost(env,id)},201);
}
async function updatePost(env,a,id,d,ctx){
  const old=await getPost(env,id);if(!old)return fail("Artigo não encontrado.",404,"NOT_FOUND");const title=text(d.title,180).trim();if(!title)return fail("Título é obrigatório.",422);
  const slug=slugify(d.slug||title);if(!slug)return fail("Slug inválido.",422);const type=["article","news","guide","tutorial","announcement","release","update","story"].includes(d.type)?d.type:old.type;
  let status=["draft","scheduled","published","archived"].includes(d.status)?d.status:old.status;const scheduled=d.scheduled_at?new Date(d.scheduled_at).toISOString():null;let published=d.published_at?new Date(d.published_at).toISOString():old.published_at;
  if(status==="published"&&!published)published=nowIso();if(status==="scheduled"&&!scheduled)return fail("Um artigo agendado precisa de data.",422);
  if(status==="scheduled"&&scheduled&&new Date(scheduled)<=new Date()){status="published";published=nowIso();}
  const ts=nowIso(),excerpt=text(d.excerpt,500).trim(),content=text(d.content,2000000);const coverMediaId=d.cover_media_id||null;let socialImage=DEFAULT_SOCIAL_IMAGE;if(coverMediaId){const cm=await env.DB.prepare("SELECT url FROM media WHERE id=? LIMIT 1").bind(coverMediaId).first();socialImage=text(cm?.url,2000).trim()||DEFAULT_SOCIAL_IMAGE;}
  if(coverMediaId&&(d.cover_alt!==undefined||d.cover_caption!==undefined))await env.DB.prepare("UPDATE media SET alt_text=?,caption=? WHERE id=?").bind(text(d.cover_alt,300).trim(),text(d.cover_caption,500).trim(),coverMediaId).run();
  await env.DB.prepare(`UPDATE posts SET title=?,slug=?,excerpt=?,content=?,type=?,status=?,category_id=?,cover_media_id=?,social_image=?,published_at=?,scheduled_at=?,featured=?,allow_comments=?,meta_title=?,meta_description=?,updated_at=? WHERE id=?`)
    .bind(title,slug,excerpt,content,type,status,d.category_id||null,coverMediaId,socialImage,published,scheduled,d.featured?1:0,d.allow_comments===false?0:1,text(d.meta_title,180).trim(),text(d.meta_description,300).trim(),ts,id).run();
  await saveTags(env,id,d.tags);await saveTranslations(env,id,d.translations);if(ctx?.waitUntil)ctx.waitUntil(autoTranslatePost(env,id));const max=await env.DB.prepare("SELECT COALESCE(MAX(revision_number),0) n FROM revisions WHERE post_id=?").bind(id).first();
  await env.DB.prepare("INSERT INTO revisions (id,post_id,editor_id,title,excerpt,content,revision_number,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,a.id,title,excerpt,content,Number(max?.n||0)+1,ts).run();
  await audit(env,a.id,"post.updated","post",id,{status,type});return json({ok:true,post:await getPost(env,id)});
}
async function uploadAuth(env,request){
  const g=await guard(env,request);if(g.error)return g.error;if(!env.IMAGEKIT_PRIVATE_KEY||!env.IMAGEKIT_PUBLIC_KEY)return fail("ImageKit não está configurado no Worker.",503,"IMAGEKIT_NOT_CONFIGURED");
  const expire=Math.floor(Date.now()/1000)+600,token=crypto.randomUUID(),signature=await hmacSha1(token+expire,env.IMAGEKIT_PRIVATE_KEY);
  return json({ok:true,token,expire,signature,publicKey:env.IMAGEKIT_PUBLIC_KEY,urlEndpoint:env.IMAGEKIT_URL_ENDPOINT||""});
}

async function sitemapPages(env){
  const maxRow=await env.DB.prepare("SELECT MAX(updated_at) lastmod FROM posts WHERE status='published' AND published_at IS NOT NULL").first();
  const catRows=await env.DB.prepare("SELECT c.slug,MAX(p.updated_at) lastmod FROM categories c LEFT JOIN posts p ON p.category_id=c.id AND p.status='published' AND p.published_at IS NOT NULL GROUP BY c.id,c.slug ORDER BY c.sort_order,c.name").all();
  const pages=[{path:"/",lastmod:maxRow?.lastmod},{path:"/blog/",lastmod:maxRow?.lastmod},{path:"/blog/posts",lastmod:maxRow?.lastmod},{path:"/blog/about",lastmod:null}];
  for(const c of (catRows.results||[]))pages.push({path:"/blog/"+c.slug,lastmod:c.lastmod||null});
  const out=pages.map(x=>{const lines=["  <url>","    <loc>"+xml("https://nexaurenstory.com"+x.path)+"</loc>"];if(x.lastmod)lines.push("    <lastmod>"+xml(x.lastmod)+"</lastmod>");lines.push("  </url>");return lines.join("\n");});
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+out.join("\n")+"\n</urlset>",{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public,max-age=3600"}});
}
async function sitemapPosts(env){
  const rows=await env.DB.prepare("SELECT slug,updated_at FROM posts WHERE status='published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT 50000").all();
  const out=(rows.results||[]).map(p=>{const lines=["  <url>","    <loc>"+xml("https://nexaurenstory.com/blog/post/"+encodeURIComponent(p.slug))+"</loc>"];if(p.updated_at)lines.push("    <lastmod>"+xml(p.updated_at)+"</lastmod>");lines.push("  </url>");return lines.join("\n");});
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+out.join("\n")+"\n</urlset>",{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public,max-age=3600"}});
}
async function sitemapIndex(){
  const body='<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://nexaurenstory.com/sitemap-pages.xml</loc></sitemap>\n  <sitemap><loc>https://nexaurenstory.com/sitemap-posts.xml</loc></sitemap>\n</sitemapindex>';
  return new Response(body,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public,max-age=3600"}});
}
async function robots(request){
  return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /search\nSitemap: https://nexaurenstory.com/sitemap.xml\n",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public,max-age=3600"}});
}

function seoHead(html,o){
  const set=(re,val)=>{html=html.replace(re,val);};
  set(/<html lang="[^"]*">/i,'<html lang="'+esc(o.lang)+'">');
  set(/<title>[\s\S]*?<\/title>/i,"<title>"+esc(o.title)+"</title>");
  set(/<meta name="description" content="[^"]*">/i,'<meta name="description" content="'+esc(o.desc)+'">');
  set(/<meta name="robots" content="[^"]*">/i,'<meta name="robots" content="'+esc(o.robots)+'">');
  set(/<link rel="canonical" href="[^"]*">/i,'<link rel="canonical" href="'+esc(o.canonical)+'">');
  set(/<link rel="alternate" hreflang="pt" href="[^"]*">/i,'<link rel="alternate" hreflang="pt" href="'+esc(o.ptUrl)+'">');
  if(o.enUrl)set(/<link rel="alternate" hreflang="en" href="[^"]*">/i,'<link rel="alternate" hreflang="en" href="'+esc(o.enUrl)+'">'); else html=html.replace(/<link rel="alternate" hreflang="en" href="[^"]*">/i,"");
  set(/<link rel="alternate" hreflang="x-default" href="[^"]*">/i,'<link rel="alternate" hreflang="x-default" href="'+esc(o.ptUrl)+'">');
  set(/<meta property="og:site_name" content="[^"]*">/i,'<meta property="og:site_name" content="Nexauren Story">');
  set(/<meta property="og:title" content="[^"]*">/i,'<meta property="og:title" content="'+esc(o.title)+'">');
  set(/<meta property="og:description" content="[^"]*">/i,'<meta property="og:description" content="'+esc(o.desc)+'">');
  set(/<meta property="og:type" content="[^"]*">/i,'<meta property="og:type" content="'+o.type+'">');
  set(/<meta property="og:url" content="[^"]*">/i,'<meta property="og:url" content="'+esc(o.canonical)+'">');
  set(/<meta property="og:image" content="[^"]*">/i,'<meta property="og:image" content="'+esc(o.image)+'">');
  set(/<meta property="og:image:width" content="[^"]*">/i,'<meta property="og:image:width" content="'+esc(o.imageWidth||1200)+'">');
  set(/<meta property="og:image:height" content="[^"]*">/i,'<meta property="og:image:height" content="'+esc(o.imageHeight||630)+'">');
  set(/<meta property="og:image:type" content="[^"]*">/i,'<meta property="og:image:type" content="image/png">');
  set(/<meta property="og:image:alt" content="[^"]*">/i,'<meta property="og:image:alt" content="'+esc(o.title)+'">');
  set(/<meta property="og:locale" content="[^"]*">/i,'<meta property="og:locale" content="'+(o.lang==="en"?"en_US":"pt_PT")+'">');
  set(/<meta property="og:locale:alternate" content="[^"]*">/i,'<meta property="og:locale:alternate" content="'+(o.lang==="en"?"pt_PT":"en_US")+'">');
  set(/<meta name="twitter:card" content="[^"]*">/i,'<meta name="twitter:card" content="summary_large_image">');
  set(/<meta name="twitter:title" content="[^"]*">/i,'<meta name="twitter:title" content="'+esc(o.title)+'">');
  set(/<meta name="twitter:description" content="[^"]*">/i,'<meta name="twitter:description" content="'+esc(o.desc)+'">');
  set(/<meta name="twitter:image" content="[^"]*">/i,'<meta name="twitter:image" content="'+esc(o.image)+'">');
  set(/<meta name="twitter:image:alt" content="[^"]*">/i,'<meta name="twitter:image:alt" content="'+esc(o.title)+'">');
  html=html.replace(/<meta property="article:[^>]+>\s*/gi,"");
  if(o.articleMeta)html=html.replace(/<\/head>/i,o.articleMeta+"</head>");
  html=html.replace(/<script id="nexauren-structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/i,'<script id="nexauren-structured-data" type="application/ld+json">'+safeJsonLd(o.structured)+'</script>');
  return html;
}
async function rss(env,request){
  const base=new URL(request.url).origin;
  if(!(await dbReady(env))) return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nexauren Story</title><link>'+base+'</link><description>Base de dados ainda não inicializada.</description></channel></rss>',{headers:{"content-type":"application/rss+xml; charset=utf-8","cache-control":"public,max-age=300"}});
  const rows=await env.DB.prepare("SELECT title,slug,excerpt,published_at FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 30").all();
  const items=rows.results.map(p=>"<item><title>"+esc(p.title)+"</title><link>"+base+"/blog/post/"+encodeURIComponent(p.slug)+"</link><guid>"+base+"/blog/post/"+encodeURIComponent(p.slug)+"</guid><pubDate>"+new Date(p.published_at).toUTCString()+"</pubDate><description>"+esc(p.excerpt||"")+"</description></item>").join("");
  return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nexauren Story</title><link>'+base+'</link><description>Stories, releases, guides and updates from Nexauren.</description>'+items+"</channel></rss>",{headers:{"content-type":"application/rss+xml; charset=utf-8","cache-control":"public,max-age=1800"}});
}
async function api(env,request,url,ctx){
  const p=url.pathname,m=request.method;
  if(p==="/api/health"&&m==="GET"){try{const check=await dbCheck(env),ready=check.ready;return json({ok:ready,db:ready,ready,imagekit:!!(env.IMAGEKIT_PRIVATE_KEY&&env.IMAGEKIT_PUBLIC_KEY),translation:!!env.AI,translation_model:env.TRANSLATION_AI_MODEL||"@cf/google/gemma-4-26b-a4b-it",version:"1.8.0",schema:ready?{status:"ok"}:{status:"incomplete",missingTables:check.missingTables,missingColumns:check.missingColumns,error:check.error||null},account:{ready:await accountSchemaReady(env)}},ready?200:503);}catch{return fail("D1 indisponível.",503,"DB_UNAVAILABLE");}}
  if(p==="/api/account/me"&&m==="GET"){
    if(!(await accountSchemaReady(env)))return fail("As tabelas de contas ainda não foram instaladas. Execute database/platform-upgrade.sql.",503,"ACCOUNT_SCHEMA_NOT_READY");
    const a=await accountAuth(env,request);return json({ok:true,authenticated:!!a,account:a?{id:a.id,email:a.email,display_name:a.display_name,email_verified:!!a.email_verified}:null});
  }
  if(p==="/api/account/register"&&m==="POST"){
    if(!(await accountSchemaReady(env)))return fail("As tabelas de contas ainda não foram instaladas. Execute database/platform-upgrade.sql.",503,"ACCOUNT_SCHEMA_NOT_READY");
    if(!sameOrigin(request))return fail("Origem não autorizada.",403);
    const d=await bodyJson(request),email=normalizeEmail(d?.email),name=text(d?.display_name,80).trim(),pw=String(d?.password||"");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail("Introduza um email válido.",422);
    if(name.length<2)return fail("O nome precisa de pelo menos 2 caracteres.",422);
    if(pw.length<8||pw.length>128)return fail("A palavra-passe precisa ter entre 8 e 128 caracteres.",422);
    const ipId="register|"+await sha256(request.headers.get("CF-Connecting-IP")||"");
    const recent=await env.DB.prepare("SELECT COUNT(*) n FROM account_login_attempts WHERE identifier=? AND success=0 AND created_at>=?").bind(ipId,new Date(Date.now()-3600000).toISOString()).first();
    if(Number(recent?.n||0)>=5)return fail("Muitas tentativas de cadastro. Tente novamente mais tarde.",429,"RATE_LIMIT");
    if(await env.DB.prepare("SELECT id FROM account_profiles WHERE email=? LIMIT 1").bind(email).first())return fail("Já existe uma conta com este email.",409,"EMAIL_EXISTS");
    try{
      const id=crypto.randomUUID(),ts=nowIso(),hash=await hashPassword(pw);
      await env.DB.prepare("INSERT INTO account_profiles (id,email,password_hash,display_name,status,email_verified,last_login_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,email,hash,name,"active",0,ts,ts,ts).run();
      await env.DB.prepare("INSERT INTO account_login_attempts (id,identifier,success,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),ipId,1,ts).run();
      const session=await createAccountSession(env,id,request);
      return json({ok:true,account:{id,email,display_name:name,email_verified:false}},201,{"set-cookie":cookie(ACCOUNT_COOKIE,session.token,{maxAge:ACCOUNT_SESSION_SECONDS})});
    }catch(e){console.error("account.register",e);return fail("Não foi possível criar a conta.",500,"ACCOUNT_DB_ERROR");}
  }
  if(p==="/api/account/login"&&m==="POST"){
    if(!(await accountSchemaReady(env)))return fail("As tabelas de contas ainda não foram instaladas. Execute database/platform-upgrade.sql.",503,"ACCOUNT_SCHEMA_NOT_READY");
    if(!sameOrigin(request))return fail("Origem não autorizada.",403);
    const d=await bodyJson(request),email=normalizeEmail(d?.email),pw=String(d?.password||"");if(!email||!pw)return fail("Email e palavra-passe são obrigatórios.",422);
    const identifier=email+"|"+await sha256(request.headers.get("CF-Connecting-IP")||"");
    const recent=await env.DB.prepare("SELECT COUNT(*) n FROM account_login_attempts WHERE identifier=? AND success=0 AND created_at>=?").bind(identifier,new Date(Date.now()-900000).toISOString()).first();
    if(Number(recent?.n||0)>=8)return fail("Muitas tentativas. Tente novamente mais tarde.",429,"RATE_LIMIT");
    const a=await env.DB.prepare("SELECT * FROM account_profiles WHERE email=? LIMIT 1").bind(email).first();
    const ok=a&&a.status==="active"&&await verifyPassword(pw,a.password_hash);
    await env.DB.prepare("INSERT INTO account_login_attempts (id,identifier,success,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),identifier,ok?1:0,nowIso()).run();
    if(!ok)return fail("Email ou palavra-passe inválidos.",401,"INVALID_CREDENTIALS");
    const ts=nowIso();await env.DB.prepare("UPDATE account_profiles SET last_login_at=?,updated_at=? WHERE id=?").bind(ts,ts,a.id).run();
    await env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?").bind(a.id).run();
    const session=await createAccountSession(env,a.id,request);
    return json({ok:true,account:{id:a.id,email:a.email,display_name:a.display_name,email_verified:!!a.email_verified}},200,{"set-cookie":cookie(ACCOUNT_COOKIE,session.token,{maxAge:ACCOUNT_SESSION_SECONDS})});
  }
  if(p==="/api/account/logout"&&m==="POST"){
    const raw=getCookie(request,ACCOUNT_COOKIE);if(raw)await env.DB.prepare("DELETE FROM account_sessions WHERE token_hash=?").bind(await sha256(raw)).run();
    return json({ok:true},200,{"set-cookie":cookie(ACCOUNT_COOKIE,"",{maxAge:0})});
  }

  if(!(await dbReady(env))) return fail("O D1 ainda não foi inicializado. Execute o conteúdo completo de schema.sql no banco nexauren-blog e publique novamente.",503,"DB_NOT_READY");
  try{await publishDue(env);}catch(e){console.error("publishDue",e);}
  if(p==="/api/auth/login"&&m==="POST"){
    try{
    if(!sameOrigin(request))return fail("Origem não autorizada.",403);const d=await bodyJson(request),email=normalizeEmail(d?.email),pw=String(d?.password||"");
    if(!email||!pw||pw.length>200)return fail("Email e senha são obrigatórios.",422);const identifier=email+"|"+await sha256(request.headers.get("CF-Connecting-IP")||"");
    const recent=await env.DB.prepare("SELECT COUNT(*) n FROM login_attempts WHERE identifier=? AND success=0 AND created_at>=?").bind(identifier,new Date(Date.now()-900000).toISOString()).first();
    if(Number(recent?.n||0)>=8)return fail("Muitas tentativas. Tente novamente mais tarde.",429,"RATE_LIMIT");
    let u=await env.DB.prepare("SELECT * FROM users WHERE email=? LIMIT 1").bind(email).first();
    if(!u){
      const count=await env.DB.prepare("SELECT COUNT(*) n FROM users").first(),be=normalizeEmail(env.ADMIN_EMAIL),bp=String(env.ADMIN_PASSWORD||"");
      if(Number(count?.n||0)===0&&be&&bp&&email===be&&pw===bp){const id=crypto.randomUUID(),ts=nowIso();await env.DB.prepare("INSERT INTO users (id,email,password_hash,display_name,role,status,email_verified,last_login_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,email,await hashPassword(pw),"Nexauren Owner","owner","active",1,ts,ts,ts).run();u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();await audit(env,id,"auth.bootstrap","user",id,{});}
    }
    const ok=u&&u.status==="active"&&await verifyPassword(pw,u.password_hash);await env.DB.prepare("INSERT INTO login_attempts (id,identifier,success,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),identifier,ok?1:0,nowIso()).run();
    if(!ok)return fail("Email ou senha inválidos.",401,"INVALID_CREDENTIALS");const ts=nowIso();await env.DB.prepare("UPDATE users SET last_login_at=?,updated_at=? WHERE id=?").bind(ts,ts,u.id).run();const s=await createSession(env,u.id,request);await audit(env,u.id,"auth.login","user",u.id,{});
    return json({ok:true,user:{id:u.id,email:u.email,display_name:u.display_name,role:u.role}},200,{"set-cookie":cookie(COOKIE,s.token,{maxAge:SESSION_SECONDS})});
    }catch(e){console.error("auth.login",e);return fail("Falha ao autenticar no D1. " + String(e?.message||"Verifique o schema.sql e a configuração do D1."),500,"AUTH_DB_ERROR");}
  }
  if(p==="/api/auth/logout"&&m==="POST"){const raw=getCookie(request,COOKIE);if(raw){const h=await sha256(raw),s=await env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash=?").bind(h).first();if(s)await audit(env,s.user_id,"auth.logout","user",s.user_id,{});await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(h).run();}return json({ok:true},200,{"set-cookie":cookie(COOKIE,"",{maxAge:0})});}
  if(p==="/api/auth/me"&&m==="GET"){const u=await auth(env,request);return u?json({ok:true,user:{id:u.id,email:u.email,display_name:u.display_name,role:u.role}}):json({ok:false,user:null},401);}
  if(p==="/api/auth/password"&&m==="POST"){const g=await guard(env,request);if(g.error)return g.error;const d=await bodyJson(request),cur=String(d?.current_password||""),next=String(d?.new_password||"");if(next.length<12)return fail("A nova senha precisa ter pelo menos 12 caracteres.",422);const u=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(g.auth.id).first();if(!u||!(await verifyPassword(cur,u.password_hash)))return fail("Senha atual inválida.",401);await env.DB.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").bind(await hashPassword(next),nowIso(),g.auth.id).run();await env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(g.auth.id,g.auth.session_id).run();await audit(env,g.auth.id,"auth.password_changed","user",g.auth.id,{});return json({ok:true});}
  if(p==="/api/media/auth"&&m==="GET")return uploadAuth(env,request);
  if(p==="/api/media"&&m==="GET"){const g=await guard(env,request);if(g.error)return g.error;const r=await env.DB.prepare("SELECT * FROM media ORDER BY created_at DESC LIMIT 100").all();return json({ok:true,media:r.results});}
  if(p==="/api/media"&&m==="POST"){const g=await guard(env,request);if(g.error)return g.error;const d=await bodyJson(request);if(!d?.url||!d?.fileId)return fail("Resposta do ImageKit incompleta.",422);if(d.fileType&&d.fileType!=="image")return fail("Apenas imagens são permitidas.",415,"UNSUPPORTED_MEDIA");const id=crypto.randomUUID();await env.DB.prepare("INSERT INTO media (id,imagekit_file_id,url,thumbnail_url,filename,mime_type,size_bytes,width,height,alt_text,caption,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,d.fileId,d.url,d.thumbnailUrl||d.url,text(d.name||d.fileName,255),text(d.fileType||d.mime,100),Number(d.size||0),Number(d.width||0)||null,Number(d.height||0)||null,text(d.altText||"",300),text(d.caption||"",500),g.auth.id,nowIso()).run();await audit(env,g.auth.id,"media.uploaded","media",id,{filename:d.name||d.fileName});return json({ok:true,media:await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first()},201);}
  const mm=p.match(/^\/api\/media\/([^/]+)$/);if(mm&&m==="DELETE"){const g=await guard(env,request,true);if(g.error)return g.error;const id=mm[1],row=await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first();if(!row)return fail("Mídia não encontrada.",404);if(env.IMAGEKIT_PRIVATE_KEY&&row.imagekit_file_id){const authHeader="Basic "+btoa(env.IMAGEKIT_PRIVATE_KEY+":");const ir=await fetch("https://api.imagekit.io/v1/files/"+encodeURIComponent(row.imagekit_file_id),{method:"DELETE",headers:{Authorization:authHeader,Accept:"application/json"}});if(!ir.ok&&ir.status!==404)return fail("O arquivo não pôde ser removido do ImageKit.",502,"IMAGEKIT_DELETE_FAILED");}await env.DB.prepare("UPDATE posts SET cover_media_id=NULL,social_image=? WHERE cover_media_id=?").bind(DEFAULT_SOCIAL_IMAGE,id).run();await env.DB.prepare("DELETE FROM media WHERE id=?").bind(id).run();await audit(env,g.auth.id,"media.deleted","media",id,{filename:row.filename});return json({ok:true});}
  if(p==="/api/categories"&&m==="GET"){const r=await env.DB.prepare("SELECT c.*,(SELECT COUNT(*) FROM posts p WHERE p.category_id=c.id) post_count FROM categories c ORDER BY c.sort_order,c.name").all();return json({ok:true,categories:r.results});}
  if(p==="/api/categories"&&m==="POST"){const g=await guard(env,request);if(g.error)return g.error;const d=await bodyJson(request),name=text(d?.name,100).trim(),slug=slugify(d?.slug||name);if(!name||!slug)return fail("Nome da categoria é obrigatório.",422);if(await env.DB.prepare("SELECT id FROM categories WHERE slug=?").bind(slug).first())return fail("Esse slug já existe.",409);const id=crypto.randomUUID();await env.DB.prepare("INSERT INTO categories (id,name,slug,description,icon,parent_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,name,slug,text(d?.description,500),text(d?.icon,30),d?.parent_id||null,Number(d?.sort_order||0),nowIso(),nowIso()).run();await audit(env,g.auth.id,"category.created","category",id,{name});return json({ok:true,category:await env.DB.prepare("SELECT * FROM categories WHERE id=?").bind(id).first()},201);}
  const cm=p.match(/^\/api\/categories\/([^/]+)$/);if(cm&&m==="DELETE"){const g=await guard(env,request,true);if(g.error)return g.error;const id=cm[1],row=await env.DB.prepare("SELECT name FROM categories WHERE id=?").bind(id).first();if(!row)return fail("Categoria não encontrada.",404);const c=await env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE category_id=?").bind(id).first();if(Number(c?.n||0))return fail("A categoria ainda possui artigos.",409);await env.DB.prepare("DELETE FROM categories WHERE id=?").bind(id).run();await audit(env,g.auth.id,"category.deleted","category",id,{name:row.name});return json({ok:true});}
  if(p==="/api/tags"&&m==="GET"){const r=await env.DB.prepare("SELECT t.*,(SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id=t.id) post_count FROM tags t ORDER BY t.name").all();return json({ok:true,tags:r.results});}
  if(p==="/api/settings"&&m==="GET"){const g=await guard(env,request);if(g.error)return g.error;const r=await env.DB.prepare("SELECT key,value,type FROM settings ORDER BY key").all(),s={};for(const x of r.results)s[x.key]=x.value;return json({ok:true,settings:s});}
  if(p==="/api/settings"&&m==="PUT"){const g=await guard(env,request,true);if(g.error)return g.error;const d=await bodyJson(request);for(const [key,value] of Object.entries(d||{}).slice(0,100)){if(!/^[a-z0-9_.-]{1,80}$/i.test(key))continue;await env.DB.prepare("INSERT INTO settings (key,value,type,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,type=excluded.type,updated_at=excluded.updated_at").bind(key,String(value).slice(0,10000),typeof value==="number"?"number":"string",nowIso()).run();}await audit(env,g.auth.id,"settings.updated","settings",null,{keys:Object.keys(d||{})});return json({ok:true});}
  if(p==="/api/activity"&&m==="GET"){const g=await guard(env,request);if(g.error)return g.error;const r=await env.DB.prepare("SELECT a.*,u.display_name,u.email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100").all();return json({ok:true,activity:r.results});}
  if(p==="/api/stats"&&m==="GET"){const g=await guard(env,request);if(g.error)return g.error;const [a,b,c,d,e]=await Promise.all([env.DB.prepare("SELECT COUNT(*) n FROM posts").first(),env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE status='published'").first(),env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE status='draft'").first(),env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE status='scheduled'").first(),env.DB.prepare("SELECT COUNT(*) n FROM media").first()]);return json({ok:true,stats:{posts:Number(a?.n||0),published:Number(b?.n||0),drafts:Number(c?.n||0),scheduled:Number(d?.n||0),media:Number(e?.n||0)}});}
  if(p==="/api/posts"&&m==="GET"){if(url.searchParams.get("all")==="1"){const g=await guard(env,request);if(g.error)return g.error;return postsAdmin(env,url)}return publicPosts(env,url);}
  if(p==="/api/posts"&&m==="POST"){const g=await guard(env,request);if(g.error)return g.error;return createPost(env,g.auth,(await bodyJson(request))||{},ctx);}
  const idm=p.match(/^\/api\/posts\/([^/]+)$/);if(idm&&m==="GET"){const g=await guard(env,request);if(g.error)return g.error;const post=await getPost(env,idm[1]);return post?json({ok:true,post}):fail("Artigo não encontrado.",404);}
  if(idm&&m==="PUT"){const g=await guard(env,request);if(g.error)return g.error;return updatePost(env,g.auth,idm[1],(await bodyJson(request))||{},ctx);}
  if(idm&&m==="DELETE"){const g=await guard(env,request,true);if(g.error)return g.error;const row=await env.DB.prepare("SELECT title FROM posts WHERE id=?").bind(idm[1]).first();if(!row)return fail("Artigo não encontrado.",404);await env.DB.prepare("DELETE FROM posts WHERE id=?").bind(idm[1]).run();await audit(env,g.auth.id,"post.deleted","post",idm[1],{title:row.title});return json({ok:true});}
  const pm=p.match(/^\/api\/posts\/slug\/(.+)$/);if(pm&&m==="GET"){const slug=decodeURIComponent(pm[1]),lang=["en","pt"].includes(url.searchParams.get("lang"))?url.searchParams.get("lang"):"pt",row=await env.DB.prepare("SELECT p.id,p.title,p.slug,p.excerpt,p.content,p.type,p.status,p.category_id,p.cover_media_id,CASE WHEN NULLIF(m.url,'') IS NOT NULL THEN m.url ELSE 'https://nexaurenstory.com/social-preview.png?v=20260922-1' END social_image,p.published_at,p.featured,p.allow_comments,p.meta_title,p.meta_description,c.name category_name,c.slug category_slug,m.url cover_url,m.width cover_width,m.height cover_height,m.alt_text cover_alt,u.display_name author_name,t.id translation_id,t.title translation_title,t.excerpt translation_excerpt,t.content translation_content,t.meta_title translation_meta_title,t.meta_description translation_meta_description FROM posts p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN media m ON m.id=p.cover_media_id LEFT JOIN users u ON u.id=p.author_id LEFT JOIN post_translations t ON t.post_id=p.id AND t.language=? WHERE p.slug=? AND p.status='published' LIMIT 1").bind(lang,slug).first();if(!row)return fail("Artigo não encontrado.",404,"NOT_FOUND");const tags=await env.DB.prepare("SELECT t.id,t.name,t.slug FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=? ORDER BY t.name").bind(row.id).all();const post={...row,title:row.translation_title||row.title,excerpt:row.translation_excerpt||row.excerpt,content:row.translation_content||row.content,meta_title:row.translation_meta_title||row.meta_title,meta_description:row.translation_meta_description||row.meta_description,translation_available:!!row.translation_id,tags:tags.results};delete post.translation_id;delete post.translation_title;delete post.translation_excerpt;delete post.translation_content;delete post.translation_meta_title;delete post.translation_meta_description;return json({ok:true,language:lang,post});}
  if(p==="/api/search"&&m==="GET"){const q=text(url.searchParams.get("q")||"",100).trim(),lang=["en","pt"].includes(url.searchParams.get("lang"))?url.searchParams.get("lang"):"pt";if(q.length<2)return json({ok:true,language:lang,posts:[]});const s="%"+q+"%",r=await env.DB.prepare("SELECT p.id,COALESCE(NULLIF(t.title,''),p.title) title,p.slug,COALESCE(NULLIF(t.excerpt,''),p.excerpt) excerpt,p.type,p.published_at,p.featured,c.name category_name,COALESCE(NULLIF(m.url,''),NULLIF(p.social_image,'')) cover_url FROM posts p LEFT JOIN post_translations t ON t.post_id=p.id AND t.language=? LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN media m ON m.id=p.cover_media_id WHERE p.status='published' AND (COALESCE(NULLIF(t.title,''),p.title) LIKE ? OR COALESCE(NULLIF(t.excerpt,''),p.excerpt) LIKE ? OR COALESCE(NULLIF(t.content,''),p.content) LIKE ?) ORDER BY p.published_at DESC LIMIT 30").bind(lang,s,s,s).all();return json({ok:true,language:lang,posts:r.results});}
  return fail("Endpoint não encontrado.",404,"NOT_FOUND");
}
async function page(env,request,url){
  if(url.pathname==="/sitemap.xml")return sitemapIndex();
  if(url.pathname==="/sitemap-pages.xml")return sitemapPages(env);
  if(url.pathname==="/sitemap-posts.xml")return sitemapPosts(env);
  if(url.pathname==="/robots.txt")return robots(request);
  if(url.pathname==="/rss.xml")return rss(env,request);
  if(url.pathname.startsWith("/assets/")||url.pathname.startsWith("/admin-assets/")||["/favicon.svg","/nexauren-story-favicon.svg","/nexauren-story-favicon.png","/nexauren-story-favicon.ico","/nexauren-story-apple-touch-icon.png","/favicon.png","/apple-touch-icon.png","/social-preview.svg","/social-preview.png","/nexauren-story-social-preview.svg","/nexauren-story-social-preview.png","/og-image.jpg","/manifest.json"].includes(url.pathname))return env.ASSETS.fetch(request);
  if(url.pathname==="/admin"||url.pathname.startsWith("/admin/")){
    const r=await env.ASSETS.fetch(new Request(new URL("/admin/index.html",request.url)));
    const h=new Headers(r.headers);h.set("X-Robots-Tag","noindex, nofollow");return new Response(r.body,{status:r.status,headers:h});
  }
  if(url.pathname==="/"||url.pathname==="/account"||url.pathname.startsWith("/account/")||url.pathname==="/tool"||url.pathname==="/tool/"||url.pathname.startsWith("/tool/")){
    if(url.pathname==="/account"||url.pathname==="/account/"){
      const r=await env.ASSETS.fetch(new Request(new URL("/account/index.html",request.url)));
      const h=new Headers(r.headers);h.set("X-Robots-Tag","noindex, nofollow");return new Response(r.body,{status:r.status,headers:h});
    }
    if(url.pathname==="/" )return env.ASSETS.fetch(new Request(new URL("/index.html",request.url)));
    if(url.pathname==="/tool"||url.pathname==="/tool/")return env.ASSETS.fetch(new Request(new URL("/tool/index.html",request.url)));
    let r=await env.ASSETS.fetch(request);
    if(!r.ok&&url.pathname.endsWith("/"))r=await env.ASSETS.fetch(new Request(new URL(url.pathname+"index.html",request.url)));
    return r;
  }
  const isBlog=url.pathname==="/blog"||url.pathname.startsWith("/blog/");
  if(!isBlog){
    const legacyExact=["/posts","/about","/search"];
    if(legacyExact.includes(url.pathname)||url.pathname.startsWith("/post/")){
      const target=new URL(blogPublicPath(url.pathname),request.url);
      target.search=url.search;
      return Response.redirect(target,301);
    }
    if(/^\/[^/]+$/.test(url.pathname)&&url.pathname!=="/"){
      try{
        if(await dbReady(env)){
          const legacyCategory=await env.DB.prepare("SELECT slug FROM categories WHERE slug=? LIMIT 1").bind(url.pathname.slice(1)).first();
          if(legacyCategory){
            const target=new URL(blogPublicPath(url.pathname),request.url);
            target.search=url.search;
            return Response.redirect(target,301);
          }
        }
      }catch{}
    }
    return env.ASSETS.fetch(new Request(new URL("/index.html",request.url)));
  }
  const asset=await env.ASSETS.fetch(new Request(new URL("/blog/index.html",request.url)));
  if(!asset.ok)return asset;
  let h=await asset.text();
  const path=url.pathname==="/blog"||url.pathname==="/blog/"?"/":url.pathname.slice("/blog".length)||"/";
  const publicPath=blogPublicPath(path);
  const cookieLang=getCookie(request,"ns_lang")||"pt";
  const lang=["en","pt"].includes(url.searchParams.get("lang"))?url.searchParams.get("lang"):(["en","pt"].includes(cookieLang)?cookieLang:"pt");
  const image="https://nexaurenstory.com/social-preview.png?v=20260922-1";
  let title=lang==="en"?"Nexauren Story — Official stories and updates":"Nexauren Story — Histórias e novidades oficiais";
  let desc=lang==="en"?"Official stories, launches, guides and updates from the Nexauren ecosystem.":"Histórias, lançamentos, guias e atualizações oficiais do ecossistema Nexauren.";
  let type="website",articleMeta="";
  let structured={"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://nexaurenstory.com/#website","url":"https://nexaurenstory.com/","name":"Nexauren Story","inLanguage":lang},{"@type":"Organization","@id":"https://nexaurenstory.com/#organization","name":"Nexauren Story","url":"https://nexaurenstory.com/","logo":{"@type":"ImageObject","url":"https://nexaurenstory.com/nexauren-story-favicon.svg?v=20260922-1"}}]};
  const canonical=publicUrl(publicPath,lang),ptUrl=publicUrl(publicPath,"pt"),enUrl=publicUrl(publicPath,"en");
  if(path.match(/^\/post\/[^/]+$/)){
    if(!(await dbReady(env)))return asset;
    const slug=decodeURIComponent(path.slice(6));
    const p=await env.DB.prepare("SELECT p.title,p.slug,p.excerpt,p.content,p.meta_title,p.meta_description,CASE WHEN NULLIF(m.url,'') IS NOT NULL THEN m.url ELSE 'https://nexaurenstory.com/social-preview.png?v=20260922-1' END social_image,p.published_at,p.updated_at,p.type,c.name category_name,c.slug category_slug,m.url cover_url,m.width cover_width,m.height cover_height,m.alt_text cover_alt,u.display_name author_name,t.title translation_title,t.excerpt translation_excerpt,t.meta_title translation_meta_title,t.meta_description translation_meta_description FROM posts p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN media m ON m.id=p.cover_media_id LEFT JOIN users u ON u.id=p.author_id LEFT JOIN post_translations t ON t.post_id=p.id AND t.language=? WHERE p.slug=? AND p.status='published' LIMIT 1").bind(lang,slug).first();
    if(!p)return asset;
    const localizedTitle=lang==="en"?(p.translation_title||p.title):p.title;
    const localizedMetaTitle=lang==="en"?(p.translation_meta_title||""):(p.meta_title||"");
    const localizedDesc=lang==="en"?(p.translation_meta_description||p.translation_excerpt||p.excerpt||"Nexauren Story"):(p.meta_description||p.excerpt||"Nexauren Story");
    title=(localizedMetaTitle||localizedTitle)+" — Nexauren Story";
    desc=localizedDesc.slice(0,300);
    type="article";
    const imgRaw=p.social_image||p.cover_url||image,img=imgRaw.startsWith("http")?imgRaw:new URL(imgRaw,"https://nexaurenstory.com").href,section=p.category_name||"Posts",sectionEn={"breaking-news":"Breaking News","tecnologia":"Technology","entretenimento":"Entertainment","nexauren":"Nexauren","eventos":"Events","ferramentas":"Tools"}[p.category_slug]||section;
    articleMeta='<meta property="article:published_time" content="'+esc(p.published_at||"")+'"><meta property="article:modified_time" content="'+esc(p.updated_at||p.published_at||"")+'"><meta property="article:section" content="'+esc(section)+'">';
    structured={"@context":"https://schema.org","@graph":[{"@type":p.type==="news"?"NewsArticle":"Article","@id":canonical+"#article","headline":localizedTitle.slice(0,180),"description":desc,"url":canonical,"image":[img],"datePublished":p.published_at,"dateModified":p.updated_at||p.published_at,"wordCount":String(p.content||"").trim().split(/\s+/).filter(Boolean).length,"isAccessibleForFree":true,"author":{"@type":"Person","name":p.author_name||"Nexauren Story","url":"https://nexaurenstory.com/about"},"publisher":{"@type":"Organization","name":"Nexauren Story","url":"https://nexaurenstory.com/","logo":{"@type":"ImageObject","url":"https://nexaurenstory.com/nexauren-story-favicon.png?v=20260922-2"}},"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"inLanguage":lang,"articleSection":lang==="en"?sectionEn:section},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Nexauren Story","item":"https://nexaurenstory.com/"},{"@type":"ListItem","position":2,"name":lang==="en"?sectionEn:section,"item":publicUrl("/"+(p.category_slug||"posts"),lang)},{"@type":"ListItem","position":3,"name":localizedTitle,"item":canonical}]}]};
    structured['@graph'][0].image=[img];
    const hasEnglish=!!p.translation_title;
    const articleRobots=(lang==="en"&&!hasEnglish)?"noindex,follow":"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
    const articleCanonical=(lang==="en"&&!hasEnglish)?ptUrl:canonical;
    return new Response(seoHead(h,{lang,title,desc,robots:articleRobots,canonical:articleCanonical,ptUrl,enUrl:hasEnglish?enUrl:"",type,image:img,imageWidth:p.cover_width||1200,imageHeight:p.cover_height||630,articleMeta,structured}),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=300"}});
  }
  if(path==="/posts"){title=lang==="en"?"Latest stories — Nexauren Story":"Mais recentes — Nexauren Story";desc=lang==="en"?"Browse the latest stories, launches, guides and updates from Nexauren.":"Veja as histórias, lançamentos, guias e atualizações mais recentes da Nexauren.";}
  else if(path==="/about"){title=lang==="en"?"About Nexauren Story":"Sobre o Nexauren Story";desc=lang==="en"?"The official public home for Nexauren products, applications, ideas and milestones.":"O espaço público oficial para produtos, aplicações, ideias e marcos da Nexauren.";}
  else if(path==="/search"){title=lang==="en"?"Search — Nexauren Story":"Pesquisar — Nexauren Story";desc=lang==="en"?"Search Nexauren Story.":"Pesquisar no Nexauren Story.";}
  else if(await dbReady(env)){
    const c=await env.DB.prepare("SELECT name,slug,description FROM categories WHERE slug=? LIMIT 1").bind(path.slice(1)).first();
    if(c){const enNames={"breaking-news":"Breaking News","tecnologia":"Technology","entretenimento":"Entertainment","nexauren":"Nexauren","eventos":"Events","ferramentas":"Tools"};title=(lang==="en"?(enNames[c.slug]||c.name):c.name)+" — Nexauren Story";desc=(lang==="en"?({"breaking-news":"Urgent news and recent events.","tecnologia":"Technology, innovation and digital products.","entretenimento":"Music, video, games and culture.","nexauren":"Products, apps and Nexauren projects.","eventos":"Events and live launches.","ferramentas":"Tools and utilities."}[c.slug]||c.description):c.description||"Explore histórias e atualizações desta categoria.").slice(0,300);}
  }
  const pageType=path==="/about"?"AboutPage":path==="/posts"?"CollectionPage":path==="/search"?"SearchResultsPage":path==="/"?"WebPage":"CollectionPage";
  structured={"@context":"https://schema.org","@graph":[
    {"@type":"WebSite","@id":"https://nexaurenstory.com/#website","url":"https://nexaurenstory.com/","name":"Nexauren Story","inLanguage":lang},
    {"@type":"Organization","@id":"https://nexaurenstory.com/#organization","name":"Nexauren Story","url":"https://nexaurenstory.com/","logo":{"@type":"ImageObject","url":"https://nexaurenstory.com/favicon.png?v=20260921-2"}},
    {"@type":pageType,"@id":canonical+"#webpage","url":canonical,"name":title,"description":desc,"inLanguage":lang,"isPartOf":{"@id":"https://nexaurenstory.com/#website"}}
  ]};
  if(path!=="/"){
    structured["@graph"].push({"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Nexauren Story","item":"https://nexaurenstory.com/"},
      {"@type":"ListItem","position":2,"name":title,"item":canonical}
    ]});
  }
  const robotsValue=path==="/search"?"noindex,follow":"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
  return new Response(seoHead(h,{lang,title,desc,robots:robotsValue,canonical,ptUrl,enUrl,type,image,articleMeta,structured}),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public,max-age=300"}});
}
export default{
  async fetch(request,env,ctx){try{const url=new URL(request.url);if(url.pathname.startsWith("/api/"))return await api(env,request,url,ctx);return await page(env,request,url);}catch(e){console.error(e);return fail("Erro interno do servidor.",500,"INTERNAL_ERROR");}},
  async scheduled(_controller,env){try{await publishDue(env);await cleanup(env);}catch(e){console.error(e);}}
};