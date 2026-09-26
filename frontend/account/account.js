import {
  auth,
  onAuthStateChanged,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  linkWithCredential,
  signOut,
  syncWithWorker
} from "/account/account-client.js?v=20260922-3";
const root = document.querySelector("[data-account-app]");
const $ = (selector, scope = document) => scope.querySelector(selector);
let redirectError = null;
let syncing = false;
let pendingGoogleCredential = null;

const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function friendlyError(error) {
  const code = String(error?.code || "");
  const messages = {
    "auth/invalid-credential": "Email ou palavra-passe inválidos.",
    "auth/invalid-login-credentials": "Email ou palavra-passe inválidos.",
    "auth/user-disabled": "Esta conta está desativada.",
    "auth/email-already-in-use": "Este email já está associado a uma conta.",
    "auth/weak-password": "A palavra-passe não cumpre os requisitos.",
    "auth/invalid-email": "Introduza um email válido.",
    "auth/too-many-requests": "Foram detetadas muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed": "Não foi possível contactar o serviço. Verifique a ligação à internet.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Tente novamente ou permita pop-ups para este site.",
    "auth/popup-closed-by-user": "A janela de autenticação do Google foi fechada.",
    "auth/cancelled-popup-request": "A autenticação foi cancelada.",
    "auth/account-exists-with-different-credential": "Já existe uma conta Nexauren com este email. Entre primeiro com o método usado anteriormente.",
    "auth/requires-recent-login": "Por segurança, volte a entrar e tente novamente.",
    "auth/operation-not-allowed": "Este método de acesso não está disponível neste momento.",
    "auth/unauthorized-domain": "O acesso com Google ainda não está disponível neste domínio.",
    "auth/web-storage-unsupported": "O armazenamento do navegador não está disponível. Abra o Nexauren Story num navegador normal, não numa janela privada bloqueada.",
    "auth/internal-error": "Não foi possível concluir o acesso. Tente novamente.",
    "auth/operation-not-supported-in-this-environment": "Este navegador não conseguiu abrir a janela de acesso. Vamos tentar uma alternativa."
  };
  return messages[code] || "Não foi possível concluir a operação. Tente novamente.";
}

function passwordPolicy(password) {
  const checks = [
    [password.length >= 12, "12 caracteres"],
    [/[a-z]/.test(password), "uma letra minúscula"],
    [/[A-Z]/.test(password), "uma letra maiúscula"],
    [/\d/.test(password), "um número"],
    [/[^A-Za-z0-9]/.test(password), "um símbolo"]
  ];
  return checks.filter(([, ok]) => !ok).map(([, label]) => label);
}

function messageBox(type, message, id = "message") {
  return '<div class="' + type + '" id="' + id + '" role="status">' + esc(message) + "</div>";
}

function setBusy(button, busy, busyText, normalText) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? busyText : normalText;
}

function tabs(active) {
  return `
    <div class="account-tabs" role="tablist" aria-label="Autenticação Nexauren">
      <button type="button" role="tab" aria-selected="${active === "login"}" data-tab="login" class="${active === "login" ? "active" : ""}">Entrar</button>
      <button type="button" role="tab" aria-selected="${active === "register"}" data-tab="register" class="${active === "register" ? "active" : ""}">Criar conta</button>
    </div>
  `;
}

function loginView(prefill = "", notice = "") {
  root.innerHTML = tabs("login") + `
    <div class="auth-heading">
      <div class="eyebrow">ENTRAR</div>
      <h2>Bem-vindo de volta.</h2>
      <p>A sua conta Nexauren funciona em todo o ecossistema de ferramentas.</p>
    </div>
    ${notice ? messageBox("success", notice) : ""}
    <form id="login-form" novalidate>
      <label>Email<input id="email" type="email" inputmode="email" autocomplete="email" value="${esc(prefill)}" required></label>
      <label>Palavra-passe<input id="password" type="password" autocomplete="current-password" required></label>
      <button class="primary" id="email-login" type="submit">Entrar</button>
      <div class="form-divider"><span>ou</span></div>
      <button class="google" id="google-login" type="button"><svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.54 13.84A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.32-1.84V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.52Z"/><path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.17 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.39l3.24 2.52C7.31 7.85 9.46 6.13 12 6.13Z"/></svg> Continuar com Google</button>
      <div class="form-links"><button type="button" class="link-button" data-forgot>Esqueci a minha palavra-passe</button></div>
      <div class="error" id="error" role="alert"></div>
    </form>
  `;
  wireTabs();
  wireLogin();
}

function registerView() {
  root.innerHTML = tabs("register") + `
    <div class="auth-heading">
      <div class="eyebrow">CRIAR CONTA</div>
      <h2>Crie o seu acesso Nexauren.</h2>
      <p>Uma identidade para usar ferramentas, preferências e recursos personalizados.</p>
    </div>
    <form id="register-form" novalidate>
      <label>Nome<input id="name" type="text" autocomplete="name" maxlength="80" required></label>
      <label>Email<input id="email" type="email" inputmode="email" autocomplete="email" required></label>
      <label>Palavra-passe<input id="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
      <div class="password-rules" id="password-rules">Use 12+ caracteres, incluindo maiúscula, minúscula, número e símbolo.</div>
      <label>Confirmar palavra-passe<input id="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
      <button class="primary" type="submit">Criar conta</button>
      <div class="form-divider"><span>ou</span></div>
      <button class="google" id="google-register" type="button"><svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.54 13.84A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.32-1.84V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.52Z"/><path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.17 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.39l3.24 2.52C7.31 7.85 9.46 6.13 12 6.13Z"/></svg> Criar com Google</button>
      <div class="error" id="error" role="alert"></div>
      <p class="hint">Vamos enviar uma mensagem para confirmar o seu email. A conta fica disponível no ecossistema Nexauren.</p>
    </form>
  `;
  wireTabs();
  wireRegister();
}

function forgotView(prefill = "") {
  root.innerHTML = `
    <button type="button" class="back-button" data-back-login>← Voltar para entrar</button>
    <div class="auth-heading">
      <div class="eyebrow">RECUPERAÇÃO</div>
      <h2>Esqueceu a palavra-passe?</h2>
      <p>Introduza o email da sua conta e enviaremos as instruções para criar uma nova palavra-passe.</p>
    </div>
    <form id="forgot-form" novalidate>
      <label>Email<input id="email" type="email" inputmode="email" autocomplete="email" value="${esc(prefill)}" required></label>
      <button class="primary" type="submit">Enviar recuperação</button>
      <div class="error" id="error" role="alert"></div>
      <div class="hint-box">Por segurança, esta página não confirma se o email está registado.</div>
    </form>
  `;
  $("[data-back-login]").onclick = () => loginView(prefill);
  $("#forgot-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = $("#error");
    error.textContent = "";
    const email = $("#email").value.trim();
    if (!email) {
      error.textContent = "Introduza o seu email.";
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email, {
        url: "https://nexaurenstory.com/account",
        handleCodeInApp: false
      });
      root.innerHTML = `
        <div class="success-large">
          <div class="success-icon">✓</div>
          <div class="eyebrow">PEDIDO ENVIADO</div>
          <h2>Verifique o seu email.</h2>
          <p>Se o endereço estiver associado a uma conta Nexauren, receberá as instruções de recuperação.</p>
          <button type="button" class="primary" data-back-login>Voltar para entrar</button>
        </div>
      `;
      $("[data-back-login]").onclick = () => loginView(email);
    } catch (err) {
      error.textContent = friendlyError(err);
    }
  });
}

function verificationPanel(user) {
  if (user.emailVerified) {
    return `<div class="verified"><span>✓</span><div><strong>Email verificado</strong><small>A sua identidade de email foi confirmada.</small></div></div>`;
  }
  return `
    <div class="verification">
      <div><strong>Confirme o seu email</strong><small>Enviámos uma mensagem de verificação para <b>${esc(user.email || "")}</b>.</small></div>
      <div class="verification-actions">
        <button type="button" class="secondary" id="resend-verification">Reenviar email</button>
        <button type="button" class="link-button" id="refresh-verification">Já confirmei</button>
      </div>
      <div class="inline-feedback" id="verification-feedback"></div>
    </div>
  `;
}

function userView(user, syncMessage = "") {
  const hasPasswordProvider = (user.providerData || []).some((p) => p.providerId === "password");
  root.classList.add("account-dashboard-host");
  root.innerHTML = `
    <div class="account-dashboard-v2">
      <aside class="account-sidebar" aria-label="Definições da conta">
        <div class="account-sidebar-profile">
          <div class="avatar">${user.photoURL ? '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">': esc((user.displayName || user.email || "N").slice(0, 1).toUpperCase())}</div>
          <div><strong>${esc(user.displayName || "Utilizador Nexauren")}</strong><span>${esc(user.email || "")}</span></div>
        </div>
        <nav class="account-side-nav">
          <a class="active" href="#account-overview">Visão geral</a>
          <a href="#account-profile">Perfil</a>
          <a href="#account-security">Segurança</a>
          <a href="/account/upgrade/">Plano Pro</a>
        </nav>
        <div class="account-side-footer">
          <a href="/tool/">Ferramentas</a>
          <a href="/legal/privacidade/">Privacidade</a>
        </div>
      </aside>

      <div class="account-main">
        <header class="account-main-head" id="account-overview">
          <div>
            <div class="account-kicker">CONTA NEXAUREN</div>
            <h2>Definições da conta</h2>
            <p>Gira o seu perfil, segurança e acesso aos recursos Nexauren.</p>
          </div>
          <span class="account-state"><i></i> Ativa</span>
        </header>

        ${syncMessage ? messageBox("success", syncMessage) : ""}
        ${verificationPanel(user)}

        <section class="account-block">
          <div class="account-block-head">
            <div><h3>Plano e faturação</h3><p>Gerir assinatura e recursos Pro.</p></div>
            <a href="/account/upgrade/" class="account-text-link">Abrir gestão →</a>
          </div>
          <a class="account-pro-card" href="/account/upgrade/">
            <span class="pro-icon">N</span>
            <span><strong>Nexauren Pro</strong><small>Consulte o seu plano, pagamento e benefícios.</small></span>
            <b>Gerir →</b>
          </a>
        </section>

        <div class="account-two-col">
          <section class="account-block" id="account-profile">
            <div class="account-block-head"><div><h3>Perfil</h3><p>Informações visíveis na sua conta.</p></div></div>
            <form id="profile-form" class="mini-form" novalidate>
              <label>Nome de apresentação<input id="display-name" type="text" maxlength="80" value="${esc(user.displayName || "")}" autocomplete="name" required></label>
              <button class="secondary" type="submit">Guardar alterações</button>
              <div class="inline-feedback" id="profile-feedback" aria-live="polite"></div>
            </form>
          </section>

          <section class="account-block" id="account-security">
            <div class="account-block-head">
              <div><h3>Segurança</h3><p>Proteja o acesso à sua conta.</p></div>
              ${hasPasswordProvider ? '<button type="button" class="section-toggle" aria-expanded="false">Alterar</button>' : ""}
            </div>
            ${hasPasswordProvider ? `
            <form id="password-form" class="mini-form password-form-shell" novalidate hidden>
              <label>Palavra-passe atual<input id="current-password" type="password" autocomplete="current-password" required></label>
              <label>Nova palavra-passe<input id="new-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
              <div class="password-rules" id="change-password-rules">12+ caracteres, maiúscula, minúscula, número e símbolo.</div>
              <label>Confirmar nova palavra-passe<input id="new-password-confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
              <button class="secondary" type="submit">Atualizar palavra-passe</button>
              <div class="inline-feedback" id="password-feedback" aria-live="polite"></div>
            </form>
            ` : '<div class="security-note"><span>✓</span><div><strong>Autenticação Google</strong><p>A palavra-passe é gerida pela sua conta Google.</p></div></div>'}
          </section>
        </div>

        <section class="account-block account-resources">
          <div class="account-block-head"><div><h3>Recursos</h3><p>Aceda rapidamente ao ecossistema.</p></div></div>
          <div class="resource-links">
            <a href="/tool/"><span><b>Ferramentas</b><small>Utilize as ferramentas Nexauren.</small></span><b>→</b></a>
            <a href="/account/upgrade/"><span><b>Plano Pro</b><small>Recursos e assinatura.</small></span><b>→</b></a>
            <a href="/legal/privacidade/"><span><b>Privacidade</b><small>Consulte os seus direitos e dados.</small></span><b>→</b></a>
          </div>
        </section>

        <section class="account-session">
          <div><strong>Sessão</strong><span>Terminar a sessão neste dispositivo.</span></div>
          <button class="logout" id="logout">Terminar sessão</button>
        </section>
      </div>
    </div>
  `;

  $("#logout").onclick = async () => {
    try { await signOut(auth); } catch (err) { alert(friendlyError(err)); }
  };

  $("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const feedback = $("#profile-feedback");
    feedback.className = "inline-feedback";
    feedback.textContent = "";
    const displayName = $("#display-name").value.trim();
    if (displayName.length < 2) {
      feedback.className = "inline-feedback error-text";
      feedback.textContent = "O nome precisa de pelo menos 2 caracteres.";
      return;
    }
    try {
      await updateProfile(auth.currentUser, { displayName });
      await syncWithWorker(auth.currentUser);
      feedback.className = "inline-feedback success-text";
      feedback.textContent = "Nome atualizado.";
      setTimeout(() => auth.currentUser && userView(auth.currentUser), 400);
    } catch (err) {
      feedback.className = "inline-feedback error-text";
      feedback.textContent = friendlyError(err);
    }
  });

  const resend = $("#resend-verification");
  if (resend) resend.onclick = async () => {
    const feedback = $("#verification-feedback");
    feedback.textContent = "";
    try {
      await sendEmailVerification(auth.currentUser);
      feedback.className = "inline-feedback success-text";
      feedback.textContent = "Email de verificação reenviado.";
    } catch (err) {
      feedback.className = "inline-feedback error-text";
      feedback.textContent = friendlyError(err);
    }
  };

  const refresh = $("#refresh-verification");
  if (refresh) refresh.onclick = async () => {
    const feedback = $("#verification-feedback");
    feedback.textContent = "";
    try { await auth.currentUser.reload(); userView(auth.currentUser); }
    catch (err) { feedback.className = "inline-feedback error-text"; feedback.textContent = friendlyError(err); }
  };

  const passwordForm = $("#password-form");
  if (passwordForm) {
    const toggle = passwordForm.closest(".account-block")?.querySelector(".section-toggle");
    if (toggle) toggle.onclick = () => {
      const open = !passwordForm.hidden;
      passwordForm.hidden = open;
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.textContent = open ? "Alterar" : "Fechar";
    };
    const newPasswordInput = $("#new-password");
    newPasswordInput.addEventListener("input", () => {
      const missing = passwordPolicy(newPasswordInput.value);
      const rules = $("#change-password-rules");
      rules.textContent = missing.length ? "Falta: " + missing.join(", ") + "." : "✓ Palavra-passe forte.";
      rules.className = "password-rules " + (missing.length ? "" : "valid");
    });
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const feedback = $("#password-feedback");
      feedback.className = "inline-feedback";
      feedback.textContent = "";
      const currentPassword = $("#current-password").value;
      const newPassword = newPasswordInput.value;
      const confirm = $("#new-password-confirm").value;
      const missing = passwordPolicy(newPassword);
      if (missing.length) {
        feedback.className = "inline-feedback error-text";
        feedback.textContent = "Falta: " + missing.join(", ") + ".";
        return;
      }
      if (newPassword !== confirm) {
        feedback.className = "inline-feedback error-text";
        feedback.textContent = "As palavras-passe não coincidem.";
        return;
      }
      try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        feedback.className = "inline-feedback success-text";
        feedback.textContent = "Palavra-passe atualizada com sucesso.";
        passwordForm.reset();
        passwordForm.hidden = true;
        toggle?.setAttribute("aria-expanded", "false");
        if (toggle) toggle.textContent = "Alterar";
      } catch (err) {
        feedback.className = "inline-feedback error-text";
        feedback.textContent = friendlyError(err);
      }
    });
  }
}

function wireTabs() {
  root.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => button.dataset.tab === "login" ? loginView() : registerView());
  });
  const forgot = $("[data-forgot]");
  if (forgot) forgot.onclick = () => forgotView($("#email")?.value || "");
}

function wireLogin() {
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = $("#error");
    error.textContent = "";
    const email = $("#email").value.trim();
    const password = $("#password").value;
    if (!email || !password) {
      error.textContent = "Email e palavra-passe são obrigatórios.";
      return;
    }
    const button = $("#email-login");
    setBusy(button, true, "A entrar…", "Entrar");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (pendingGoogleCredential) {
        const pending = pendingGoogleCredential;
        pendingGoogleCredential = null;
        try {
          await linkWithCredential(result.user, pending);
        } catch (linkError) {
          if (String(linkError?.code || "") !== "auth/provider-already-linked") {
            console.warn("Nexauren Google link", linkError);
          }
        }
      }
    } catch (err) {
      setBusy(button, false, "A entrar…", "Entrar");
      error.textContent = friendlyError(err);
    }
  });
  $("#google-login").onclick = () => googleSignIn($("#google-login"), $("#error"));
}

function wireRegister() {
  const password = $("#password");
  password.addEventListener("input", () => {
    const missing = passwordPolicy(password.value);
    $("#password-rules").textContent = missing.length ? "Falta: " + missing.join(", ") + "." : "✓ Palavra-passe forte.";
    $("#password-rules").className = "password-rules " + (missing.length ? "" : "valid");
  });

  $("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = $("#error");
    error.textContent = "";
    const name = $("#name").value.trim();
    const email = $("#email").value.trim();
    const pass = $("#password").value;
    const confirm = $("#confirm").value;
    const missing = passwordPolicy(pass);
    if (name.length < 2) {
      error.textContent = "O nome precisa de pelo menos 2 caracteres.";
      return;
    }
    if (missing.length) {
      error.textContent = "A palavra-passe precisa de " + missing.join(", ") + ".";
      return;
    }
    if (pass !== confirm) {
      error.textContent = "As palavras-passe não coincidem.";
      return;
    }
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(credential.user, { displayName: name });
      try { await sendEmailVerification(credential.user); } catch (err) { console.warn("Nexauren verification", err); }
    } catch (err) {
      error.textContent = friendlyError(err);
    }
  });
  $("#google-register").onclick = () => googleSignIn($("#google-register"), $("#error"));
}

async function googleSignIn(button, errorTarget) {
  errorTarget.textContent = "";
  const normalText = button?.id === "google-register" ? "Criar com Google" : "Continuar com Google";
  setBusy(button, true, "A ligar…", normalText);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    // Popup first: it avoids the cross-origin redirect/storage issues that can
    // affect mobile browsers. Redirect remains a fallback when a popup is blocked.
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = String(err?.code || "");

    if (code === "auth/account-exists-with-different-credential") {
      const credential = GoogleAuthProvider.credentialFromError(err);
      if (credential) pendingGoogleCredential = credential;
      const email = String(err?.customData?.email || "");
      setBusy(button, false, "A ligar…", normalText);
      errorTarget.textContent = email
        ? "Já existe uma conta com " + email + ". Entre com email e palavra-passe para associar o Google."
        : "Já existe uma conta com este email. Entre com o método usado anteriormente para continuar.";
      return;
    }

    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      errorTarget.textContent = "O Google não conseguiu abrir a janela de acesso. Toque novamente para tentar.";
    } else {
      errorTarget.textContent = friendlyError(err);
    }

    setBusy(button, false, "A ligar…", normalText);
  }
}

function renderAccountError(error) {
  root.innerHTML = `
    <div class="success-large">
      <div class="error" role="alert">${esc(friendlyError(error))}</div>
      <button type="button" class="primary" id="reload-account">Tentar novamente</button>
    </div>
  `;
  $("#reload-account").onclick = () => location.reload();
}

async function init() {
  root.innerHTML = '<div class="account-loading">A carregar…</div>';

  try {
    await getRedirectResult(auth);
  } catch (err) {
    redirectError = err;
    console.error("Nexauren auth redirect", err);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      loginView("", redirectError ? friendlyError(redirectError) : "");
      redirectError = null;
      return;
    }

    let syncMessage = "";
    if (!syncing) {
      syncing = true;
      try {
        const result = await syncWithWorker(user);
        if (result?.created) syncMessage = "Conta criada com sucesso.";
      } catch (err) {
        console.error("Nexauren account sync", err);
        syncMessage = "Sincronização: " + (err?.message || "erro desconhecido") + (err?.code ? " [" + err.code + "]" : "");
      } finally {
        syncing = false;
      }
    }

    userView(user, syncMessage);
  });
}

init().catch((err) => renderAccountError(err));