import { jwtVerify, importX509 } from "jose";
const COOKIE = "ns_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_SOCIAL_IMAGE = "https://nexaurenstory.com/assets/social-preview-nexauren.png?v=20260926-2";
function isSvgUrl(value){
  try{
    const u=new URL(String(value||""), "https://nexaurenstory.com");
    const p=u.pathname.toLowerCase();
    const tr=(u.searchParams.get("tr")||"").toLowerCase();
    return p.endsWith(".svg") || /(^|,)f-svg(,|$)/.test(tr);
  }catch{return false;}
}
function isFaviconUrl(value){
  try{
    const u=new URL(String(value||""), "https://nexaurenstory.com");
    const p=u.pathname.toLowerCase();
    return p.endsWith("/favicon-nexauren.png") || p.endsWith("/nexauren-brand.png");
  }catch{return false;}
}
function cleanCoverUrl(value){
  const v=String(value||"").trim();
  if(!v || isSvgUrl(v) || isFaviconUrl(v))return null;
  return v;
}
function preferredImage(...values){
  for(const value of values){
    const v=String(value||"").trim();
    if(v && !isSvgUrl(v) && !isFaviconUrl(v))return v;
  }
  return DEFAULT_SOCIAL_IMAGE;
}
function imageMime(value){
  try{
    const u=new URL(String(value||""), "https://nexaurenstory.com");
    const p=u.pathname.toLowerCase();
    const tr=(u.searchParams.get("tr")||"").toLowerCase();
    if(/(^|,)f-(?:jpg|jpeg)(,|$)/.test(tr))return "image/jpeg";
    if(/(^|,)f-png(,|$)/.test(tr))return "image/png";
    if(/\.jpe?g$/.test(p))return "image/jpeg";
    if(/\.webp$/.test(p))return "image/webp";
    if(/\.gif$/.test(p))return "image/gif";
    if(/\.avif$/.test(p))return "image/avif";
  }catch{}
  return "image/png";
}
function socialImageForCover(value){
  const v=String(value||"").trim();
  if(!v || isSvgUrl(v) || isFaviconUrl(v))return DEFAULT_SOCIAL_IMAGE;
  try{
    const u=new URL(v);
    if(/(^|\.)ik\.imagekit\.io$/i.test(u.hostname)){
      const tr=(u.searchParams.get("tr")||"").trim();
      if(!/(^|,)f-(?:jpg|jpeg)(,|$)/i.test(tr))u.searchParams.set("tr",tr?tr+",f-jpg,q-85":"f-jpg,q-85");
      return u.toString();
    }
  }catch{}
  return v;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", ...headers }
  });
}
function fail(message,status=400,code="BAD_REQUEST",details=null){
  let safeStatus=Number(status);
  if(!Number.isInteger(safeStatus)||safeStatus<200||safeStatus>599)safeStatus=400;
  const payload={ok:false,error:message,code};
  if(details)payload.details=String(details).slice(0,300);
  return json(payload,safeStatus);
}
function nowIso(){return new Date().toISOString();}
function normalizeEmail(email){return String(email||"").trim().toLowerCase();}
function slugify(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/['’"]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-").slice(0,180);}
function text(v,max=1000000){return String(v??"").slice(0,max);}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function xml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function publicUrl(path,language="pt"){const u=new URL(path,"https://nexaurenstory.com");if(language==="en")u.searchParams.set("lang","en");return u.href;}
function safeJsonLd(v){return JSON.stringify(v).replace(/</g,"\\u003c");}

const DUMMY_PASSWORD_HASH="pbkdf2$100000$bmV4YXVyZW4tZHVtbXkhIQ==$U9sMbP6gZ3gM76yZKWit5js74oHgAbqewfMqFO9livQ=";
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
const FIREBASE_PROJECT_ID = "nexauren-story";
const FIREBASE_ISSUER = "https://securetoken.google.com/" + FIREBASE_PROJECT_ID;
const FIREBASE_CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let firebaseCertCache = { expiresAt: 0, keys: null };

function cacheMaxAge(cacheControl) {
  const match = String(cacheControl || "").match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}
async function firebaseCertificates() {
  if (firebaseCertCache.keys && Date.now() < firebaseCertCache.expiresAt) return firebaseCertCache.keys;
  const response = await fetch(FIREBASE_CERT_URL);
  if (!response.ok) throw new Error("Firebase public keys unavailable");
  const keys = await response.json();
  const maxAge = cacheMaxAge(response.headers.get("cache-control"));
  firebaseCertCache = { keys, expiresAt: Date.now() + Math.max(60, maxAge - 30) * 1000 };
  return keys;
}
async function firebaseVerificationKey(header) {
  if (!header?.kid || header.alg !== "RS256") throw new Error("Unsupported Firebase token");
  let certs = await firebaseCertificates();
  let cert = certs[header.kid];
  if (!cert) {
    firebaseCertCache = { expiresAt: 0, keys: null };
    certs = await firebaseCertificates();
    cert = certs[header.kid];
  }
  if (!cert) throw new Error("Unknown Firebase signing key");
  return importX509(cert, "RS256");
}
async function verifyFirebaseIdToken(token) {
  const now = Math.floor(Date.now() / 1000);
  const result = await jwtVerify(String(token || ""), firebaseVerificationKey, {
    algorithms: ["RS256"],
    audience: FIREBASE_PROJECT_ID,
    issuer: FIREBASE_ISSUER,
    clockTolerance: 300
  });
  const payload = result.payload;
  if (typeof payload.sub !== "string" || payload.sub.length < 1 || payload.sub.length > 128) throw new Error("Invalid Firebase subject");
  if (typeof payload.exp !== "number" || payload.exp <= now - 300) throw new Error("Expired Firebase token");
  if (typeof payload.iat !== "number" || payload.iat > now + 300) throw new Error("Future Firebase token");
  if (typeof payload.auth_time !== "number" || payload.auth_time > now + 300) throw new Error("Invalid Firebase auth time");
  return payload;
}
function bearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
function accountDisplayName(claims) {
  const fallback = String(claims.email || "Nexauren User").split("@")[0];
  return text(claims.name || fallback || "Nexauren User", 80).trim().slice(0, 80) || "Nexauren User";
}
async function ensureNexaurenAccount(env, claims, markLogin = false) {
  const uid = String(claims.sub);
  const email = normalizeEmail(claims.email || "");
  const displayName = accountDisplayName(claims);
  const photoUrl = text(claims.picture || "", 1000);
  const ts = nowIso();
  let profile;
  try {
    profile = await env.ACCOUNTS_DB.prepare("SELECT * FROM nexauren_accounts WHERE firebase_uid=? LIMIT 1").bind(uid).first();
  } catch {
    throw Object.assign(new Error("A tabela de contas Nexauren ainda não foi instalada. Execute database/accounts-upgrade.sql no D1 de contas Nexauren."), { code: "ACCOUNT_DB_NOT_READY" });
  }
  if (!profile) {
    // A conta pode ter sido criada anteriormente por outro fluxo com o mesmo email.
    // Nesse caso, associa-a ao UID Firebase atual em vez de provocar UNIQUE(email).
    const existingByEmail = email
      ? await env.ACCOUNTS_DB.prepare("SELECT * FROM nexauren_accounts WHERE email=? LIMIT 1").bind(email).first()
      : null;
    if (existingByEmail) {
      if (existingByEmail.firebase_uid !== uid) {
        throw Object.assign(new Error("Esta conta Nexauren já está associada a outra identidade Firebase."), { code: "ACCOUNT_IDENTITY_MISMATCH" });
      }
      if (existingByEmail.status !== "active") {
        throw Object.assign(new Error("A sua conta Nexauren está suspensa."), { code: "ACCOUNT_SUSPENDED" });
      }
      throw Object.assign(new Error("A conta Nexauren existe, mas a identidade Firebase não pôde ser associada com segurança."), { code: "ACCOUNT_LINK_REQUIRED" });
    }
    const id = crypto.randomUUID();
    await env.ACCOUNTS_DB.prepare(
      "INSERT INTO nexauren_accounts (id,firebase_uid,email,display_name,photo_url,status,email_verified,last_login_at,last_seen_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(id, uid, email, displayName, photoUrl, "active", claims.email_verified ? 1 : 0, markLogin ? ts : null, ts, ts, ts).run();
    await env.ACCOUNTS_DB.prepare(
      "INSERT INTO nexauren_account_preferences (account_id,language,theme,timezone,marketing_emails,created_at,updated_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(id, "pt", "system", "Africa/Maputo", 0, ts, ts, ts).run();
    return { id, firebase_uid: uid, email, display_name: displayName, photo_url: photoUrl, status: "active", email_verified: !!claims.email_verified, created: true };
  }
  if (profile.status !== "active") {
    throw Object.assign(new Error("A sua conta Nexauren está suspensa."), { code: "ACCOUNT_SUSPENDED" });
  }
  await env.ACCOUNTS_DB.prepare(
    "UPDATE nexauren_accounts SET email=?,display_name=?,photo_url=?,email_verified=?,last_login_at=CASE WHEN ?=1 THEN ? ELSE last_login_at END,last_seen_at=?,updated_at=? WHERE id=?"
  ).bind(email, displayName, photoUrl, claims.email_verified ? 1 : 0, markLogin ? 1 : 0, ts, ts, ts, profile.id).run();
  return { id: profile.id, firebase_uid: uid, email, display_name: displayName, photo_url: photoUrl, status: profile.status, email_verified: !!claims.email_verified, created: false };
}
async function firebaseAccountAuth(env, request, markLogin = false) {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const claims = await verifyFirebaseIdToken(token);
    return { claims, account: await ensureNexaurenAccount(env, claims, markLogin) };
  } catch (error) {
    if (error?.code === "ACCOUNT_DB_NOT_READY" || error?.code === "ACCOUNT_SUSPENDED") throw error;
    const reasonCode=String(error?.code||error?.name||"FIREBASE_VERIFY_ERROR");
    const reason=String(error?.message||"Falha ao validar o token Firebase").replace(/[\r\n]+/g," ").slice(0,240);
    console.error("Firebase token verification failed", {code:reasonCode,message:reason});
    throw Object.assign(new Error("Sessão inválida ou expirada."), {
      code: "FIREBASE_TOKEN_INVALID",
      reason_code: reasonCode,
      reason
    });
  }
}

const FIREBASE_AUTH_ORIGIN = "https://nexauren-story.firebaseapp.com";

function rewriteAuthResponseHeaders(headers) {
  const out = new Headers(headers);
  const location = out.get("location");
  if (location) {
    out.set("location", location.replaceAll(FIREBASE_AUTH_ORIGIN, "https://nexaurenstory.com"));
  }
  return out;
}

async function firebaseAuthProxy(request) {
  const incoming = new URL(request.url);
  const upstream = new URL(incoming.pathname + incoming.search, FIREBASE_AUTH_ORIGIN);
  const headers = new Headers();
  for (const name of ["accept","accept-language","cache-control","content-type","user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.delete("authorization");
  headers.delete("cookie");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("x-forwarded-for");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-proto");

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const response = await fetch(new Request(upstream, init));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: rewriteAuthResponseHeaders(response.headers)
  });
}

function sameOrigin(request){const o=request.headers.get("Origin");if(!o)return true;try{return o===new URL(request.url).origin;}catch{return false;}}
async function guard(env,request,roles=null){
  if(!sameOrigin(request))return {error:fail("Origem não autorizada.",403,"ORIGIN")};
  const a=await auth(env,request);if(!a)return {error:fail("Sessão expirada ou não autenticada.",401,"UNAUTHENTICATED")};
  if(roles===true)roles=["owner","admin"];
  if(Array.isArray(roles)&&!roles.includes(a.role))return {error:fail("Permissão insuficiente.",403,"FORBIDDEN")};
  return {auth:a};
}
async function bodyJson(request){try{return await request.json();}catch{return null;}}
async function cleanup(env){const t=nowIso();await env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(t).run();await env.DB.prepare("DELETE FROM login_attempts WHERE created_at<?").bind(new Date(Date.now()-2592000000).toISOString()).run();}
async function dbCheck(env){
  const required={
    users:["id","email","password_hash","display_name","role","status","email_verified","last_login_at","created_at","updated_at"],
    sessions:["id","user_id","token_hash","expires_at","created_at","last_seen_at","ip_hash","user_agent"],
    login_attempts:["id","identifier","success","created_at"],
    media:["id","imagekit_file_id","url","thumbnail_url","filename","mime_type","size_bytes","width","height","alt_text","caption","uploaded_by","created_at"],
    settings:["key","value","type","updated_at"],
    audit_logs:["id","user_id","action","entity_type","entity_id","metadata","ip_hash","created_at"],
    notifications:["id","user_id","type","title","message","link","read_at","created_at"],
    tool_usage:["tool_id","bucket","visitor_hash","created_at"]
  };
  try{
    const tables=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const existing=new Set((tables.results||[]).map(x=>x.name));
    const missingTables=[],missingColumns=[];
    for(const [table,cols] of Object.entries(required)){
      if(!existing.has(table)){missingTables.push(table);continue}
      const info=await env.DB.prepare("PRAGMA table_info("+table+")").all();
      const have=new Set((info.results||[]).map(x=>x.name));
      for(const col of cols)if(!have.has(col))missingColumns.push(table+"."+col);
    }
    return {ready:missingTables.length===0&&missingColumns.length===0,missingTables,missingColumns};
  }catch(e){return {ready:false,missingTables:[],missingColumns:[],error:String(e?.message||e)}}
}
async function dbReady(env){return (await dbCheck(env)).ready;}


async function verifyImageKitFile(env,fileId,fileUrl){
  if(!fileId||!fileUrl)return false;
  try{
    const u=new URL(fileUrl);
    if(u.protocol!=="https:" || isSvgUrl(u.toString()))return false;
    const endpoint=String(env.IMAGEKIT_URL_ENDPOINT||"").trim();
    if(endpoint){
      const e=new URL(endpoint);
      if(u.origin!==e.origin)return false;
    }else if(!/(^|\.)ik\.imagekit\.io$/i.test(u.hostname)){
      return false;
    }
    const response=await fetch(fileUrl,{method:"HEAD"});
    return response.ok;
  }catch{
    return false;
  }
}

async function uploadAuth(env,request){
  const g=await guard(env,request);if(g.error)return g.error;if(!env.IMAGEKIT_PRIVATE_KEY||!env.IMAGEKIT_PUBLIC_KEY)return fail("ImageKit não está configurado no Worker.",503,"IMAGEKIT_NOT_CONFIGURED");
  const expire=Math.floor(Date.now()/1000)+600,token=crypto.randomUUID(),signature=await hmacSha1(token+expire,env.IMAGEKIT_PRIVATE_KEY);
  return json({ok:true,token,expire,signature,publicKey:env.IMAGEKIT_PUBLIC_KEY,urlEndpoint:env.IMAGEKIT_URL_ENDPOINT||""});
}

function addHeadTag(html, test, tag){
  return test.test(html) ? html : html.replace(/<\/head>/i, tag+"\n</head>");
}

function globalFooterHtml(path){
  const toolContext=String(path||"").startsWith("/tool/categories/")?"?kind=problem&from="+encodeURIComponent(path):"";
  const supportProblem="/support/"+toolContext;
  return '<footer class="nx-global-footer"><div class="nx-footer-shell"><div class="nx-footer-brand"><a class="nx-footer-logo" href="/"><img src="/assets/favicon-nexauren.png?v=20260925-brand" alt="" width="42" height="42"><span><strong>Nexauren</strong><small>Story</small></span></a><p class="nx-footer-copy">Content, tools, and new experiences in one digital ecosystem.</p><a class="nx-footer-email" href="mailto:nexaurenx@gmail.com">nexaurenx@gmail.com</a></div><div class="nx-footer-column"><strong>Explore</strong><a href="/tool/">Tools</a><a href="/tool/destaques/">Featured</a><a href="/tool/populares/">Popular</a><a href="/account">Account</a></div><div class="nx-footer-column"><strong>Support</strong><a href="/support/">Support Center</a><a href="'+supportProblem+'">Report a problem</a><a href="/feedback/">Suggestions & feedback</a><a href="mailto:nexaurenx@gmail.com">Email support</a></div><div class="nx-footer-column"><strong>Legal</strong><a href="/legal/privacidade/">Privacy</a><a href="/legal/termos/">Terms</a><a href="/legal/cookies/">Cookies</a></div></div><div class="nx-footer-bottom"><div class="nx-footer-bottom-inner"><span>© <span id="year"></span> Nexauren Story</span><span>Built to evolve.</span></div></div></footer>';
}
function replaceGlobalFooter(html,path){
  const footer=globalFooterHtml(path);
  if(/<footer\b[\s\S]*?<\/footer>/i.test(html))return html.replace(/<footer\b[\s\S]*?<\/footer>/i,footer);
  return html.replace(/<\/body>/i,footer+'\n</body>');
}

function decoratePublicHtmlResponse(request,response){
  const type=response.headers.get("content-type")||"";
  if(!response.ok||!type.toLowerCase().includes("text/html"))return response;
  const url=new URL(request.url);
  const path=url.pathname;
  const lowerPath=path.toLowerCase();if(lowerPath==="/admin"||lowerPath.startsWith("/admin/"))return response;
  const requestedLang=url.searchParams.get("lang")==="pt"?"pt":"en";
  return response.text().then(html=>{
    html=html.replaceAll("/assets/nexauren-language.js?v=20260928-6","/assets/nexauren-language.js?v=20260928-7");
    html=html.replace(/<body(\s[^>]*)?>/i,(match,attrs="")=>{if(/\bclass\s*=/.test(attrs)){return match.replace(/class\s*=\s*(['"])(.*?)\1/i,(m,q,v)=>/\bnx-page\b/.test(v)?m:'class='+q+'nx-page '+v+q);}return '<body class="nx-page"'+attrs+'>';});
    html=html.replace(/<html\b([^>]*)>/i,(match,attrs="")=>{if(/\blang\s*=/.test(attrs))return match.replace(/lang\s*=\s*(['"])[^'"]*\1/i,'lang="'+requestedLang+'"');return '<html lang="'+requestedLang+'"'+attrs+'>';});
    const titleMatch=html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
    const descMatch=html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
    let title=(titleMatch?.[1]||"Nexauren Story").replace(/<[^>]*>/g,"").trim().slice(0,180)||"Nexauren Story";
    let desc=(descMatch?.[1]||"Nexauren Story — conteúdo, ferramentas e experiências do ecossistema Nexauren.").trim().slice(0,300);
    if(requestedLang==="en"){
      const metaMap={"/tool/":["Tools | Nexauren Story","Online tools from Nexauren Story, organized by category."],"/account":["Account — Nexauren Story","Your Nexauren account for tools and experiences across the ecosystem."],"/legal/privacidade/":["Privacy Policy — Nexauren Story","Nexauren Story Privacy Policy."],"/legal/termos/":["Terms of Use — Nexauren Story","Terms of Use for Nexauren Story."],"/legal/cookies/":["Cookie Policy — Nexauren Story","Information about cookies and similar technologies on Nexauren Story."]};
      const known=metaMap[path];if(known){title=known[0];desc=known[1];}
    }
    const existingCanonical=(html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)||[])[1];
    const canonicalUrl=new URL(existingCanonical||path||"/",url.origin);if(requestedLang==="en")canonicalUrl.searchParams.set("lang","en");else canonicalUrl.searchParams.delete("lang");
    const canonical=canonicalUrl.href;
    const robots=(html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i)||[])[1]||"index,follow,max-image-preview:large";
    const criticalStyle='<style id="nexauren-mobile-critical">html,body{width:100%;max-width:none;min-width:0;margin:0}body{overflow-x:hidden}body.nx-page,body.nx-page main,body.nx-page header,body.nx-page footer{max-width:100vw}body.nx-page .home-main,body.nx-page .tool-header,body.nx-page .site-header,body.nx-page .tool-footer,body.nx-page .site-footer{width:100%}@media(max-width:760px){body.nx-page .wrap,body.nx-page .tool-wrap{width:calc(100% - 28px)!important;max-width:none!important;min-width:0!important;margin-inline:auto!important}body.nx-page .site-header .wrap,body.nx-page .tool-header .tool-wrap{width:100%!important;max-width:none!important;padding-inline:14px!important}body.nx-page .home-grid,body.nx-page .tool-grid{width:100%!important;max-width:100%!important}body.nx-page .home-card,body.nx-page .tool-card{width:100%!important;max-width:100%!important}body.nx-page .home-actions .primary{color:#fff!important;text-decoration:none!important}body.nx-page a{text-decoration:none}}</style>';    html=html.replace(/<\/head>/i,criticalStyle+"\n</head>");
    const tags=[
      ['theme',/<meta[^>]+name=["']theme-color["']/i, '<meta name="theme-color" content="#0b1020">'],
      ['icon',/<link[^>]+rel=["']icon["']/i,'<link rel="icon" type="image/png" href="/assets/favicon-nexauren.png?v=20260925-brand"><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-nexauren.png?v=20260925-brand">'],
      ['apple',/<link[^>]+rel=["']apple-touch-icon["']/i,'<link rel="apple-touch-icon" href="/nexauren-story-apple-touch-icon.png?v=20260922-5">'],
      ['manifest',/<link[^>]+rel=["']manifest["']/i,'<link rel="manifest" href="/manifest.json">'],
      ['style',/<link[^>]+href=["']\/assets\/site\.css/i,'<link rel="stylesheet" href="/assets/site.css?v=20260922-4">'],
      ['publicstyle',/<link[^>]+href=["']\/assets\/public-ui\.css/i,'<link rel="stylesheet" href="/assets/public-ui.css?v=20260922-8">'],
      ['ogsite',/<meta[^>]+property=["']og:site_name["']/i,'<meta property="og:site_name" content="Nexauren Story">'],
      ['ogtitle',/<meta[^>]+property=["']og:title["']/i,'<meta property="og:title" content="'+esc(title)+'">'],
      ['ogdesc',/<meta[^>]+property=["']og:description["']/i,'<meta property="og:description" content="'+esc(desc)+'">'],
      ['ogtype',/<meta[^>]+property=["']og:type["']/i,'<meta property="og:type" content="website">'],
      ['ogurl',/<meta[^>]+property=["']og:url["']/i,'<meta property="og:url" content="'+esc(canonical)+'">'],
      ['ogimage',/<meta[^>]+property=["']og:image["']/i,'<meta property="og:image" content="'+DEFAULT_SOCIAL_IMAGE+'">'],
      ['ogsecure',/<meta[^>]+property=["']og:image:secure_url["']/i,'<meta property="og:image:secure_url" content="'+DEFAULT_SOCIAL_IMAGE+'">'],
      ['ogw',/<meta[^>]+property=["']og:image:width["']/i,'<meta property="og:image:width" content="1200">'],
      ['ogh',/<meta[^>]+property=["']og:image:height["']/i,'<meta property="og:image:height" content="630">'],
      ['ogmime',/<meta[^>]+property=["']og:image:type["']/i,'<meta property="og:image:type" content="image/png">'],
      ['ogalt',/<meta[^>]+property=["']og:image:alt["']/i,'<meta property="og:image:alt" content="'+esc(title)+'">'],
      ['oglocale',/<meta[^>]+property=["']og:locale["']/i,'<meta property="og:locale" content="pt_PT">'],
      ['twcard',/<meta[^>]+name=["']twitter:card["']/i,'<meta name="twitter:card" content="summary_large_image">'],
      ['twtitle',/<meta[^>]+name=["']twitter:title["']/i,'<meta name="twitter:title" content="'+esc(title)+'">'],
      ['twdesc',/<meta[^>]+name=["']twitter:description["']/i,'<meta name="twitter:description" content="'+esc(desc)+'">'],
      ['twimage',/<meta[^>]+name=["']twitter:image["']/i,'<meta name="twitter:image" content="'+DEFAULT_SOCIAL_IMAGE+'">'],
      ['twalt',/<meta[^>]+name=["']twitter:image:alt["']/i,'<meta name="twitter:image:alt" content="'+esc(title)+'">'],
      ['robots',/<meta[^>]+name=["']robots["']/i,'<meta name="robots" content="'+esc(robots)+'">'],
      ['canonical',/<link[^>]+rel=["']canonical["']/i,'<link rel="canonical" href="'+esc(canonical)+'">'],
      ['altpt',/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']pt["']/i,'<link rel="alternate" hreflang="pt" href="'+esc(new URL(path||"/",url.origin).href)+'">'],
      ['alten',/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']en["']/i,'<link rel="alternate" hreflang="en" href="'+esc(new URL((path||"/")+"?lang=en",url.origin).href)+'">'],
      ['altd',/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']x-default["']/i,'<link rel="alternate" hreflang="x-default" href="'+esc(new URL(path||"/",url.origin).href)+'">']
    ];
    let out=html;
    for(const [,probe,tag] of tags)out=addHeadTag(out,probe,tag);
    if (path.startsWith("/tool/categories/imagem/") && path !== "/tool/categories/imagem/" && !path.startsWith("/tool/categories/imagem/image-compressor/")) {
      const imageContrast = '<style id="nexauren-image-tool-contrast">.forge,.forge *,.forge h1,.forge h2,.forge h3,.forge p,.forge span,.forge small,.forge label,.forge output,.forge a,.fs,.fs *,.fs h1,.fs h2,.fs h3,.fs p,.fs span,.fs small,.fs label,.fs output,.fs a,.crop,.crop *,.crop h1,.crop h2,.crop h3,.crop p,.crop span,.crop small,.crop label,.crop output,.crop a,.privacy,.privacy *,.privacy h1,.privacy h2,.privacy h3,.privacy p,.privacy span,.privacy small,.privacy label,.privacy output,.privacy a,.atlas,.atlas *,.atlas h1,.atlas h2,.atlas h3,.atlas p,.atlas span,.atlas small,.atlas label,.atlas output,.atlas a,.resize-studio,.resize-studio *,.wm,.wm *,.social,.social *{color:inherit}.forge h1,.forge h2,.forge h3,.forge p,.forge b,.forge strong,.forge span,.forge small,.forge label,.forge output,.forge a,.fs h1,.fs h2,.fs h3,.fs p,.fs b,.fs strong,.fs span,.fs small,.fs label,.fs output,.fs a,.crop h1,.crop h2,.crop h3,.crop p,.crop b,.crop strong,.crop span,.crop small,.crop label,.crop output,.crop a,.privacy h1,.privacy h2,.privacy h3,.privacy p,.privacy b,.privacy strong,.privacy span,.privacy small,.privacy label,.privacy output,.privacy a,.atlas h1,.atlas h2,.atlas h3,.atlas p,.atlas b,.atlas strong,.atlas span,.atlas small,.atlas label,.atlas output,.atlas a,.resize-studio h1,.resize-studio h2,.resize-studio h3,.resize-studio p,.resize-studio span,.resize-studio small,.resize-studio label,.resize-studio output,.resize-studio a,.wm h1,.wm h2,.wm h3,.wm p,.wm span,.wm small,.wm label,.wm output,.wm a,.social h1,.social h2,.social h3,.social p,.social span,.social small,.social label,.social output,.social a{color:#eef3f8!important}.forge .forge-lead,.forge .forge-back,.forge .forge-field label,.forge .forge-status,.forge .forge-item small,.forge .forge-plan small,.forge .forge-side h2,.forge .forge-hint,.forge .forge-empty,.forge .forge-footer,.forge .forge-result-info small,.fs .fs-lead,.fs .fs-back,.fs .fs-field label,.fs .fs-status,.fs .fs-side h2,.fs .fs-side p,.crop .lead,.crop .back,.crop .field label,.crop .status,.crop .preview-title,.crop .metric span,.crop .tips,.privacy .lead,.privacy .back,.privacy .field label,.privacy .status,.privacy .note,.privacy .metric span,.atlas .lead,.atlas .back,.atlas .field label,.atlas .status,.atlas .code,.wm .lead,.wm .back,.wm .field label,.wm .status,.wm .result-title,.social .lead,.social .back,.social .field label,.social .status,.social .metric span{color:#93a0b3!important}.forge input,.forge select,.forge textarea,.fs input,.fs select,.fs textarea,.crop input,.crop select,.crop textarea,.privacy input,.privacy select,.privacy textarea,.atlas input,.atlas select,.atlas textarea,.resize-studio input,.resize-studio select,.resize-studio textarea,.wm input,.wm select,.wm textarea,.social input,.social select,.social textarea{color:#eef3f8!important;background:#111923!important;border-color:#2b3a4c!important}.forge select option,.fs select option,.crop select option,.privacy select option,.atlas select option,.resize-studio select option,.wm select option,.social select option{color:#eef3f8!important;background:#111923!important}.forge input::placeholder,.fs input::placeholder,.crop input::placeholder,.privacy input::placeholder,.atlas input::placeholder,.resize-studio input::placeholder,.wm input::placeholder,.social input::placeholder{color:#7f8da1!important;opacity:1!important}.forge .forge-btn,.fs .fs-btn,.crop .btn,.privacy .btn,.atlas .btn,.resize-studio .btn,.wm .btn,.social .btn{color:#eef3f8!important}.forge .forge-btn.primary,.fs .fs-btn.primary,.crop .btn.primary,.privacy .btn.primary,.atlas .btn.primary,.wm .btn.primary,.social .btn.primary{color:#061217!important}</style>';
      out = out.replace(/<\/head>/i, imageContrast + "\n</head>");
    }
    if(!/<meta[^>]+name=["']description["']/i.test(out))out=addHeadTag(out,/__never_description__/,'<meta name="description" content="'+esc(desc)+'">');
    if(!/<script[^>]+src=["']\/assets\/site\.js/i.test(out))out=out.replace(/<\/body>/i,'<script src="/assets/site.js?v=20260922-1" defer></script>\n</body>');
    if(!/<script[^>]+src=["']\/assets\/i18n\.js/i.test(out))out=out.replace(/<\/body>/i,'<script src="/assets/i18n.js?v=20260925-static-17" defer></script>\n</body>');
    if(!/<script[^>]+src=["']\/assets\/public-ui\.js/i.test(out))out=out.replace(/<\/body>/i,'<script src="/assets/public-ui.js?v=20260928-support-1" defer></script>\n</body>');
    if(!/<script[^>]+id=["']nexauren-public-structured-data["']/i.test(out)){
      const structured={ "@context":"https://schema.org", "@type":"WebPage", "name":title, "url":canonical, "description":desc, "isPartOf":{"@type":"WebSite","name":"Nexauren Story","url":"https://nexaurenstory.com/"} };
      out=addHeadTag(out,/__never_structured__/,'<script id="nexauren-public-structured-data" type="application/ld+json">'+safeJsonLd(structured)+'</script>');
    }
    if(/<body\b/i.test(out)&&!/class=["'][^"']*\bnx-page\b/i.test(out))out=out.replace(/<body\b([^>]*)>/i,(m,a)=>a?'<body class="nx-page"'+a+'>':'<body class="nx-page">');
    out=replaceGlobalFooter(out,path);
    const headers=new Headers(response.headers);
    headers.delete("content-length");
    return new Response(out,{status:response.status,statusText:response.statusText,headers});
  });
}

async function sitemapPages(env){
  const pages=[],seen=new Set();
  const add=raw=>{if(typeof raw!=="string")return;let path=raw.trim();if(!path||!path.startsWith("/")||path.startsWith("//")||path.includes("?")||path.includes("#"))return;path=path.replace(/\/+/g,"/");if(path!=="/")path=path.replace(/\/+$/,"")||"/";if(/^\/(admin|account|api|assets|admin-assets|data)(\/|$)/.test(path)||path.startsWith("/tool/frontend/templates/"))return;if(!seen.has(path)){seen.add(path);pages.push(path)}};
  try{const r=await env.ASSETS.fetch(new Request("https://nexaurenstory.com/data/public-urls.json"));if(r.ok){const m=await r.json();for(const p of (Array.isArray(m.urls)?m.urls:[]))add(p)}}catch{}
  if(!seen.has("/"))add("/");
  const out=pages.map(p=>"  <url>\n    <loc>"+xml("https://nexaurenstory.com"+p)+"</loc>\n  </url>").join("\n");
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+out+"\n</urlset>",{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public,max-age=900"}});
}
async function sitemapIndex(){const body='<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://nexaurenstory.com/sitemap-pages.xml</loc></sitemap>\n</sitemapindex>';return new Response(body,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public,max-age=900"}})}
async function robots(){return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /account\nSitemap: https://nexaurenstory.com/sitemap.xml\n",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public,max-age=3600"}})}
function seoHead(html,o){
  const set=(re,val)=>{html=html.replace(re,val);};
  html=html.replace(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*type=["']image\/svg\+xml["'][^>]*>/gi,"");
  html=html.replace(/<link[^>]+href=["'][^"']*nexauren-story-favicon\.svg(?:\?[^"']*)?["'][^>]*>/gi,"");
  if(!/<link[^>]+rel=["']icon["'][^>]+href=["'][^"']*favicon-nexauren\.png/i.test(html)){
    html=html.replace(/<\/head>/i,'<link rel="icon" type="image/png" href="/assets/favicon-nexauren.png?v=20260925-brand"><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-nexauren.png?v=20260925-brand">\n</head>');
  }
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
  set(/<meta property="og:image:secure_url" content="[^"]*">/i,'<meta property="og:image:secure_url" content="'+esc(o.image)+'">');
  set(/<meta property="og:image:type" content="[^"]*">/i,'<meta property="og:image:type" content="'+esc(o.imageType||imageMime(o.image))+'">');
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
function normalizeToolRegistry(raw){
  const categories=Array.isArray(raw?.categories)?raw.categories.map((c,i)=>({
    id:slugify(c?.id||c?.name||("categoria-"+(i+1))),
    name:text(c?.name||"Categoria",100).trim(),
    name_en:text(c?.name_en||c?.nameEn||"",140).trim(),
    description:text(c?.description||"",500).trim(),
    description_en:text(c?.description_en||c?.descriptionEn||"",500).trim(),
    icon:text(c?.icon||"✦",20).trim(),
    sortOrder:Number.isFinite(Number(c?.sortOrder))?Number(c.sortOrder):(i+1)*10,
    path:text(c?.path||"",500).trim()||("/tool/categories/"+slugify(c?.id||c?.name||("categoria-"+(i+1)))+"/"),
    showWhenEmpty:c?.showWhenEmpty===true,
    subcategories:Array.isArray(c?.subcategories)?c.subcategories.map((s,j)=>({
      id:slugify(s?.id||s?.name||("subcategoria-"+(j+1))),
      name:text(s?.name||"Subcategoria",100).trim(),
      name_en:text(s?.name_en||s?.nameEn||"",140).trim(),
      description:text(s?.description||"",300).trim(),
      description_en:text(s?.description_en||s?.descriptionEn||"",300).trim()
    })).filter(s=>s.id&&s.name):[]
  })).filter(c=>c.id&&c.name):[];
  const categoryIds=new Set(categories.map(c=>c.id));
  const tools=Array.isArray(raw?.tools)?raw.tools.map((t,i)=>{
    const id=slugify(t?.id||t?.name||("ferramenta-"+(i+1)));
    const category=categoryIds.has(t?.category)?t.category:(categories[0]?.id||"");
    return {
      id,name:text(t?.name||"Ferramenta",140).trim(),
      name_en:text(t?.name_en||t?.nameEn||"",140).trim(),
      description:text(t?.description||"",600).trim(),
      description_en:text(t?.description_en||t?.descriptionEn||"",600).trim(),
      category,
      group:text(t?.group||"",100).trim(),
      icon:text(t?.icon||"✦",20).trim(),
      version:text(t?.version||"1.0.0",30).trim(),
      status:["active","disabled","draft"].includes(t?.status)?t.status:null,
      access:["public","account","premium","paid"].includes(t?.access)?t.access:null,
      price:t?.price!=null?text(t.price,20).trim():"",
      currency:text(t?.currency||"USD",8).trim().toUpperCase(),
      path:text(t?.path||"",700).trim(),
      tags:Array.isArray(t?.tags)?t.tags.map(x=>text(x,50).trim()).filter(Boolean).slice(0,12):[],
      tags_en:Array.isArray(t?.tags_en)?t.tags_en.map(x=>text(x,50).trim()).filter(Boolean).slice(0,12):[],
      featured:!!t?.featured,
      popular:!!t?.popular,
      sortOrder:Number.isFinite(Number(t?.sortOrder))?Number(t.sortOrder):(i+1)*10,
      freeBatchLimit:Number.isFinite(Number(t?.freeBatchLimit))?Math.max(1,Math.min(1000,Number(t.freeBatchLimit))):null,
      proBatchLimit:t?.proBatchLimit==null?null:(Number.isFinite(Number(t.proBatchLimit))?Math.max(1,Math.min(10000,Number(t.proBatchLimit))):null)
    };
  }).filter(t=>t.id&&t.name&&t.path&&t.status&&t.access):[];
  return {version:Number(raw?.version||1)||1,site:"Nexauren Story",basePath:"/tool/",registry:{updatedAt:nowIso(),source:"nexauren-admin"},categories,tools};
}
async function loadToolRegistry(env,request){
  let dbRegistry=null;
  try{
    const row=await env.DB.prepare("SELECT value FROM settings WHERE key='tool_registry' LIMIT 1").first();
    if(row?.value) dbRegistry=normalizeToolRegistry(JSON.parse(String(row.value)));
  }catch{}
  let assetRegistry=null;
  try{
    const r=await env.ASSETS.fetch(new Request(new URL("/tool/data/data.json",request.url)));
    if(r.ok) assetRegistry=normalizeToolRegistry(await r.json());
  }catch{}
  // O catálogo em ficheiro é a fonte base. Um registro D1 vazio ou incompleto
  // não pode fazer a página pública aparecer como "0 ferramentas".
  if(!dbRegistry)return assetRegistry||normalizeToolRegistry({categories:[],tools:[]});
  const dbActiveTools=dbRegistry.tools.filter(t=>t.status==="active");
  const assetActiveTools=assetRegistry?.tools?.filter(t=>t.status==="active")||[];
  if(!dbActiveTools.length && assetActiveTools.length)return assetRegistry;
  if(!assetRegistry)return dbRegistry;
  const assetToolMap=new Map((assetRegistry?.tools||[]).map(tool=>[tool.id,tool]));
  const mergedTools=dbRegistry.tools.map(tool=>{
    const asset=assetToolMap.get(tool.id);
    return asset ? {...tool,name_en:tool.name_en||asset.name_en||"",description_en:tool.description_en||asset.description_en||"",tags_en:tool.tags_en?.length?tool.tags_en:(asset.tags_en||[])} : tool;
  });
  for(const tool of assetActiveTools){
    if(!mergedTools.some(existing=>existing.id===tool.id))mergedTools.push(tool);
  }
  const assetCategoryMap=new Map((assetRegistry?.categories||[]).map(category=>[category.id,category]));
  const mergedCategories=dbRegistry.categories.map(category=>{
    const asset=assetCategoryMap.get(category.id);
    return asset ? {...category,name_en:category.name_en||asset.name_en||"",description_en:category.description_en||asset.description_en||""} : category;
  });
  for(const category of assetRegistry.categories||[]){
    if(!mergedCategories.some(existing=>existing.id===category.id))mergedCategories.push(category);
  }
  return {...dbRegistry,tools:mergedTools,categories:mergedCategories};
}
async function toolRegistryWithUsage(env,request){
  const registry=await loadToolRegistry(env,request);
  try{
    const usage=await env.DB.prepare("SELECT tool_id,COUNT(*) count FROM tool_usage WHERE bucket>=? GROUP BY tool_id").bind(new Date(Date.now()-30*86400000).toISOString().slice(0,10)).all();
    const counts=new Map((usage.results||[]).map(x=>[x.tool_id,Number(x.count||0)]));
    registry.tools=registry.tools.map(t=>({...t,usageCount:counts.get(t.id)||0}));
  }catch{}
  return registry;
}
async function saveToolRegistry(env,actor,raw){
  const registry=normalizeToolRegistry(raw),seen=new Set();
  for(const t of registry.tools){
    if(seen.has(t.id))return fail("Existem IDs de ferramentas duplicados.",422,"TOOL_REGISTRY_INVALID");
    seen.add(t.id);
    try{
      const u=new URL(t.path,"https://nexaurenstory.com");
      if(u.origin!=="https://nexaurenstory.com"||!u.pathname.startsWith("/tool/categories/")||u.search||u.hash)throw new Error("scope");
    }catch{return fail("A ferramenta "+t.name+" precisa apontar para um caminho local /tool/categories/.",422,"TOOL_PATH_INVALID");}
  }
  registry.registry.updatedAt=nowIso();
  const serialized=JSON.stringify(registry);
  if(serialized.length>450000)return fail("O catálogo de ferramentas é demasiado grande.",413,"TOOL_REGISTRY_TOO_LARGE");
  await env.DB.prepare("INSERT INTO settings (key,value,type,updated_at) VALUES ('tool_registry',?,'json',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,type='json',updated_at=excluded.updated_at").bind(serialized,nowIso()).run();
  await audit(env,actor.id,"tools.registry_updated","tools",null,{tools:registry.tools.length,categories:registry.categories.length});
  return json({ok:true,registry});
}
async function resolveActiveTool(env,request,rawId){
  const toolId=slugify(rawId||"");
  if(!toolId)throw Object.assign(new Error("Ferramenta não especificada."),{code:"TOOL_REQUIRED"});
  const registry=await loadToolRegistry(env,request);
  const tool=(registry?.tools||[]).find(t=>t.id===toolId&&t.status==="active");
  if(!tool)throw Object.assign(new Error("Ferramenta não encontrada."),{code:"TOOL_NOT_FOUND"});
  return tool;
}

async function toolEngagement(env,request,url){
  const rawIds=text(url.searchParams.get("tool_ids")||"",6000);
  let ids=rawIds.split(",").map(slugify).filter(Boolean).filter((id,i,a)=>a.indexOf(id)===i).slice(0,100);
  if(!ids.length){
    const registry=await loadToolRegistry(env,request);
    ids=(registry?.tools||[]).filter(t=>t.status==="active").map(t=>t.id).slice(0,100);
  }
  if(!ids.length)return json({ok:true,items:{}});
  const marks=ids.map(()=>"?").join(",");
  let reviews=[],favorites=[],mineReviews=[],mineFavorites=[];
  try{
    const r=await env.ACCOUNTS_DB.prepare("SELECT tool_id,COUNT(*) review_count,ROUND(AVG(rating),2) avg_rating,SUM(rating=5) r5,SUM(rating=4) r4,SUM(rating=3) r3,SUM(rating=2) r2,SUM(rating=1) r1 FROM nexauren_tool_reviews WHERE tool_id IN ("+marks+") GROUP BY tool_id").bind(...ids).all();
    reviews=r.results||[];
    const f=await env.ACCOUNTS_DB.prepare("SELECT tool_id,COUNT(*) favorite_count FROM nexauren_tool_favorites WHERE tool_id IN ("+marks+") GROUP BY tool_id").bind(...ids).all();
    favorites=f.results||[];
    const authHeader=request.headers.get("Authorization")||"";
    if(authHeader){
      try{
        const a=await firebaseAccountAuth(env,request,false);
        if(a){
          const mr=await env.ACCOUNTS_DB.prepare("SELECT tool_id,rating,body,display_mode,display_name,anonymous_name FROM nexauren_tool_reviews WHERE account_id=? AND tool_id IN ("+marks+")").bind(a.account.id,...ids).all();
          mineReviews=mr.results||[];
          const mf=await env.ACCOUNTS_DB.prepare("SELECT tool_id FROM nexauren_tool_favorites WHERE account_id=? AND tool_id IN ("+marks+")").bind(a.account.id,...ids).all();
          mineFavorites=mf.results||[];
        }
      }catch(error){
        if(error?.code==="ACCOUNT_DB_NOT_READY")throw error;
      }
    }
  }catch(error){
    if(error?.message?.includes("no such table")||error?.code==="ACCOUNT_DB_NOT_READY"){
      return fail("As avaliações ainda não foram instaladas na base de contas.",503,"TOOL_REVIEWS_DB_NOT_READY");
    }
    throw error;
  }
  const byReview=new Map(reviews.map(x=>[x.tool_id,x]));
  const byFavorite=new Map(favorites.map(x=>[x.tool_id,x]));
  const myReview=new Map(mineReviews.map(x=>[x.tool_id,x]));
  const myFav=new Set(mineFavorites.map(x=>x.tool_id));
  const items={};
  for(const id of ids){
    const r=byReview.get(id)||{};
    items[id]={
      tool_id:id,
      review_count:Number(r.review_count||0),
      avg_rating:Number(r.avg_rating||0),
      distribution:{5:Number(r.r5||0),4:Number(r.r4||0),3:Number(r.r3||0),2:Number(r.r2||0),1:Number(r.r1||0)},
      favorite_count:Number(byFavorite.get(id)?.favorite_count||0),
      my_favorite:myFav.has(id),
      my_review:myReview.get(id)||null
    };
  }
  return json({ok:true,items});
}

async function publicToolReviews(env,request,url){
  const toolId=slugify(url.searchParams.get("tool_id")||"");
  if(toolId)await resolveActiveTool(env,request,toolId);
  const limit=Math.min(50,Math.max(1,Number(url.searchParams.get("limit")||30)));
  const offset=Math.max(0,Number(url.searchParams.get("offset")||0));
  const where=toolId?" WHERE tool_id=? ":"";
  const bind=toolId?[toolId,limit,offset]:[limit,offset];
  try{
    const q=await env.ACCOUNTS_DB.prepare("SELECT id,tool_id,rating,body,display_mode,display_name,anonymous_name,created_at,updated_at FROM nexauren_tool_reviews"+where+" ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(...bind).all();
    const total=toolId
      ? await env.ACCOUNTS_DB.prepare("SELECT COUNT(*) n FROM nexauren_tool_reviews WHERE tool_id=?").bind(toolId).first()
      : await env.ACCOUNTS_DB.prepare("SELECT COUNT(*) n FROM nexauren_tool_reviews").first();
    return json({ok:true,reviews:q.results||[],total:Number(total?.n||0),limit,offset});
  }catch(error){
    return fail("As avaliações ainda não foram instaladas na base de contas.",503,"TOOL_REVIEWS_DB_NOT_READY");
  }
}

async function saveToolReview(env,request){
  if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
  const a=await firebaseAccountAuth(env,request,true);
  if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
  const d=(await bodyJson(request))||{};
  const tool=await resolveActiveTool(env,request,d.tool_id);
  const rating=Number(d.rating);
  if(!Number.isInteger(rating)||rating<1||rating>5)return fail("A avaliação deve ter entre 1 e 5 estrelas.",422,"TOOL_RATING_INVALID");
  const body=text(d.body||"",2000).trim();
  const mode=["profile","anonymous"].includes(String(d.display_mode||""))?String(d.display_mode):"profile";
  const anonymousName=text(d.anonymous_name||"",60).trim();
  if(mode==="anonymous"&&(anonymousName.length<2||anonymousName.length>40))return fail("Escolha um nome anónimo entre 2 e 40 caracteres.",422,"ANONYMOUS_NAME_INVALID");
  const displayName=text(a.account.display_name||a.account.email||"Utilizador Nexauren",80).trim()||"Utilizador Nexauren";
  const existing=await env.ACCOUNTS_DB.prepare("SELECT id,created_at FROM nexauren_tool_reviews WHERE tool_id=? AND account_id=? LIMIT 1").bind(tool.id,a.account.id).first();
  const ts=nowIso();
  if(existing){
    await env.ACCOUNTS_DB.prepare("UPDATE nexauren_tool_reviews SET rating=?,body=?,display_mode=?,display_name=?,anonymous_name=?,updated_at=? WHERE id=? AND account_id=?")
      .bind(rating,body,mode,displayName,mode==="anonymous"?anonymousName:"",ts,existing.id,a.account.id).run();
    return json({ok:true,created:false,review:{id:existing.id,tool_id:tool.id,rating,body,display_mode:mode,display_name:displayName,anonymous_name:mode==="anonymous"?anonymousName:"",created_at:existing.created_at,updated_at:ts}});
  }
  const id=crypto.randomUUID();
  await env.ACCOUNTS_DB.prepare("INSERT INTO nexauren_tool_reviews (id,tool_id,account_id,rating,body,display_mode,display_name,anonymous_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(id,tool.id,a.account.id,rating,body,mode,displayName,mode==="anonymous"?anonymousName:"",ts,ts).run();
  return json({ok:true,created:true,review:{id,tool_id:tool.id,rating,body,display_mode:mode,display_name:displayName,anonymous_name:mode==="anonymous"?anonymousName:"",created_at:ts,updated_at:ts}},201);
}

async function deleteToolReview(env,request,reviewId){
  if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
  const a=await firebaseAccountAuth(env,request,false);
  if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
  const row=await env.ACCOUNTS_DB.prepare("SELECT id FROM nexauren_tool_reviews WHERE id=? AND account_id=? LIMIT 1").bind(reviewId,a.account.id).first();
  if(!row)return fail("Avaliação não encontrada.",404,"NOT_FOUND");
  await env.ACCOUNTS_DB.prepare("DELETE FROM nexauren_tool_reviews WHERE id=? AND account_id=?").bind(reviewId,a.account.id).run();
  return json({ok:true});
}

async function toggleToolFavorite(env,request){
  if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
  const a=await firebaseAccountAuth(env,request,true);
  if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
  const d=(await bodyJson(request))||{},tool=await resolveActiveTool(env,request,d.tool_id);
  const favorite=d.favorite!==false;
  if(favorite){
    await env.ACCOUNTS_DB.prepare("INSERT OR IGNORE INTO nexauren_tool_favorites (id,tool_id,account_id,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),tool.id,a.account.id,nowIso()).run();
  }else{
    await env.ACCOUNTS_DB.prepare("DELETE FROM nexauren_tool_favorites WHERE tool_id=? AND account_id=?").bind(tool.id,a.account.id).run();
  }
  const count=await env.ACCOUNTS_DB.prepare("SELECT COUNT(*) n FROM nexauren_tool_favorites WHERE tool_id=?").bind(tool.id).first();
  return json({ok:true,favorite, favorite_count:Number(count?.n||0)});
}

async function adminUsers(env){
  const admins=await env.DB.prepare("SELECT id,email,display_name,role,status,email_verified,last_login_at,created_at,updated_at FROM users ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,display_name").all();
  let accounts=[];
  try{
    if(env.ACCOUNTS_DB){
      const r=await env.ACCOUNTS_DB.prepare("SELECT id,email,display_name,status,email_verified,last_login_at,last_seen_at,created_at,updated_at FROM nexauren_accounts ORDER BY created_at DESC LIMIT 1000").all();
      accounts=r.results||[];
    }
  }catch{}
  return {admins:admins.results||[],accounts};
}
async function adminStats(env,request){
  const [media,adminUsers,activeSessions,registry,toolViews]=await Promise.all([
    env.DB.prepare("SELECT COUNT(*) n FROM media").first(),
    env.DB.prepare("SELECT COUNT(*) n FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) n FROM sessions WHERE expires_at>?").bind(nowIso()).first(),
    loadToolRegistry(env,request),
    env.DB.prepare("SELECT COUNT(*) n FROM tool_usage WHERE bucket>=?").bind(new Date(Date.now()-30*86400000).toISOString().slice(0,10)).first()
  ]);
  let publicUsers=0;try{publicUsers=Number((await env.ACCOUNTS_DB.prepare("SELECT COUNT(*) n FROM nexauren_accounts").first())?.n||0)}catch{}
  const tools=Array.isArray(registry?.tools)?registry.tools:[];
  return {media:Number(media?.n||0),adminUsers:Number(adminUsers?.n||0),publicUsers,activeSessions:Number(activeSessions?.n||0),tools:tools.length,featuredTools:tools.filter(t=>t.featured).length,popularTools:tools.filter(t=>t.popular).length,toolViews30d:Number(toolViews?.n||0),topTools:(await toolRegistryWithUsage(env,request)).tools.sort((a,b)=>(b.usageCount||0)-(a.usageCount||0)).slice(0,8)};
}
const PAYPAL_PRODUCT_KEY = "paypal_pro_product_id";
const PAYPAL_PLAN_KEY = "paypal_pro_monthly_plan_id";
const PAYPAL_ENV_KEY = "paypal_environment";

function paypalEnvironment(env){
  const value=String(env.PAYPAL_ENV||"sandbox").trim().toLowerCase();
  return value==="live"||value==="production"||value==="prod" ? "live" : "sandbox";
}
function paypalBase(env){
  return paypalEnvironment(env)==="sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}
async function paypalAccessToken(env){
  const id=String(env.PAYPAL_CLIENT_ID||"").trim();
  const secret=String(env.PAYPAL_CLIENT_SECRET||"").trim();
  if(!id||!secret)throw Object.assign(new Error("PayPal não está configurado no servidor."),{code:"PAYPAL_NOT_CONFIGURED"});
  const authHeader=btoa(id+":"+secret);
  const response=await fetch(paypalBase(env)+"/v1/oauth2/token",{
    method:"POST",
    headers:{
      "Authorization":"Basic "+authHeader,
      "Content-Type":"application/x-www-form-urlencoded",
      "Accept":"application/json"
    },
    body:"grant_type=client_credentials"
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.access_token)throw Object.assign(new Error(data?.error_description||"Não foi possível autenticar no PayPal."),{code:"PAYPAL_AUTH_ERROR"});
  return data.access_token;
}
async function paypalRequest(env,path,options={}){
  const token=await paypalAccessToken(env);
  const headers=new Headers(options.headers||{});
  headers.set("Authorization","Bearer "+token);
  headers.set("Accept","application/json");
  if(options.body&&!headers.has("Content-Type"))headers.set("Content-Type","application/json");
  const response=await fetch(paypalBase(env)+path,{...options,headers});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Object.assign(new Error(data?.message||data?.details?.[0]?.description||"O PayPal recusou o pedido."),{code:"PAYPAL_API_ERROR",paypal:data,status:response.status});
  return data;
}
async function billingConfigGet(env,key){
  const row=await env.ACCOUNTS_DB.prepare("SELECT value FROM nexauren_billing_config WHERE key=? LIMIT 1").bind(key).first();
  return row?.value||null;
}
async function billingConfigSet(env,key,value){
  await env.ACCOUNTS_DB.prepare("INSERT INTO nexauren_billing_config (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,String(value),nowIso()).run();
}
async function paypalEnsureProPlan(env){
  const environment=paypalEnvironment(env);
  const storedEnvironment=String(await billingConfigGet(env,PAYPAL_ENV_KEY)||"").trim().toLowerCase();

  // A configuração antiga não guardava o ambiente. Como o padrão histórico era
  // Sandbox, ao mudar diretamente para Live descartamos os IDs antigos para que
  // o PayPal gere um novo Product/Plan no ambiente correto.
  if(
    (storedEnvironment && storedEnvironment!==environment) ||
    (!storedEnvironment && environment==="live")
  ){
    await env.ACCOUNTS_DB.prepare(
      "DELETE FROM nexauren_billing_config WHERE key IN (?,?)"
    ).bind(PAYPAL_PRODUCT_KEY,PAYPAL_PLAN_KEY).run();
  }

  let planId=await billingConfigGet(env,PAYPAL_PLAN_KEY);
  if(planId){
    await billingConfigSet(env,PAYPAL_ENV_KEY,environment);
    return planId;
  }

  let productId=await billingConfigGet(env,PAYPAL_PRODUCT_KEY);
  if(!productId){
    const product=await paypalRequest(env,"/v1/catalogs/products",{
      method:"POST",
      headers:{"PayPal-Request-Id":"nexauren-pro-product-"+environment+"-"+crypto.randomUUID()},
      body:JSON.stringify({
        name:"Nexauren Pro",
        description:"Acesso Pro às ferramentas e recursos premium da Nexauren.",
        type:"SERVICE",
        category:"SOFTWARE",
        home_url:"https://nexaurenstory.com/account"
      })
    });
    productId=product?.id;
    if(!productId)throw new Error("O PayPal não devolveu o ID do produto.");
    await billingConfigSet(env,PAYPAL_PRODUCT_KEY,productId);
  }

  const plan=await paypalRequest(env,"/v1/billing/plans",{
    method:"POST",
    headers:{
      "PayPal-Request-Id":"nexauren-pro-plan-"+environment+"-"+crypto.randomUUID(),
      "Prefer":"return=representation"
    },
    body:JSON.stringify({
      product_id:productId,
      name:"Nexauren Pro — $5/mês",
      description:"Plano Pro mensal da Nexauren Story.",
      billing_cycles:[{
        frequency:{interval_unit:"MONTH",interval_count:1},
        tenure_type:"REGULAR",
        sequence:1,
        total_cycles:0,
        pricing_scheme:{fixed_price:{value:"5.00",currency_code:"USD"}}
      }],
      payment_preferences:{
        auto_bill_outstanding:true,
        payment_failure_threshold:1
      }
    })
  });

  planId=plan?.id;
  if(!planId)throw new Error("O PayPal não devolveu o ID do plano.");
  await billingConfigSet(env,PAYPAL_PLAN_KEY,planId);
  await billingConfigSet(env,PAYPAL_ENV_KEY,environment);
  return planId;
}
async function billingRow(env,accountId){
  const row=await env.ACCOUNTS_DB.prepare("SELECT * FROM nexauren_subscriptions WHERE account_id=? LIMIT 1").bind(accountId).first();
  return row||null;
}
function billingPublic(row){
  if(!row)return {plan:"free",status:"FREE",amount:"0.00",currency:"USD",cancel_at_period_end:false,current_period_end:null};
  return {
    plan:row.plan,
    status:row.status,
    amount:row.plan==="pro"?row.amount:"0.00",
    currency:row.currency,
    cancel_at_period_end:!!row.cancel_at_period_end,
    current_period_end:row.current_period_end||null,
    paypal_subscription_id:row.paypal_subscription_id||null
  };
}
async function billingEnsureRow(env,accountId){
  let row=await billingRow(env,accountId);
  if(row)return row;
  const ts=nowIso(),id=crypto.randomUUID();
  await env.ACCOUNTS_DB.prepare("INSERT INTO nexauren_subscriptions (id,account_id,plan,status,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(id,accountId,"free","FREE",ts,ts).run();
  return await billingRow(env,accountId);
}
async function billingSyncFromPaypal(env,row,remote){
  if(!row||!remote)return row;
  const active=remote.status==="ACTIVE";
  const plan=active?"pro":"free";
  const currentEnd=remote?.billing_info?.next_billing_time||null;
  const cancelAt=0;
  await env.ACCOUNTS_DB.prepare("UPDATE nexauren_subscriptions SET plan=?,status=?,paypal_plan_id=?,current_period_end=?,cancel_at_period_end=?,updated_at=? WHERE account_id=?")
    .bind(plan,remote.status||"UNKNOWN",remote.plan_id||row.paypal_plan_id||null,currentEnd,cancelAt,nowIso(),row.account_id).run();
  return await billingRow(env,row.account_id);
}

const PERMANENT_PRO_EMAIL = "nexaurenstore@gmail.com";
function isPermanentProEmail(email){
  return normalizeEmail(email)===PERMANENT_PRO_EMAIL;
}
async function isPermanentProAccount(env,accountId){
  const row=await env.ACCOUNTS_DB.prepare("SELECT email FROM nexauren_accounts WHERE id=? LIMIT 1").bind(accountId).first();
  return isPermanentProEmail(row?.email);
}
async function proToolAccess(env,accountId){
  if(await isPermanentProAccount(env,accountId))return true;
  const row=await env.ACCOUNTS_DB.prepare("SELECT 1 FROM nexauren_subscriptions WHERE account_id=? AND plan='pro' AND status='ACTIVE' LIMIT 1").bind(accountId).first();
  return !!row;
}

const IMAGE_COMPRESSOR_TOOL_ID = "image-compressor";
const IMAGE_COMPRESSOR_DEFAULT_FREE_BATCH = 3;

async function ensureToolAccountUsageSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS tool_account_usage (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    batch_id TEXT NOT NULL UNIQUE,
    image_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_tool_account_usage_account ON tool_account_usage(account_id,tool_id,bucket)").run();
}

async function resolvedBillingRow(env,accountId){
  let row=await billingEnsureRow(env,accountId);
  if(row?.paypal_subscription_id&&["ACTIVE","APPROVED","SUSPENDED","CANCELLED","EXPIRED"].includes(row.status)){
    const remote=await paypalRequest(env,"/v1/billing/subscriptions/"+encodeURIComponent(row.paypal_subscription_id)+"?fields=plan", {method:"GET"});
    if(remote?.plan_id===row.paypal_plan_id||!row.paypal_plan_id){
      row=await billingSyncFromPaypal(env,row,remote);
    }
  }
  return row;
}

async function imageCompressorContext(env,request){
  const a=await firebaseAccountAuth(env,request,false);
  if(!a)return {error:fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED")};
  const registry=await loadToolRegistry(env,request);
  const tool=registry?.tools?.find(t=>t.id===IMAGE_COMPRESSOR_TOOL_ID&&t.status==="active");
  if(!tool)return {error:fail("Ferramenta não encontrada.",404,"TOOL_NOT_FOUND")};
  const billing=await resolvedBillingRow(env,a.account.id);
  const pro=String(billing?.plan||"").toLowerCase()==="pro"&&String(billing?.status||"").toUpperCase()==="ACTIVE";
  const rawLimit=Number(tool.freeBatchLimit);
  const freeLimit=Number.isFinite(rawLimit)?Math.max(1,Math.min(1000,rawLimit)):IMAGE_COMPRESSOR_DEFAULT_FREE_BATCH;
  return {a,tool,pro,freeLimit};
}

async function imageCompressorQuery(env,request){
  if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
  const ctx=await imageCompressorContext(env,request);
  if(ctx.error)return ctx.error;
  await ensureToolAccountUsageSchema(env);
  const bucket=nowIso().slice(0,10);
  const usage=await env.DB.prepare("SELECT COUNT(*) batches,COALESCE(SUM(image_count),0) images FROM tool_account_usage WHERE account_id=? AND tool_id=? AND bucket=?").bind(ctx.a.account.id,IMAGE_COMPRESSOR_TOOL_ID,bucket).first();
  const maxFiles=ctx.pro?null:ctx.freeLimit;
  return json({
    ok:true,
    provider:"firebase",
    tool:{id:ctx.tool.id,name:ctx.tool.name,version:ctx.tool.version},
    plan:ctx.pro?"pro":"free",
    limits:{maxFilesPerBatch:maxFiles},
    usage:{todayBatches:Number(usage?.batches||0),todayImages:Number(usage?.images||0)}
  });
}

async function imageCompressorConsume(env,request){
  if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
  const ctx=await imageCompressorContext(env,request);
  if(ctx.error)return ctx.error;
  const data=await bodyJson(request);
  const imageCount=Number(data?.image_count);
  if(!Number.isSafeInteger(imageCount)||imageCount<1)return fail("Quantidade de imagens inválida.",422,"IMAGE_COUNT_INVALID");
  if(!ctx.pro&&imageCount>ctx.freeLimit){
    return fail("O plano Free permite até "+ctx.freeLimit+" imagens por lote. Atualize para o Pro para remover este limite.",429,"TOOL_BATCH_LIMIT",String(ctx.freeLimit));
  }
  await ensureToolAccountUsageSchema(env);
  const bucket=nowIso().slice(0,10);
  const batchId=text(data?.batch_id||crypto.randomUUID(),120);
  await env.DB.prepare("INSERT INTO tool_account_usage (id,account_id,tool_id,bucket,batch_id,image_count,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),ctx.a.account.id,IMAGE_COMPRESSOR_TOOL_ID,bucket,batchId,imageCount,nowIso()).run();
  return json({ok:true,batch_id:batchId,plan:ctx.pro?"pro":"free",limits:{maxFilesPerBatch:ctx.pro?null:ctx.freeLimit}});
}

async function verifyPaypalWebhook(env,request,rawBody){
  const webhookId=String(env.PAYPAL_WEBHOOK_ID||"").trim();
  if(!webhookId)throw Object.assign(new Error("PAYPAL_WEBHOOK_ID não está configurado."),{code:"PAYPAL_WEBHOOK_NOT_CONFIGURED"});
  const required=["paypal-auth-algo","paypal-cert-url","paypal-transmission-id","paypal-transmission-sig","paypal-transmission-time"];
  const headers={};
  for(const name of required){const value=request.headers.get(name);if(!value)throw Object.assign(new Error("Cabeçalhos de assinatura PayPal em falta."),{code:"PAYPAL_WEBHOOK_HEADERS_MISSING"});headers[name.replaceAll("-","_")]=value;}
  headers.webhook_event=rawBody;headers.webhook_id=webhookId;
  const result=await paypalRequest(env,"/v1/notifications/verify-webhook-signature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(headers)});
  if(result?.verification_status!=="SUCCESS")throw Object.assign(new Error("Assinatura do webhook PayPal inválida."),{code:"PAYPAL_WEBHOOK_INVALID"});
}
async function handlePaypalWebhook(env,request){
  const raw=await request.text();
  if(raw.length>500000)throw Object.assign(new Error("Webhook demasiado grande."),{code:"PAYPAL_WEBHOOK_TOO_LARGE"});
  await verifyPaypalWebhook(env,request,raw);
  const event=JSON.parse(raw);
  const type=String(event?.event_type||"");
  const resource=event?.resource||{};
  if(!["BILLING.SUBSCRIPTION.ACTIVATED","BILLING.SUBSCRIPTION.UPDATED","BILLING.SUBSCRIPTION.SUSPENDED","BILLING.SUBSCRIPTION.CANCELLED","BILLING.SUBSCRIPTION.EXPIRED"].includes(type))return json({ok:true,ignored:true});
  const subscriptionId=String(resource.id||"").trim();
  const customId=String(resource.custom_id||"").trim();
  if(!subscriptionId)return json({ok:true,ignored:true});
  let row=await env.ACCOUNTS_DB.prepare("SELECT * FROM nexauren_subscriptions WHERE paypal_subscription_id=? LIMIT 1").bind(subscriptionId).first();
  if(!row&&customId)row=await billingRow(env,customId);
  if(!row)return json({ok:true,ignored:true});
  const active=String(resource.status||"") === "ACTIVE";
  const plan=active?"pro":"free";
  await env.ACCOUNTS_DB.prepare("UPDATE nexauren_subscriptions SET plan=?,status=?,paypal_subscription_id=?,paypal_plan_id=?,current_period_end=?,cancel_at_period_end=?,updated_at=? WHERE account_id=?")
    .bind(plan,String(resource.status||"UNKNOWN"),subscriptionId,resource.plan_id||row.paypal_plan_id||null,resource?.billing_info?.next_billing_time||null,0,nowIso(),row.account_id).run();
  return json({ok:true});
}


const SUPPORT_TO_EMAIL="nexaurenx@gmail.com";
const SUPPORT_KINDS=new Set(["problem","support","suggestion","feature","other"]);

async function ensureSupportFeedbackSchema(env){
  const schema=[
    "CREATE TABLE IF NOT EXISTS support_feedback (",
    "id TEXT PRIMARY KEY,kind TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,tool_id TEXT,tool_name TEXT,tool_category TEXT,tool_access TEXT,tool_path TEXT,source_path TEXT,page_url TEXT,referrer TEXT,language TEXT,locale TEXT,timezone TEXT,user_agent TEXT,platform TEXT,screen_json TEXT,viewport_json TEXT,connection_json TEXT,client_time TEXT,",
    "touch_points INTEGER NOT NULL DEFAULT 0,online INTEGER NOT NULL DEFAULT 1,cookies_enabled INTEGER NOT NULL DEFAULT 0,color_scheme TEXT,account_id TEXT,firebase_uid TEXT,account_email TEXT,account_display_name TEXT,account_email_verified INTEGER,account_plan TEXT,ip_hash TEXT,country TEXT,cf_ray TEXT,requester_email TEXT,email_status TEXT NOT NULL DEFAULT 'pending',email_error TEXT,created_at TEXT NOT NULL",
    ")"
  ].join("\\n");
  await env.DB.prepare(schema).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_support_feedback_created ON support_feedback(created_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_support_feedback_kind ON support_feedback(kind,created_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_support_feedback_tool ON support_feedback(tool_id,created_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_support_feedback_account ON support_feedback(account_id,created_at DESC)").run();
}

function supportEmailHtml(submission){
  const line=(label,value)=>"<tr><td style='padding:5px 12px 5px 0;color:#6b7280;vertical-align:top'><strong>"+esc(label)+"</strong></td><td style='padding:5px 0;white-space:pre-wrap'>"+esc(value||"—")+"</td></tr>";
  const rows=[
    ["Reference",submission.id],["Type",submission.kind],["Subject",submission.subject],
    ["Tool ID",submission.tool_id],["Tool name",submission.tool_name],["Tool category",submission.tool_category],
    ["Tool access",submission.tool_access],["Tool path",submission.tool_path],["Source path",submission.source_path],
    ["Page URL",submission.page_url],["Language",submission.language],["Account ID",submission.account_id],
    ["Firebase UID",submission.firebase_uid],["Account email",submission.account_email],
    ["Display name",submission.account_display_name],["Email verified",submission.account_email_verified==null?"":String(!!submission.account_email_verified)],
    ["Plan",submission.account_plan],["Timezone",submission.timezone],["Locale",submission.locale],
    ["User agent",submission.user_agent],["Platform",submission.platform],["Screen",submission.screen_json],
    ["Viewport",submission.viewport_json],["Connection",submission.connection_json],["Touch points",String(submission.touch_points)],
    ["Online",String(!!submission.online)],["Cookies enabled",String(!!submission.cookies_enabled)],
    ["Color scheme",submission.color_scheme],["Referrer",submission.referrer],["Country",submission.country],
    ["CF-Ray",submission.cf_ray],["Client time",submission.client_time],["Server time",submission.created_at]
  ].map(([a,b])=>line(a,b)).join("");
  return "<!doctype html><html><body style='font-family:Inter,Arial,sans-serif;color:#111827'><div style='max-width:760px;margin:0 auto;padding:24px'><h2>Nexauren Support — "+esc(submission.kind)+"</h2><p style='color:#6b7280'>Reference <strong>"+esc(submission.id)+"</strong></p><h3>"+esc(submission.subject)+"</h3><div style='padding:16px;background:#f3f4f6;border-radius:10px;white-space:pre-wrap;line-height:1.55'>"+esc(submission.message)+"</div><h3 style='margin-top:26px'>Context</h3><table>"+rows+"</table><p style='margin-top:26px;color:#6b7280;font-size:12px'>Passwords, authentication tokens and cookie contents are intentionally excluded.</p></div></body></html>";
}

async function sendSupportEmail(env,submission){
  const apiKey=String(env.RESEND_API_KEY||"").trim();
  if(!apiKey)throw Object.assign(new Error("Email delivery is not configured."),{code:"EMAIL_NOT_CONFIGURED"});
  const from=String(env.SUPPORT_FROM_EMAIL||"Nexauren Support <noreply@nexaurenstory.com>").trim();
  const replyTo=String(submission.requester_email||"").trim();
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({from,to:[SUPPORT_TO_EMAIL],subject:("[Nexauren Support] "+(submission.tool_name?submission.tool_name+" — ":"")+submission.subject).slice(0,250),html:supportEmailHtml(submission),...(replyTo?{reply_to:replyTo}:{}),headers:{"X-Nexauren-Reference":submission.id}})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(String(data&&data.message||"Email delivery failed.").slice(0,300)),{code:"EMAIL_DELIVERY_FAILED"});
}

async function submitSupportFeedback(env,request){
  if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
  const data=await bodyJson(request)||{};
  const kind=text(data.kind||"",30).toLowerCase();
  if(!SUPPORT_KINDS.has(kind))return fail("Tipo de mensagem inválido.",422,"SUPPORT_KIND_INVALID");
  const subject=text(data.subject||"",180).trim();
  const message=text(data.message||"",12000).trim();
  if(subject.length<2)return fail("Introduza um assunto.",422,"SUPPORT_SUBJECT_REQUIRED");
  if(message.length<8)return fail("Descreva o pedido com mais detalhe.",422,"SUPPORT_MESSAGE_REQUIRED");

  const suppliedEmail=normalizeEmail(data.email||"");
  if(suppliedEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail))return fail("Email inválido.",422,"SUPPORT_EMAIL_INVALID");

  const ip=request.headers.get("CF-Connecting-IP")||"";
  const ipHash=await sha256(ip||"unknown");
  await ensureSupportFeedbackSchema(env);
  const recent=await env.DB.prepare("SELECT COUNT(*) AS count FROM support_feedback WHERE ip_hash=? AND created_at>=?").bind(ipHash,new Date(Date.now()-3600000).toISOString()).first();
  if(Number(recent&&recent.count||0)>=5)return fail("Limite de mensagens atingido. Tente novamente mais tarde.",429,"SUPPORT_RATE_LIMIT");

  let account=null;
  if(request.headers.get("Authorization")){
    try{
      const a=await firebaseAccountAuth(env,request,false);
      account=a&&a.account||null;
    }catch(error){
      return fail(error&&error.message||"Sessão inválida ou expirada.",401,error&&error.code||"FIREBASE_TOKEN_INVALID");
    }
  }

  const registry=await loadToolRegistry(env,request);
  const rawToolId=text(data.tool_id||"",180).trim();
  const sourcePath=text(data.source_path||"",500).trim();
  let tool=rawToolId?registry&&registry.tools&&registry.tools.find(t=>t.id===slugify(rawToolId)&&t.status==="active"):null;
  if(!tool&&sourcePath)tool=registry&&registry.tools&&registry.tools.find(t=>String(t.path||"")===sourcePath&&t.status==="active")||null;

  let plan="free";
  if(account&&env.ACCOUNTS_DB){
    try{
      const billing=await env.ACCOUNTS_DB.prepare("SELECT plan,status FROM nexauren_subscriptions WHERE account_id=? LIMIT 1").bind(account.id).first();
      if(String(billing&&billing.plan||"").toLowerCase()==="pro"&&String(billing&&billing.status||"").toUpperCase()==="ACTIVE")plan="pro";
    }catch{}
  }

  const pc=data.include_diagnostics===false?{}:(data.page_context&&typeof data.page_context==="object"?data.page_context:{});
  const submission={
    id:"NX-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+crypto.randomUUID().slice(0,8).toUpperCase(),
    kind,subject,message,
    tool_id:tool&&tool.id||rawToolId||null,
    tool_name:text(tool&& (tool.name_en||tool.name)||"",180)||null,
    tool_category:text(tool&&tool.category||"",80)||null,
    tool_access:text(tool&&tool.access||"",40)||null,
    tool_path:text(tool&&tool.path||sourcePath,500)||null,
    source_path:sourcePath||null,
    page_url:text(pc.page_url||"",1000)||null,
    referrer:text(pc.referrer||"",1000)||null,
    language:text(pc.language||"en",10),
    locale:text(pc.locale||"",40)||null,
    timezone:text(pc.timezone||"",100)||null,
    user_agent:text(pc.user_agent||request.headers.get("User-Agent")||"",1000)||null,
    platform:text(pc.platform||"",200)||null,
    screen_json:JSON.stringify(pc.screen||{}),
    viewport_json:JSON.stringify(pc.viewport||{}),
    connection_json:JSON.stringify(pc.connection||{}),
    client_time:text(pc.client_time||"",80)||null,
    touch_points:Number(pc.touch_points||0),
    online:pc.online===false?0:1,
    cookies_enabled:pc.cookies_enabled===true?1:0,
    color_scheme:text(pc.color_scheme||"",20)||null,
    account_id:account&&account.id||null,
    firebase_uid:account&&account.firebase_uid||null,
    account_email:normalizeEmail(account&&account.email||"")||null,
    account_display_name:text(account&&account.display_name||"",120)||null,
    account_email_verified:account&&account.email_verified!=null?(account.email_verified?1:0):null,
    account_plan:plan,
    ip_hash:ipHash,
    country:text(request.headers.get("CF-IPCountry")||"",20)||null,
    cf_ray:text(request.headers.get("CF-Ray")||"",120)||null,
    requester_email:normalizeEmail(account&&account.email||suppliedEmail||"")||null,
    email_status:"pending",
    email_error:null,
    created_at:nowIso()
  };

  const cols=Object.keys(submission);
  const sql="INSERT INTO support_feedback ("+cols.join(",")+") VALUES ("+cols.map(()=>"?").join(",")+")";
  await env.DB.prepare(sql).bind(...cols.map(k=>submission[k])).run();

  try{
    await sendSupportEmail(env,submission);
    await env.DB.prepare("UPDATE support_feedback SET email_status=?,email_error=NULL WHERE id=?").bind("sent",submission.id).run();
    return json({ok:true,reference:submission.id,email_sent:true});
  }catch(error){
    const code=error&&error.code||"EMAIL_DELIVERY_FAILED";
    const message=error&&error.message||"Email delivery failed.";
    await env.DB.prepare("UPDATE support_feedback SET email_status=?,email_error=? WHERE id=?").bind(code,message.slice(0,300),submission.id).run();
    const status=code==="EMAIL_NOT_CONFIGURED"?503:502;
    return fail("Mensagem recebida, mas o email ainda não pôde ser entregue. Guarde esta referência: "+submission.id,status,code);
  }
}

async function api(env,request,url,ctx){
  const p=url.pathname,m=request.method;
  if(p==="/api/support/submit"&&m==="POST"){try{return await submitSupportFeedback(env,request);}catch(error){console.error("support submission",error);return fail(error&&error.message||"Não foi possível enviar a mensagem.",503,error&&error.code||"SUPPORT_SUBMIT_ERROR");}}
  if(p==="/api/paypal/webhook"&&m==="POST"){
    try{return await handlePaypalWebhook(env,request);}catch(error){
      const code=error?.code||"PAYPAL_WEBHOOK_ERROR";
      const status=["PAYPAL_WEBHOOK_INVALID","PAYPAL_WEBHOOK_HEADERS_MISSING"].includes(code)?400:503;
      return fail(error?.message||"Não foi possível processar o webhook PayPal.",status,code);
    }
  }
  if(p==="/api/tool/unlock"&&m==="GET"){
    try{
      const a=await firebaseAccountAuth(env,request,false);
      if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      const toolId=text(url.searchParams.get("tool_id")||"",120);
      if(!toolId)return fail("Ferramenta não especificada.",400,"TOOL_REQUIRED");
      const registry=await loadToolRegistry(env,request);
      const tool=registry?.tools?.find(t=>t.id===toolId&&t.status==="active");
      if(!tool)return fail("Ferramenta não encontrada.",404,"TOOL_NOT_FOUND");
      const requiresPro=tool.access==="premium";
      const activePro=requiresPro?await proToolAccess(env,a.account.id):true;
      return json({ok:true,unlocked:activePro,requires_pro:requiresPro});
    }catch(error){
      return fail(error?.message||"Não foi possível verificar o acesso.",500,error?.code||"TOOL_ACCESS_ERROR");
    }
  }

  if(p==="/api/tools/image-compressor/query"&&m==="GET"){
    try{return await imageCompressorQuery(env,request);}
    catch(error){return fail(error?.message||"Não foi possível consultar os limites do compressor.",503,error?.code||"IMAGE_COMPRESSOR_QUERY_ERROR");}
  }

  if(p==="/api/tools/image-compressor/consume"&&m==="POST"){
    try{return await imageCompressorConsume(env,request);}
    catch(error){
      const code=error?.code||"IMAGE_COMPRESSOR_CONSUME_ERROR";
      const status=code==="TOOL_BATCH_LIMIT"?429:503;
      return fail(error?.message||"Não foi possível validar o lote.",status,code,error?.details||null);
    }
  }

  if(p==="/api/health"&&m==="GET"){try{const ready=await dbReady(env);return json({ok:ready,db:ready},ready?200:503);}catch{return fail("D1 indisponível.",503,"DB_UNAVAILABLE");}}
  if(p==="/api/account/me"&&m==="GET"){
    try{
      const a=await firebaseAccountAuth(env,request,false);
      if(!a)return json({ok:true,authenticated:false,provider:"firebase"});
      return json({ok:true,authenticated:true,provider:"firebase",account:a.account});
    }catch(error){
      const code=error?.code||"ACCOUNT_AUTH_ERROR";
      const status=code==="ACCOUNT_DB_NOT_READY"?503:(code==="ACCOUNT_SUSPENDED"?403:401);
      return fail(error?.message||"Não foi possível validar a conta.",status,code,error?.reason||error?.message);
    }
  }
  if(p==="/api/account/sync"&&m==="POST"){
    if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
    try{
      const a=await firebaseAccountAuth(env,request,true);
      if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      return json({ok:true,provider:"firebase",account:a.account});
    }catch(error){
      const code=error?.code||"ACCOUNT_SYNC_ERROR";
      const status=code==="ACCOUNT_DB_NOT_READY"?503:(code==="ACCOUNT_SUSPENDED"?403:401);
      return fail(error?.message||"Não foi possível sincronizar a conta.",status,code,error?.reason||error?.message);
    }
  }

  if(p==="/api/account/dashboard"&&m==="GET"){
    try{const a=await firebaseAccountAuth(env,request,false);if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      let billing={plan:"free",status:"FREE",amount:"5.00",currency:"USD",cancel_at_period_end:false,current_period_end:null,permanent:false};
      try{const row=await resolvedBillingRow(env,a.account.id);billing=billingPublic(row);if(isPermanentProEmail(a.account.email))billing={plan:"pro",status:"ACTIVE",amount:"0.00",currency:"USD",cancel_at_period_end:false,current_period_end:null,paypal_subscription_id:null,permanent:true}}catch(error){console.warn("account.dashboard.billing",String(error?.message||error))}
      return json({ok:true,account:a.account,billing});
    }catch(error){const code=error?.code||"ACCOUNT_DASHBOARD_ERROR",status=code==="ACCOUNT_DB_NOT_READY"?503:(code==="ACCOUNT_SUSPENDED"?403:401);return fail(error?.message||"Não foi possível carregar o dashboard da conta.",status,code,error?.reason||error?.message)}
  }
  if(p==="/api/account/billing"&&m==="GET"){
    try{
      const a=await firebaseAccountAuth(env,request,false);
      if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      let row;
      try{
        row=await resolvedBillingRow(env,a.account.id);
      }catch(error){
        console.error("billing.remote_sync",String(error?.message||error));
        return fail("Não foi possível validar o estado atual da assinatura.",503,"BILLING_SYNC_UNAVAILABLE");
      }
      if(isPermanentProEmail(a.account.email)){
        return json({ok:true,billing:{plan:"pro",status:"ACTIVE",amount:"0.00",currency:"USD",cancel_at_period_end:false,current_period_end:null,paypal_subscription_id:null,permanent:true}});
      }
      return json({ok:true,billing:billingPublic(row)});
    }catch(error){
      const code=error?.code||"BILLING_ERROR";
      const status=code==="ACCOUNT_DB_NOT_READY"?503:500;
      return fail(error?.message||"Não foi possível carregar a assinatura.",status,code,error?.reason||error?.message);
    }
  }
  if(p==="/api/account/paypal/create"&&m==="POST"){
    if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
    try{
      const a=await firebaseAccountAuth(env,request,true);
      if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      if(isPermanentProEmail(a.account.email))return fail("Esta conta já tem acesso Pro permanente.",409,"PERMANENT_PRO");
      let row=await billingEnsureRow(env,a.account.id);
      if(row.plan==="pro"&&row.status==="ACTIVE")return fail("A sua conta já tem o plano Pro ativo.",409,"ALREADY_PRO");
      if(row.status==="APPROVAL_PENDING")return fail("Já existe uma assinatura PayPal aguardando aprovação.",409,"SUBSCRIPTION_PENDING");
      const planId=await paypalEnsureProPlan(env);
      const response=await paypalRequest(env,"/v1/billing/subscriptions",{
        method:"POST",
        headers:{"PayPal-Request-Id":"nexauren-sub-"+crypto.randomUUID()},
        body:JSON.stringify({
          plan_id:planId,
          custom_id:a.account.id,
          subscriber:{email_address:a.account.email},
          application_context:{
            brand_name:"Nexauren Story",
            locale:"pt-PT",
            shipping_preference:"NO_SHIPPING",
            user_action:"SUBSCRIBE_NOW",
            return_url:"https://nexaurenstory.com/account/upgrade/?paypal=success",
            cancel_url:"https://nexaurenstory.com/account/upgrade/?paypal=cancel"
          }
        })
      });
      const approval=response?.links?.find(x=>x.rel==="approve")?.href;
      if(!response?.id||!approval)throw new Error("O PayPal não devolveu o endereço de aprovação.");
      await env.ACCOUNTS_DB.prepare("UPDATE nexauren_subscriptions SET plan='free',status=?,paypal_subscription_id=?,paypal_plan_id=?,amount='5.00',currency='USD',cancel_at_period_end=0,updated_at=? WHERE account_id=?")
        .bind(response.status||"APPROVAL_PENDING",response.id,planId,nowIso(),a.account.id).run();
      return json({ok:true,approval_url:approval,subscription_id:response.id});
    }catch(error){
      const code=error?.code||"PAYPAL_CREATE_ERROR";
      const status=code==="ALREADY_PRO"?409:500;
      return fail(error?.message||"Não foi possível iniciar o pagamento PayPal.",status,code);
    }
  }
  if(p==="/api/account/paypal/confirm"&&m==="POST"){
    if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
    try{
      const a=await firebaseAccountAuth(env,request,true);
      if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      const d=await bodyJson(request),subscriptionId=String(d?.subscription_id||"").trim();
      if(!subscriptionId)return fail("Subscription ID em falta.",422,"SUBSCRIPTION_ID_REQUIRED");
      const row=await billingRow(env,a.account.id);
      if(!row||row.paypal_subscription_id!==subscriptionId)return fail("Assinatura não pertence a esta conta.",403,"SUBSCRIPTION_MISMATCH");
      const remote=await paypalRequest(env,"/v1/billing/subscriptions/"+encodeURIComponent(subscriptionId)+"?fields=plan", {method:"GET"});
      if(remote?.plan_id!==row.paypal_plan_id)return fail("O plano PayPal não corresponde ao plano Nexauren.",400,"PLAN_MISMATCH");
      if(remote?.custom_id&&remote.custom_id!==a.account.id)return fail("A assinatura PayPal não corresponde à conta.",403,"SUBSCRIPTION_MISMATCH");
      const updated=await billingSyncFromPaypal(env,row,remote);
      return json({ok:true,billing:billingPublic(updated),paypal_status:remote.status});
    }catch(error){
      const code=error?.code||"PAYPAL_CONFIRM_ERROR";
      return fail(error?.message||"Não foi possível confirmar a assinatura.",500,code);
    }
  }
  if(p==="/api/account/paypal/cancel"&&m==="POST"){
    if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
    try{
      const a=await firebaseAccountAuth(env,request,true);
      if(!a)return fail("Autenticação Firebase necessária.",401,"UNAUTHENTICATED");
      const row=await billingRow(env,a.account.id);
      if(!row?.paypal_subscription_id||row.plan!=="pro")return fail("Não existe uma assinatura Pro ativa.",409,"NO_ACTIVE_SUBSCRIPTION");
      await paypalRequest(env,"/v1/billing/subscriptions/"+encodeURIComponent(row.paypal_subscription_id)+"/cancel",{
        method:"POST",
        body:JSON.stringify({reason:"Cancelamento solicitado pelo cliente Nexauren."})
      });
      await env.ACCOUNTS_DB.prepare("UPDATE nexauren_subscriptions SET plan='free',status='CANCELLED',cancel_at_period_end=0,updated_at=? WHERE account_id=?").bind(nowIso(),a.account.id).run();
      return json({ok:true,billing:billingPublic(await billingRow(env,a.account.id))});
    }catch(error){
      return fail(error?.message||"Não foi possível cancelar a assinatura.",500,error?.code||"PAYPAL_CANCEL_ERROR");
    }
  }

  if(p.startsWith("/api/account/")) return fail("Endpoint de conta não disponível.",410,"ACCOUNT_ENDPOINT_DISABLED");
  if(!(await dbReady(env))) return fail("O D1 ainda não foi inicializado. Execute o conteúdo completo de schema.sql no banco Nexauren primary e publique novamente.",503,"DB_NOT_READY");
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
    const ok=(u?.status==="active")&&await verifyPassword(pw,u?.password_hash||DUMMY_PASSWORD_HASH);await env.DB.prepare("INSERT INTO login_attempts (id,identifier,success,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),identifier,ok?1:0,nowIso()).run();
    if(!ok)return fail("Email ou senha inválidos.",401,"INVALID_CREDENTIALS");const ts=nowIso();await env.DB.prepare("UPDATE users SET last_login_at=?,updated_at=? WHERE id=?").bind(ts,ts,u.id).run();const s=await createSession(env,u.id,request);await audit(env,u.id,"auth.login","user",u.id,{});
    return json({ok:true,user:{id:u.id,email:u.email,display_name:u.display_name,role:u.role}},200,{"set-cookie":cookie(COOKIE,s.token,{maxAge:SESSION_SECONDS})});
    }catch(e){console.error("auth.login",e);return fail("Falha ao autenticar no D1. " + String(e?.message||"Verifique o schema.sql e a configuração do D1."),500,"AUTH_DB_ERROR");}
  }
  if(p==="/api/auth/logout"&&m==="POST"){const raw=getCookie(request,COOKIE);if(raw){const h=await sha256(raw),s=await env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash=?").bind(h).first();if(s)await audit(env,s.user_id,"auth.logout","user",s.user_id,{});await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(h).run();}return json({ok:true},200,{"set-cookie":cookie(COOKIE,"",{maxAge:0})});}
  if(p==="/api/auth/me"&&m==="GET"){const u=await auth(env,request);return u?json({ok:true,user:{id:u.id,email:u.email,display_name:u.display_name,role:u.role}}):json({ok:false,user:null},401);}
  if(p==="/api/auth/password"&&m==="POST"){const g=await guard(env,request);if(g.error)return g.error;const d=await bodyJson(request),cur=String(d?.current_password||""),next=String(d?.new_password||"");if(next.length<12)return fail("A nova senha precisa ter pelo menos 12 caracteres.",422);const u=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(g.auth.id).first();if(!u||!(await verifyPassword(cur,u.password_hash)))return fail("Senha atual inválida.",401);await env.DB.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").bind(await hashPassword(next),nowIso(),g.auth.id).run();await env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(g.auth.id,g.auth.session_id).run();await audit(env,g.auth.id,"auth.password_changed","user",g.auth.id,{});return json({ok:true});}
  if(p==="/api/media/auth"&&m==="GET")return uploadAuth(env,request);
  if(p==="/api/media"&&m==="GET"){const g=await guard(env,request);if(g.error)return g.error;const r=await env.DB.prepare("SELECT * FROM media ORDER BY created_at DESC LIMIT 100").all();return json({ok:true,media:(r.results||[]).filter(x=>!isSvgUrl(x.url)&&!String(x.mime_type||"").toLowerCase().includes("svg"))});}
  if(p==="/api/media"&&m==="POST"){const g=await guard(env,request,["owner","admin","editor"]);if(g.error)return g.error;const d=await bodyJson(request);if(!d?.url||!d?.fileId)return fail("Resposta do ImageKit incompleta.",422);if(d.fileType&&d.fileType!=="image")return fail("Apenas imagens são permitidas.",415,"UNSUPPORTED_MEDIA");if(isSvgUrl(d.url)||/svg/i.test(String(d.mime||"")))return fail("Imagens SVG não são permitidas.",415,"UNSUPPORTED_MEDIA");if(!await verifyImageKitFile(env,text(d.fileId,255).trim(),text(d.url,2000).trim()))return fail("O arquivo ImageKit não pôde ser validado.",422,"IMAGEKIT_FILE_INVALID");const id=crypto.randomUUID();await env.DB.prepare("INSERT INTO media (id,imagekit_file_id,url,thumbnail_url,filename,mime_type,size_bytes,width,height,alt_text,caption,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,d.fileId,d.url,d.thumbnailUrl||d.url,text(d.name||d.fileName,255),text(d.fileType||d.mime,100),Number(d.size||0),Number(d.width||0)||null,Number(d.height||0)||null,text(d.altText||"",300),text(d.caption||"",500),g.auth.id,nowIso()).run();await audit(env,g.auth.id,"media.uploaded","media",id,{filename:d.name||d.fileName});return json({ok:true,media:await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first()},201);}
  const mm=p.match(/^\/api\/media\/([^/]+)$/);if(mm&&m==="DELETE"){const g=await guard(env,request,true);if(g.error)return g.error;const id=mm[1],row=await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first();if(!row)return fail("Mídia não encontrada.",404);if(env.IMAGEKIT_PRIVATE_KEY&&row.imagekit_file_id){const authHeader="Basic "+btoa(env.IMAGEKIT_PRIVATE_KEY+":");const ir=await fetch("https://api.imagekit.io/v1/files/"+encodeURIComponent(row.imagekit_file_id),{method:"DELETE",headers:{Authorization:authHeader,Accept:"application/json"}});if(!ir.ok&&ir.status!==404)return fail("O arquivo não pôde ser removido do ImageKit.",502,"IMAGEKIT_DELETE_FAILED");}await env.DB.prepare("UPDATE posts SET cover_media_id=NULL,social_image=? WHERE cover_media_id=?").bind(DEFAULT_SOCIAL_IMAGE,id).run();await env.DB.prepare("DELETE FROM media WHERE id=?").bind(id).run();await audit(env,g.auth.id,"media.deleted","media",id,{filename:row.filename});return json({ok:true});}

  if(p==="/api/tool/engagement"&&m==="GET"){
    try{return await toolEngagement(env,request,url);}
    catch(error){return fail(error?.message||"Não foi possível carregar as avaliações.",503,error?.code||"TOOL_ENGAGEMENT_ERROR");}
  }
  if(p==="/api/tool/reviews"&&m==="GET"){
    try{return await publicToolReviews(env,request,url);}
    catch(error){return fail(error?.message||"Não foi possível carregar as avaliações.",503,error?.code||"TOOL_REVIEWS_ERROR");}
  }
  if(p==="/api/tool/reviews"&&m==="POST"){
    try{return await saveToolReview(env,request);}
    catch(error){
      const code=error?.code||"TOOL_REVIEW_SAVE_ERROR";
      const status=code==="UNAUTHENTICATED"?401:(code==="TOOL_NOT_FOUND"?404:(["TOOL_REQUIRED","TOOL_RATING_INVALID","ANONYMOUS_NAME_INVALID"].includes(code)?422:503));
      return fail(error?.message||"Não foi possível guardar a avaliação.",status,code);
    }
  }
  const trr=p.match(/^\/api\/tool\/reviews\/([^/]+)$/);
  if(trr&&m==="DELETE"){
    try{return await deleteToolReview(env,request,trr[1]);}
    catch(error){return fail(error?.message||"Não foi possível eliminar a avaliação.",error?.code==="UNAUTHENTICATED"?401:503,error?.code||"TOOL_REVIEW_DELETE_ERROR");}
  }
  if(p==="/api/tool/favorites"&&m==="POST"){
    try{return await toggleToolFavorite(env,request);}
    catch(error){return fail(error?.message||"Não foi possível guardar o favorito.",error?.code==="UNAUTHENTICATED"?401:503,error?.code||"TOOL_FAVORITE_ERROR");}
  }

  if(p==="/api/tool-registry"&&m==="GET"){
    try{
      const registry=await toolRegistryWithUsage(env,request);
      return json(registry);
    }catch(e){return fail("Não foi possível carregar o catálogo de ferramentas.",503,"TOOLS_UNAVAILABLE");}
  }
  if(p==="/api/tools/events"&&m==="POST"){
    if(!sameOrigin(request))return fail("Origem não autorizada.",403,"ORIGIN");
    try{
      const d=await bodyJson(request),toolId=slugify(d?.tool_id||""),registry=await loadToolRegistry(env,request),tool=registry.tools.find(t=>t.id===toolId&&t.status==="active");
      if(!tool)return fail("Ferramenta não encontrada.",404,"TOOL_NOT_FOUND");
      const bucket=nowIso().slice(0,10),ip=request.headers.get("CF-Connecting-IP")||"",ua=(request.headers.get("User-Agent")||"").slice(0,180);
      const visitorHash=await sha256(ip+"|"+ua);
      await env.DB.prepare("INSERT OR IGNORE INTO tool_usage (tool_id,bucket,visitor_hash,created_at) VALUES (?,?,?,?)").bind(toolId,bucket,visitorHash,nowIso()).run();
      return json({ok:true});
    }catch(e){return json({ok:false},202);}
  }
  if(p==="/api/admin/tools"&&m==="GET"){
    const g=await guard(env,request,true);if(g.error)return g.error;
    return json({ok:true,registry:await toolRegistryWithUsage(env,request)});
  }
  if(p==="/api/admin/tools"&&m==="PUT"){
    const g=await guard(env,request,true);if(g.error)return g.error;
    return saveToolRegistry(env,g.auth,(await bodyJson(request))||{});
  }
  if(p==="/api/admin/users"&&m==="GET"){
    const g=await guard(env,request,true);if(g.error)return g.error;
    const data=await adminUsers(env);return json({ok:true,...data});
  }
  const aum=p.match(/^\/api\/admin\/users\/(admin|account)\/([^/]+)$/);
  if(aum&&m==="PUT"){
    const g=await guard(env,request,true);if(g.error)return g.error;
    const d=await bodyJson(request)||{},status=["active","suspended"].includes(d.status)?d.status:null;
    if(!status)return fail("Estado inválido.",422);
    if(aum[1]==="admin"){
      const row=await env.DB.prepare("SELECT id,role FROM users WHERE id=? LIMIT 1").bind(aum[2]).first();
      if(!row)return fail("Administrador não encontrado.",404);
      if(row.role==="owner"&&g.auth.role!=="owner")return fail("A conta owner só pode ser alterada pelo owner.",403,"FORBIDDEN");
      if(row.id===g.auth.id&&status==="suspended")return fail("Não pode suspender a própria sessão.",422);
      await env.DB.prepare("UPDATE users SET status=?,updated_at=? WHERE id=?").bind(status,nowIso(),row.id).run();
      await audit(env,g.auth.id,"admin.user_status_updated","user",row.id,{status});return json({ok:true});
    }
    try{
      if(!env.ACCOUNTS_DB)return fail("Base de contas não configurada.",503,"ACCOUNTS_DB_UNAVAILABLE");
      const row=await env.ACCOUNTS_DB.prepare("SELECT id FROM nexauren_accounts WHERE id=? LIMIT 1").bind(aum[2]).first();
      if(!row)return fail("Utilizador não encontrado.",404);
      await env.ACCOUNTS_DB.prepare("UPDATE nexauren_accounts SET status=?,updated_at=? WHERE id=?").bind(status,nowIso(),row.id).run();
      await audit(env,g.auth.id,"account.user_status_updated","account",row.id,{status});return json({ok:true});
    }catch(e){return fail("Não foi possível atualizar o utilizador.",503,"ACCOUNTS_DB_ERROR");}
  }
  if(p==="/api/settings"&&m==="GET"){const g=await guard(env,request,["owner","admin"]);if(g.error)return g.error;const r=await env.DB.prepare("SELECT key,value,type FROM settings ORDER BY key").all(),s={};for(const x of r.results)s[x.key]=x.value;return json({ok:true,settings:s});}
  if(p==="/api/settings"&&m==="PUT"){const g=await guard(env,request,true);if(g.error)return g.error;const d=await bodyJson(request);for(const [key,value] of Object.entries(d||{}).slice(0,100)){if(!/^[a-z0-9_.-]{1,80}$/i.test(key))continue;await env.DB.prepare("INSERT INTO settings (key,value,type,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,type=excluded.type,updated_at=excluded.updated_at").bind(key,String(value).slice(0,10000),typeof value==="number"?"number":"string",nowIso()).run();}await audit(env,g.auth.id,"settings.updated","settings",null,{keys:Object.keys(d||{})});return json({ok:true});}
  if(p==="/api/activity"&&m==="GET"){const g=await guard(env,request,["owner","admin"]);if(g.error)return g.error;const r=await env.DB.prepare("SELECT a.*,u.display_name,u.email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100").all();return json({ok:true,activity:r.results});}
  if(p==="/api/stats"&&m==="GET"){const g=await guard(env,request,["owner","admin"]);if(g.error)return g.error;return json({ok:true,stats:await adminStats(env,request)});}
  return fail("Endpoint não encontrado.",404,"NOT_FOUND");
}
async function decorateToolHtmlResponse(request,response){
  const type=response.headers.get("content-type")||"";
  if(!response.ok||!type.toLowerCase().includes("text/html"))return response;
  let html=await response.text();
  html=html.replaceAll("/assets/nexauren-language.js?v=20260928-6","/assets/nexauren-language.js?v=20260928-7");
  if(!/tool-engagement\.css/i.test(html))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/tool/frontend/tool-engagement.css?v=20260926-1">\n</head>');
  if(!/public-ui\.css/i.test(html))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/public-ui.css?v=20260928-support-1">\n</head>');
  if(!/tool-engagement\.js/i.test(html))html=html.replace(/<\/body>/i,'<script src="/tool/frontend/tool-engagement.js?v=20260926-6" defer></script>\n</body>');
  html=replaceGlobalFooter(html,new URL(request.url).pathname);
  const headers=new Headers(response.headers);headers.delete("content-length");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function page(env,request,url){
  if(url.pathname.startsWith("/__/auth/"))return firebaseAuthProxy(request);
  if(url.pathname==="/sitemap.xml")return sitemapIndex();
  if(url.pathname==="/sitemap-pages.xml")return sitemapPages(env);
  if(url.pathname==="/robots.txt")return robots();
  if(url.pathname==="/social-preview.png")return env.ASSETS.fetch(new Request(new URL("/assets/social-preview-nexauren.png?v=20260926-png",request.url),request));
  if(url.pathname.startsWith("/assets/")||url.pathname.startsWith("/admin-assets/")||url.pathname==="/manifest.json")return env.ASSETS.fetch(request);
  if(url.pathname.startsWith("/tool/frontend/templates/"))return fail("Página não encontrada.",404,"NOT_FOUND");
  if(url.pathname==="/support"||url.pathname==="/support/"||url.pathname==="/feedback"||url.pathname==="/feedback/"){const path=url.pathname==="/feedback"||url.pathname==="/feedback/"?"/feedback/index.html":"/support/index.html";return decoratePublicHtmlResponse(request,await env.ASSETS.fetch(new Request(new URL(path,request.url))));}
  const adminPath=url.pathname.toLowerCase();
  if(adminPath==="/admin"||adminPath.startsWith("/admin/")){
    const rr=await env.ASSETS.fetch(new Request(new URL("/admin/index.html",request.url)));
    const h=new Headers(rr.headers);h.set("X-Robots-Tag","noindex, nofollow");h.set("Cache-Control","no-store,no-cache,must-revalidate,max-age=0");
    return decoratePublicHtmlResponse(request,new Response(rr.body,{status:rr.status,headers:h}));
  }
  if(url.pathname==="/"||url.pathname.startsWith("/legal/")||url.pathname==="/support"||url.pathname.startsWith("/support/")||url.pathname==="/feedback"||url.pathname.startsWith("/feedback/")||url.pathname==="/account"||url.pathname.startsWith("/account/")||url.pathname==="/tool"||url.pathname.startsWith("/tool/")){
    if(url.pathname.startsWith("/legal/")){let rr=await env.ASSETS.fetch(request);if(!rr.ok&&url.pathname.endsWith("/"))rr=await env.ASSETS.fetch(new Request(new URL(url.pathname+"index.html",request.url)));if(rr.ok)return decoratePublicHtmlResponse(request,rr)}
    if(url.pathname==="/account"||url.pathname==="/account/"){const rr=await env.ASSETS.fetch(new Request(new URL("/account/index.html",request.url)));const h=new Headers(rr.headers);h.set("X-Robots-Tag","noindex, nofollow");return decoratePublicHtmlResponse(request,new Response(rr.body,{status:rr.status,headers:h}))}
    if(url.pathname==="/")return decoratePublicHtmlResponse(request,await env.ASSETS.fetch(new Request(new URL("/index.html",request.url))));
    if(url.pathname==="/tool"||url.pathname==="/tool/")return decorateToolHtmlResponse(request,await env.ASSETS.fetch(new Request(new URL("/tool/index.html",request.url))));
    let rr=await env.ASSETS.fetch(request);if(!rr.ok&&url.pathname.endsWith("/"))rr=await env.ASSETS.fetch(new Request(new URL(url.pathname+"index.html",request.url)));return decorateToolHtmlResponse(request,rr);
  }
  return fail("Página não encontrada.",404,"NOT_FOUND");
}
export default{
  async fetch(request,env,ctx){try{const url=new URL(request.url);if(url.pathname.startsWith("/api/"))return await api(env,request,url,ctx);return await page(env,request,url);}catch(e){console.error(e);return fail("Erro interno do servidor.",500,"INTERNAL_ERROR");}},
  async scheduled(_controller,env){try{await cleanup(env);}catch(e){console.error("maintenance",e);}}
};