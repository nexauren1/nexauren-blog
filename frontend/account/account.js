const FIREBASE_SDK_VERSION = "12.19.0";
const FIREBASE_APP_URL = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/firebase-app.js";
const FIREBASE_AUTH_URL = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/firebase-auth.js";

const root = document.querySelector("[data-account-app]");
const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const $ = (selector, scope = document) => scope.querySelector(selector);

let firebaseAuth;
let authApi;

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
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Vamos tentar pelo redirecionamento.",
    "auth/popup-closed-by-user": "A janela de autenticação foi fechada.",
    "auth/cancelled-popup-request": "A autenticação foi cancelada.",
    "auth/account-exists-with-different-credential": "Já existe uma conta Nexauren com este email. Entre com o método usado anteriormente.",
    "auth/requires-recent-login": "Por segurança, volte a entrar e tente novamente.",
    "auth/operation-not-allowed": "Este método de autenticação ainda não está ativado no Firebase.",
    "auth/unauthorized-domain": "Este domínio ainda não foi autorizado no Firebase Authentication."
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

function providerLabel(user) {
  const ids = (user?.providerData || []).map((p) => p.providerId);
  if (ids.includes("google.com") && ids.includes("password")) return "Google + email";
  if (ids.includes("google.com")) return "Google";
  if (ids.includes("password")) return "Email e palavra-passe";
  return "Firebase Authentication";
}

function messageBox(type, message, id = "message") {
  return '<div class="' + type + '" id="' + id + '" role="status">' + esc(message) + "</div>";
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
      <button class="primary" type="submit">Entrar</button>
      <button class="google" id="google-login" type="button"><span class="google-g">G</span> Continuar com Google</button>
      <div class="form-links"><button type="button" class="link-button" data-forgot>Esqueci a minha palavra-passe</button></div>
      <div class="error" id="error" role="alert"></div>
      <p class="hint">A autenticação desta página é exclusiva da conta Nexauren e não dá acesso à administração editorial.</p>
    </form>
  `;
  wireTabs();
  wireLogin();
}

function registerView(notice = "") {
  root.innerHTML = tabs("register") + `
    <div class="auth-heading">
      <div class="eyebrow">CRIAR CONTA</div>
      <h2>Crie o seu acesso Nexauren.</h2>
      <p>Uma identidade para usar ferramentas, preferências e recursos personalizados no futuro.</p>
    </div>
    ${notice ? messageBox("success", notice) : ""}
    <form id="register-form" novalidate>
      <label>Nome<input id="name" type="text" autocomplete="name" maxlength="80" required></label>
      <label>Email<input id="email" type="email" inputmode="email" autocomplete="email" required></label>
      <label>Palavra-passe<input id="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
      <div class="password-rules" id="password-rules">Use 12+ caracteres, incluindo maiúscula, minúscula, número e símbolo.</div>
      <label>Confirmar palavra-passe<input id="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
      <button class="primary" type="submit">Criar conta</button>
      <button class="google" id="google-register" type="button"><span class="google-g">G</span> Criar com Google</button>
      <div class="error" id="error" role="alert"></div>
      <p class="hint">Depois do cadastro, enviaremos uma mensagem para confirmar o seu email.</p>
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
      <div class="hint-box">Por segurança, a mensagem apresentada não confirma se existe uma conta com o email indicado.</div>
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
      await authApi.sendPasswordResetEmail(firebaseAuth, email, {
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

function userView(user) {
  const provider = providerLabel(user);
  const hasPasswordProvider = (user.providerData || []).some((p) => p.providerId === "password");

  root.innerHTML = `
    <div class="account-user">
      <div class="eyebrow">CONTA ATIVA</div>
      <div class="user-box">
        <div class="avatar">${esc((user.displayName || user.email || "N").slice(0, 1).toUpperCase())}</div>
        <div class="identity">
          <div class="user-name">${esc(user.displayName || "Utilizador Nexauren")}</div>
          <div class="user-email">${esc(user.email || "")}</div>
          <span class="provider-badge">${esc(provider)}</span>
        </div>
      </div>

      ${verificationPanel(user)}

      <section class="account-section">
        <div class="section-title"><strong>Perfil</strong><span>Informações básicas da conta</span></div>
        <form id="profile-form" class="mini-form" novalidate>
          <label>Nome de apresentação<input id="display-name" type="text" maxlength="80" value="${esc(user.displayName || "")}" autocomplete="name" required></label>
          <button class="secondary" type="submit">Guardar nome</button>
          <div class="inline-feedback" id="profile-feedback"></div>
        </form>
      </section>

      ${hasPasswordProvider ? `
      <section class="account-section">
        <div class="section-title"><strong>Palavra-passe</strong><span>Proteja o acesso à conta</span></div>
        <form id="password-form" class="mini-form" novalidate>
          <label>Palavra-passe atual<input id="current-password" type="password" autocomplete="current-password" required></label>
          <label>Nova palavra-passe<input id="new-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
          <div class="password-rules" id="change-password-rules">12+ caracteres, maiúscula, minúscula, número e símbolo.</div>
          <label>Confirmar nova palavra-passe<input id="new-password-confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
          <button class="secondary" type="submit">Atualizar palavra-passe</button>
          <div class="inline-feedback" id="password-feedback"></div>
        </form>
      </section>` : `
      <section class="account-section">
        <div class="section-title"><strong>Palavra-passe</strong><span>Gerida pelo Google</span></div>
        <p class="hint">Esta conta usa o Google para autenticação. A palavra-passe é gerida diretamente pela sua conta Google.</p>
      </section>`}

      <div class="account-actions">
        <button class="logout" id="logout">Terminar sessão</button>
      </div>
      <p class="hint">Esta conta pertence ao ecossistema Nexauren. A administração editorial do blog continua separada.</p>
    </div>
  `;

  $("#logout").onclick = async () => {
    try {
      await authApi.signOut(firebaseAuth);
    } catch (err) {
      alert(friendlyError(err));
    }
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
      await authApi.updateProfile(firebaseAuth.currentUser, { displayName });
      feedback.className = "inline-feedback success-text";
      feedback.textContent = "Nome atualizado.";
      setTimeout(() => {
        if (firebaseAuth.currentUser) userView(firebaseAuth.currentUser);
      }, 500);
    } catch (err) {
      feedback.className = "inline-feedback error-text";
      feedback.textContent = friendlyError(err);
    }
  });

  const resend = $("#resend-verification");
  if (resend) {
    resend.onclick = async () => {
      const feedback = $("#verification-feedback");
      feedback.textContent = "";
      try {
        await authApi.sendEmailVerification(firebaseAuth.currentUser);
        feedback.className = "inline-feedback success-text";
        feedback.textContent = "Email de verificação reenviado.";
      } catch (err) {
        feedback.className = "inline-feedback error-text";
        feedback.textContent = friendlyError(err);
      }
    };
  }

  const refresh = $("#refresh-verification");
  if (refresh) {
    refresh.onclick = async () => {
      const feedback = $("#verification-feedback");
      feedback.textContent = "";
      try {
        await firebaseAuth.currentUser.reload();
        userView(firebaseAuth.currentUser);
      } catch (err) {
        feedback.className = "inline-feedback error-text";
        feedback.textContent = friendlyError(err);
      }
    };
  }

  const passwordForm = $("#password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const feedback = $("#password-feedback");
      feedback.className = "inline-feedback";
      feedback.textContent = "";

      const currentPassword = $("#current-password").value;
      const newPassword = $("#new-password").value;
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
        const credential = authApi.EmailAuthProvider.credential(firebaseAuth.currentUser.email, currentPassword);
        await authApi.reauthenticateWithCredential(firebaseAuth.currentUser, credential);
        await authApi.updatePassword(firebaseAuth.currentUser, newPassword);
        feedback.className = "inline-feedback success-text";
        feedback.textContent = "Palavra-passe atualizada com sucesso.";
        passwordForm.reset();
      } catch (err) {
        feedback.className = "inline-feedback error-text";
        feedback.textContent = friendlyError(err);
      }
    });
  }
}

function wireTabs() {
  root.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.tab === "login") loginView();
      else registerView();
    });
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
    try {
      await authApi.signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err) {
      error.textContent = friendlyError(err);
    }
  });
  $("#google-login").onclick = () => googleSignIn($("#error"));
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
    if (!email) {
      error.textContent = "Introduza um email válido.";
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
      const credential = await authApi.createUserWithEmailAndPassword(firebaseAuth, email, pass);
      await authApi.updateProfile(credential.user, { displayName: name });
      try {
        await authApi.sendEmailVerification(credential.user);
      } catch (verificationError) {
        console.warn("Nexauren email verification", verificationError);
      }
    } catch (err) {
      error.textContent = friendlyError(err);
    }
  });

  $("#google-register").onclick = () => googleSignIn($("#error"));
}

async function googleSignIn(errorTarget) {
  errorTarget.textContent = "";
  const provider = new authApi.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    if (isMobile) {
      await authApi.signInWithRedirect(firebaseAuth, provider);
      return;
    }
    await authApi.signInWithPopup(firebaseAuth, provider);
  } catch (err) {
    if (String(err?.code || "") === "auth/popup-blocked") {
      try {
        await authApi.signInWithRedirect(firebaseAuth, provider);
        return;
      } catch (redirectError) {
        errorTarget.textContent = friendlyError(redirectError);
        return;
      }
    }
    errorTarget.textContent = friendlyError(err);
  }
}

async function loadFirebase() {
  const [{ initializeApp }, auth] = await Promise.all([
    import(FIREBASE_APP_URL),
    import(FIREBASE_AUTH_URL)
  ]);
  const { firebaseConfig } = await import("/account/firebase-config.js");

  const app = initializeApp(firebaseConfig);
  authApi = auth;
  firebaseAuth = auth.getAuth(app);
  firebaseAuth.languageCode = "pt-BR";

  await auth.setPersistence(firebaseAuth, auth.browserLocalPersistence);

  try {
    await auth.getRedirectResult(firebaseAuth);
  } catch (err) {
    console.warn("Nexauren Google redirect", err);
  }

  auth.onAuthStateChanged(firebaseAuth, (user) => {
    if (user) userView(user);
    else loginView();
  });
}

root.innerHTML = '<div class="account-loading">A carregar o Firebase Authentication…</div>';
loadFirebase().catch((err) => {
  console.error(err);
  root.innerHTML = '<div class="error">Não foi possível carregar a autenticação Nexauren. Verifique a configuração do Firebase e tente novamente.</div>';
});