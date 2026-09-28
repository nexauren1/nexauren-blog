(()=>{"use strict";
const STORAGE="ns_lang";
const LANGS=new Set(["en","pt"]);
const PAIRS=[
["Ferramentas","Tools"],["Conta","Account"],["Planos","Plans"],["Legal","Legal"],["Início","Home"],["Privacidade","Privacy"],["Termos","Terms"],["Cookies","Cookies"],["Blog","Blog"],["Destaques","Featured"],["Populares","Popular"],["Avaliações","Reviews"],["Ferramenta","Tool"],["ferramenta","tool"],["ferramentas","tools"],["Ferramentas online","Online tools"],
["Abrir menu","Open menu"],["Fechar menu","Close menu"],["Saltar para o conteúdo","Skip to content"],["Voltar ao topo","Back to top"],
["EXPLORAR","EXPLORE"],["Categorias","Categories"],["Sempre a crescer","Always growing"],["Pesquisar ferramentas ou categorias…","Search tools or categories…"],["Ler avaliações →","Read reviews →"],
["Ferramentas para fazer mais, sem complicar.","Tools to get more done, without the complication."],["Pequenos utilitários para escrever, calcular, organizar e criar. Rápidos no telemóvel, simples no computador e preparados para crescer.","Small utilities for writing, calculating, organizing, and creating. Fast on mobile, simple on desktop, and built to grow."],
["Ferramentas a iniciar","Tools are starting"],["A verificação de acesso ainda está a iniciar. Tente novamente.","Access verification is still starting. Please try again."],["Tentar novamente","Try again"],
["É necessária uma conta","An account is required"],["Crie uma conta ou entre na sua conta Nexauren para usar as ferramentas.","Create an account or sign in to your Nexauren account to use the tools."],["Entrar ou criar conta","Sign in or create an account"],
["Não foi possível verificar o acesso","Could not verify access"],["Não conseguimos confirmar o estado do seu plano agora. Tente novamente.","We couldn't confirm your plan status right now. Please try again."],
["Ferramenta exclusiva do Pro","Pro-only tool"],["O seu plano atual não inclui esta ferramenta. Atualize para o Nexauren Pro para desbloquear o acesso.","Your current plan doesn't include this tool. Upgrade to Nexauren Pro to unlock access."],["Ir para o plano Pro","Go to Pro"],["Agora não","Not now"],["Continuar","Continue"],["Fechar","Close"],
["A preparar o catálogo…","Preparing the catalog…"],["Nenhuma categoria encontrada.","No category found."],["Não foi possível carregar o catálogo.","Could not load the catalog."],["Não foi possível iniciar as ferramentas.","Could not start the tools."],
["CATEGORIA","CATEGORY"],["Todas as categorias","All categories"],["Ferramentas da categoria","Category tools"],["Pesquisa avançada de ferramentas","Advanced tool search"],["Filtrar por palavra-chave","Filter by keyword"],["Filtrar por acesso","Filter by access"],["Todas as palavras-chave","All keywords"],["Todos os acessos","All access"],["Grátis","Free"],["Pro","Pro"],["Ordenar resultados","Sort results"],["Mais relevantes","Most relevant"],["Mais populares","Most popular"],["Nome A–Z","Name A–Z"],["Limpar filtros","Clear filters"],["Limpar pesquisa","Clear search"],["Nenhuma ferramenta encontrada.","No tools found."],["Tente outro termo, remova um filtro ou pesquise por uma funcionalidade.","Try another term, remove a filter, or search by feature."],["A categoria está pronta.","The category is ready."],["Ainda não existem ferramentas publicadas aqui.","No tools have been published here yet."],["Destaque","Featured"],["disponível","available"],["disponíveis","available"],
["PUBLICIDADE","ADVERTISEMENT"],["Publicidade","Advertisement"],
["Uma experiência mais ","A "],["rápida, elegante e útil.","faster, more elegant, more useful experience."],["O Nexauren Story reúne conteúdo editorial, ferramentas online e uma conta central numa experiência pensada para crescer sem ficar complicada.","Nexauren Story brings editorial content, online tools, and one central account together in an experience designed to grow without becoming complicated."],["Explorar ferramentas","Explore tools"],["Ler o Ferramentas","Read Tools"],["Experiência móvel","Mobile experience"],["Ferramentas online","Online tools"],["Conta Nexauren","Nexauren Account"],["Conteúdo","Content"],
["Tudo organizado para chegar ao próximo passo.","Everything organized for the next step."],["Interfaces claras, navegação direta e uma base preparada para novas ferramentas e experiências.","Clear interfaces, direct navigation, and a foundation ready for new tools and experiences."],["Abrir ferramentas","Open tools"],["Utilitários para escrever, calcular, organizar e criar, com pesquisa, categorias e acesso Free/Pro.","Utilities for writing, calculating, organizing, and creating, with search, categories, and Free/Pro access."],["Abrir conta","Open account"],["Perfil, atividade, segurança e acesso ao plano num painel central para a sua utilização.","Profile, activity, security, and plan access in one central dashboard."],
["01 · Desempenho","01 · Performance"],["Experiência leve e responsiva, com atenção ao uso no telemóvel.","A light, responsive experience designed with mobile use in mind."],["02 · Clareza","02 · Clarity"],["Menus, categorias e ações desenhados para reduzir fricção.","Menus, categories, and actions designed to reduce friction."],["03 · Evolução","03 · Evolution"],["O catálogo pode crescer sem perder a organização visual.","The catalog can grow without losing visual organization."],
["O próximo passo começa aqui.","Your next step starts here."],["Explore uma ferramenta agora ou entre na sua conta para continuar a experiência Nexauren.","Explore a tool now or sign in to continue your Nexauren experience."],["Explorar o catálogo","Explore the catalog"],["Construído para evoluir.","Built to evolve."],["Ferramentas rápidas para escrever, organizar, calcular e criar.","Fast tools for writing, organizing, calculating, and creating."],
["Ferramentas para escrever, calcular, organizar e criar.","Tools for writing, calculating, organizing, and creating."],["CATÁLOGO NEXAUREN","NEXAUREN CATALOG"],["ferramentas disponíveis","tools available"],["Pesquise, escolha uma categoria e abra a ferramenta quando precisar.","Search, choose a category, and open a tool when you need it."],["Experiência dos utilizadores","User experience"],["Veja o que está a funcionar.","See what's working."],
["A sua conta, com tudo no lugar.","Your account, everything in its place."],["Um painel central para acompanhar atividade, gerir o perfil, proteger o acesso e entrar rapidamente nas experiências Nexauren.","A central dashboard to track activity, manage your profile, protect access, and quickly reach Nexauren experiences."],["A preparar o seu espaço Nexauren…","Preparing your Nexauren space…"],["Uma conta central para ferramentas, atividade e experiências Nexauren.","One central account for tools, activity, and Nexauren experiences."],["Explorar","Explore"],["Dashboard","Dashboard"],["Plano Pro","Pro plan"],
["NEXAUREN · ACCOUNT CENTER","NEXAUREN · ACCOUNT CENTER"],["Bem-vindo de volta.","Welcome back."],["A sua conta Nexauren funciona em todo o ecossistema de ferramentas.","Your Nexauren account works across the entire tools ecosystem."],["ENTRAR","SIGN IN"],["CRIAR CONTA","CREATE ACCOUNT"],["Email","Email"],["Palavra-passe","Password"],["Confirmar palavra-passe","Confirm password"],["Nome","Name"],["Nome de apresentação","Display name"],["Entrar","Sign in"],["Criar conta","Create account"],["Continuar com Google","Continue with Google"],["Criar com Google","Sign up with Google"],["Esqueci a minha palavra-passe","Forgot my password"],["Voltar para entrar","Back to sign in"],["ou","or"],["A ligar…","Connecting…"],["A entrar…","Signing in…"],["A preparar PayPal…","Preparing PayPal…"],["Enviar recuperação","Send reset"],["Recuperação","Recovery"],["PEDIDO ENVIADO","REQUEST SENT"],["Verifique o seu email.","Check your email."],["Já confirmei","I have confirmed"],["Reenviar email","Resend email"],["Confirme o seu email","Confirm your email"],["Email verificado","Email verified"],["A sua identidade de email foi confirmada.","Your email identity has been confirmed."],["Terminar sessão","Sign out"],["Sessão","Session"],["Terminar a sessão neste dispositivo.","Sign out on this device."],
["CONTA NEXAUREN","NEXAUREN ACCOUNT"],["O seu painel Nexauren","Your Nexauren dashboard"],["Acompanhe a sua conta, perfil e acesso aos recursos Nexauren.","Track your account, profile, and access to Nexauren resources."],["Ativa","Active"],["ATIVIDADE","ACTIVITY"],["Resumo da sua conta","Your account summary"],["O histórico aparece aqui à medida que utiliza o Nexauren Story.","Your history will appear here as you use Nexauren Story."],["A carregar…","Loading…"],["Conta","Account"],["Autenticação protegida","Protected authentication"],["Acesso","Access"],["Ferramentas e recursos","Tools and resources"],["Experiência","Experience"],["Pronta para utilizar","Ready to use"],["Plano","Plan"],["Nexauren Free","Nexauren Free"],["Nexauren Pro","Nexauren Pro"],["Plano e faturação","Plan and billing"],["Gerir assinatura e recursos Pro.","Manage your subscription and Pro features."],["Abrir gestão →","Open management →"],["Consulte o seu plano, pagamento e benefícios.","View your plan, payment, and benefits."],["Gerir →","Manage →"],["Perfil","Profile"],["Informações visíveis na sua conta.","Information visible on your account."],["Guardar alterações","Save changes"],["Segurança","Security"],["Proteja o acesso à sua conta.","Protect access to your account."],["Alterar","Change"],["Fechar","Close"],["Palavra-passe atual","Current password"],["Nova palavra-passe","New password"],["Confirmar nova palavra-passe","Confirm new password"],["Atualizar palavra-passe","Update password"],["Autenticação Google","Google authentication"],["A palavra-passe é gerida pela sua conta Google.","Your password is managed by your Google account."],["Recursos","Resources"],["Aceda rapidamente ao ecossistema.","Quickly access the ecosystem."],["Utilize as ferramentas Nexauren.","Use Nexauren tools."],["Recursos e assinatura.","Features and subscription."],["Consulte os seus direitos e dados.","View your rights and data."],["Falta:","Missing:"],["✓ Palavra-passe forte.","✓ Strong password."],["As palavras-passe não coincidem.","Passwords do not match."],["Nome atualizado.","Name updated."],["Email de verificação reenviado.","Verification email resent."],["Palavra-passe atualizada com sucesso.","Password updated successfully."],["A sua conta está pronta.","Your account is ready."],["Use as ferramentas Nexauren diretamente no navegador e consulte o seu plano e faturação quando precisar.","Use Nexauren tools directly in your browser and check your plan and billing whenever you need."],["Explorar ferramentas","Explore tools"],["Dados temporariamente indisponíveis.","Data temporarily unavailable."],["Por segurança, esta página não confirma se o email está registado.","For security, this page does not confirm whether the email is registered."],
["Escolha o seu plano.","Choose your plan."],["Comece grátis ou desbloqueie os recursos Pro por $5/mês.","Start for free or unlock Pro features for $5/month."],["Escolha o seu plano","Choose your plan"],["para sempre","forever"],["Acesso às ferramentas gratuitas","Access to free tools"],["Conta Nexauren","Nexauren account"],["Recursos essenciais","Essential features"],["Plano atual","Current plan"],["Mais recursos e funcionalidades Pro à medida que forem disponibilizados.","More Pro features and capabilities as they become available."],["Recursos premium","Premium features"],["Experiências Pro","Pro experiences"],["Pagamento recorrente seguro via PayPal","Secure recurring PayPal payment"],["Assinar Pro por $5","Subscribe to Pro for $5"],["Cancelar Pro","Cancel Pro"],["Próxima cobrança:","Next billing date:"],["Pro ativo","Pro active"],["A aguardar ativação","Waiting for activation"],["A aguardar aprovação","Waiting for approval"],["Pagamento suspenso","Payment suspended"],["Cancelado","Cancelled"],["Free","Free"],["ATUAL","CURRENT"],["NEXAUREN PLANS","NEXAUREN PLANS"],["A confirmar a sua assinatura PayPal…","Confirming your PayPal subscription…"],["Assinatura Pro ativada com sucesso.","Pro subscription activated successfully."],["O PayPal recebeu a aprovação. A ativação será concluída assim que o estado da assinatura ficar ativo.","PayPal received the approval. Activation will complete when the subscription becomes active."],["O processo PayPal foi cancelado. A sua conta continua no plano Free.","The PayPal process was canceled. Your account remains on the Free plan."],["Erro ao carregar assinatura:","Error loading subscription:"],["Não foi possível abrir o PayPal.","Could not open PayPal."],["Não foi possível iniciar o pagamento.","Could not start payment."],["Não foi possível cancelar.","Could not cancel."],["Cancelar a assinatura Pro agora?","Cancel the Pro subscription now?"],
["← Início","← Home"],["NEXAUREN · LEGAL CENTER","NEXAUREN · LEGAL CENTER"],["Política de Privacidade","Privacy Policy"],["Termos de Utilização","Terms of Use"],["Política de Cookies","Cookie Policy"],["Atualizada em 22 de setembro de 2026","Updated September 22, 2026"],["Documentos","Documents"],["O que são cookies?","What are cookies?"],["Cookies e tecnologias semelhantes podem manter sessões, guardar preferências e medir o funcionamento das páginas.","Cookies and similar technologies may maintain sessions, save preferences, and measure how pages work."],["Cookies essenciais","Essential cookies"],["Alguns são necessários para autenticação e segurança.","Some are necessary for authentication and security."],["Medição","Analytics"],["Algumas páginas públicas podem utilizar ferramentas de medição para compreender visitas e melhorar a experiência.","Some public pages may use analytics tools to understand visits and improve the experience."],["Controlo","Control"],["Pode controlar ou eliminar cookies através das definições do seu navegador. Desativar cookies essenciais pode impedir algumas funcionalidades.","You can control or delete cookies through your browser settings. Disabling essential cookies may prevent some features."],["1. Visão geral","1. Overview"],["A Nexauren Story respeita a privacidade de quem utiliza os seus sites, contas e ferramentas.","Nexauren Story respects the privacy of people who use its sites, accounts, and tools."],["2. Dados","2. Data"],["Podem ser tratados nome, email, fotografia de perfil, preferências e dados necessários ao funcionamento e segurança da conta.","We may process your name, email, profile photo, preferences, and data required for account operation and security."],["3. Utilização","3. Use"],["Os dados são utilizados para autenticação, funcionamento, personalização, segurança, suporte e melhoria dos serviços.","Data is used for authentication, operation, personalization, security, support, and service improvement."],["4. Serviços técnicos","4. Technical services"],["Algumas funcionalidades dependem de fornecedores técnicos. O objetivo é limitar os dados partilhados ao necessário.","Some features depend on technical providers. The goal is to limit shared data to what is necessary."],["5. Direitos","5. Rights"],["Pode solicitar informações, correção ou eliminação dos seus dados quando aplicável.","You may request information, correction, or deletion of your data where applicable."],["6. Alterações","6. Changes"],["Esta política pode ser atualizada. A data indicada acima identifica a versão atual.","This policy may be updated. The date above identifies the current version."],["1. Aceitação","1. Acceptance"],["Ao utilizar a Nexauren Story, concorda em utilizar os serviços de forma legal, responsável e respeitosa.","By using Nexauren Story, you agree to use the services lawfully, responsibly, and respectfully."],["2. Ferramentas","2. Tools"],["As ferramentas são disponibilizadas para fins gerais e podem ser melhoradas, alteradas ou descontinuadas. Verifique resultados antes de os utilizar em decisões importantes.","Tools are provided for general purposes and may be improved, changed, or discontinued. Check results before using them for important decisions."],["3. Conta","3. Account"],["É responsável por manter os dados da sua conta corretos e por proteger o acesso à mesma.","You are responsible for keeping your account information accurate and protecting access to it."],["4. Uso proibido","4. Prohibited use"],["Não utilize os serviços para fraude, abuso, tentativa de comprometer sistemas ou violação de direitos.","Do not use the services for fraud, abuse, attempts to compromise systems, or infringement of rights."],["5. Disponibilidade","5. Availability"],["Podem ocorrer interrupções para manutenção, segurança ou outras razões técnicas.","Interruptions may occur for maintenance, security, or other technical reasons."],
["Voltar à conta","Back to account"],["Pagamento recorrente seguro via PayPal. Pode cancelar a assinatura a qualquer momento.","Secure recurring PayPal billing via PayPal. You can cancel your subscription at any time."],
["Email ou palavra-passe inválidos.","Invalid email or password."],["Esta conta está desativada.","This account is disabled."],["Este email já está associado a uma conta.","This email is already associated with an account."],["A palavra-passe não cumpre os requisitos.","The password does not meet the requirements."],["Introduza um email válido.","Enter a valid email address."],["Foram detetadas muitas tentativas. Tente novamente mais tarde.","Too many attempts were detected. Please try again later."],["Não foi possível contactar o serviço. Verifique a ligação à internet.","Could not contact the service. Check your internet connection."],["A autenticação foi cancelada.","Authentication was canceled."],["Já existe uma conta Nexauren com este email. Entre primeiro com o método usado anteriormente.","A Nexauren account already exists with this email. Sign in with the method you used previously."],["Por segurança, volte a entrar e tente novamente.","For security, sign in again and try again."],["Este método de acesso não está disponível neste momento.","This sign-in method is not available right now."],["Não foi possível concluir a operação. Tente novamente.","The operation could not be completed. Please try again."],["Introduza o seu email.","Enter your email address."],["Email e palavra-passe são obrigatórios.","Email and password are required."],["O nome precisa de pelo menos 2 caracteres.","The name must contain at least 2 characters."],["As palavras-passe não coincidem.","Passwords do not match."],["A palavra-passe precisa de","The password must include"],["Não foi possível concluir o acesso. Tente novamente.","Could not complete sign-in. Please try again."],["A janela de autenticação do Google foi fechada.","The Google sign-in window was closed."],["O navegador bloqueou a janela do Google. Tente novamente ou permita pop-ups para este site.","The browser blocked the Google window. Try again or allow pop-ups for this site."],["Não foi possível concluir o acesso. Tente novamente.","Could not complete sign-in. Please try again."],["Introduza o seu nome.","Enter your name."],["A palavra-passe precisa de 12+ caracteres, incluindo maiúscula, minúscula, número e símbolo.","The password must contain 12+ characters, including uppercase, lowercase, a number, and a symbol."]
];

const PT=new Map(PAIRS.map(([pt,en])=>[pt,en]));
const EN=new Map(PAIRS.map(([pt,en])=>[en,pt]));

function getLang(){
  const q=new URLSearchParams(location.search).get("lang");
  if(LANGS.has(q))return q;
  try{const saved=localStorage.getItem(STORAGE);if(LANGS.has(saved))return saved}catch{}
  return "en";
}
let current=getLang();
let busy=false;

function pairText(raw,lang){
  const text=String(raw??"");
  const trimmed=text.trim();
  const map=lang==="en"?PT:EN;
  if(map.has(trimmed)){
    const replacement=map.get(trimmed);
    return text.slice(0,text.indexOf(trimmed))+replacement+text.slice(text.indexOf(trimmed)+trimmed.length);
  }
  if(lang==="en"){
    if(/^Falta:\s*/.test(trimmed))return text.replace(trimmed,trimmed.replace(/^Falta:\s*/,"Missing: "));
    if(/^A preparar o histórico/.test(trimmed))return text.replace(trimmed,"Preparing history…");
    if(/^A preparar o seu espaço/.test(trimmed))return text.replace(trimmed,"Preparing your Nexauren space…");
    if(/^A carregar os planos/.test(trimmed))return text.replace(trimmed,"Loading plans…");
    if(/^A carregar assinatura/.test(trimmed))return text.replace(trimmed,trimmed.replace(/^A carregar assinatura/,"Loading subscription"));
  }else{
    if(/^Missing:\s*/.test(trimmed))return text.replace(trimmed,trimmed.replace(/^Missing:\s*/,"Falta: "));
    if(/^Preparing history/.test(trimmed))return text.replace(trimmed,"A preparar o histórico…");
    if(/^Preparing your Nexauren space/.test(trimmed))return text.replace(trimmed,"A preparar o seu espaço Nexauren…");
    if(/^Loading plans/.test(trimmed))return text.replace(trimmed,"A carregar os planos…");
    if(/^Loading subscription/.test(trimmed))return text.replace(trimmed,trimmed.replace(/^Loading subscription/,"A carregar assinatura"));
  }
  return null;
}

function translateDom(){
  if(busy)return;
  busy=true;
  try{
    document.documentElement.lang=current;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()){
      const n=walker.currentNode,parent=n.parentElement;
      if(!parent||["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","PRE","CODE"].includes(parent.tagName))continue;
      if(parent.closest('input,textarea,[contenteditable="true"]'))continue;
      nodes.push(n);
    }
    for(const n of nodes){const replacement=pairText(n.nodeValue,current);if(replacement!==null)n.nodeValue=replacement}
    document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{const r=pairText(el.getAttribute("placeholder"),current);if(r!==null)el.setAttribute("placeholder",r)});
    document.querySelectorAll("[aria-label]").forEach(el=>{const r=pairText(el.getAttribute("aria-label"),current);if(r!==null)el.setAttribute("aria-label",r)});
    updateTitle();
    updateAlternates();
  }finally{busy=false}
}

function updateTitle(){
  const p=location.pathname;
  const titles=current==="en"?{
    "/":"Nexauren Story — Content and tools",
    "/tool/":"Tools — Nexauren Story",
    "/account":"Account — Nexauren Story",
    "/account/upgrade/":"Upgrade — Nexauren Story",
    "/legal/privacidade/":"Privacy Policy — Nexauren Story",
    "/legal/termos/":"Terms of Use — Nexauren Story",
    "/legal/cookies/":"Cookie Policy — Nexauren Story"
  }:{
    "/":"Nexauren Story — Conteúdo e ferramentas",
    "/tool/":"Ferramentas — Nexauren Story",
    "/account":"Conta — Nexauren Story",
    "/account/upgrade/":"Upgrade — Nexauren Story",
    "/legal/privacidade/":"Política de Privacidade — Nexauren Story",
    "/legal/termos/":"Termos de Utilização — Nexauren Story",
    "/legal/cookies/":"Política de Cookies — Nexauren Story"
  };
  if(titles[p])document.title=titles[p];
}

function updateAlternates(){
  const base=new URL(location.pathname,location.origin).href;
  const pt=new URL(location.pathname,location.origin);pt.searchParams.set("lang","pt");
  const values={en:base,pt:pt.href,"x-default":base};
  Object.entries(values).forEach(([lang,href])=>{
    let link=document.querySelector('link[rel="alternate"][hreflang="'+lang+'"]');
    if(!link){link=document.createElement("link");link.rel="alternate";link.hreflang=lang;document.head.appendChild(link)}
    link.href=href;
  });
}
function addToggle(){
  const existing=document.querySelector("[data-nx-language-toggle]");
  const nav=document.querySelector("header nav,.nav-links,.tool-links");
  if(existing){existing.textContent=current==="en"?"PT":"EN";return}
  if(!nav)return;
  const b=document.createElement("button");
  b.type="button";
  b.className="nx-language-toggle";
  b.dataset.nxLanguageToggle="1";
  b.textContent=current==="en"?"PT":"EN";
  b.setAttribute("aria-label",current==="en"?"Switch to Portuguese":"Mudar para inglês");
  b.title=b.getAttribute("aria-label");
  b.addEventListener("click",()=>setLanguage(current==="en"?"pt":"en"));
  nav.appendChild(b);
}

function setLanguage(lang){
  if(!LANGS.has(lang))return;
  current=lang;
  try{localStorage.setItem(STORAGE,lang)}catch{}
  addToggle();
  translateDom();
  window.dispatchEvent(new CustomEvent("nexauren:language-changed",{detail:{lang}}));
}

window.NexaurenLanguage={get:()=>current,set:setLanguage,toggle:()=>setLanguage(current==="en"?"pt":"en")};

let observer;
function init(){
  addToggle();
  translateDom();
  observer=new MutationObserver(()=>translateDom());
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();