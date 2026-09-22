import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
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
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = initializeAuth(firebaseApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});
auth.languageCode = "pt-BR";

export async function syncWithWorker(user) {
  if (!user) return null;
  const idToken = await user.getIdToken();
  const response = await fetch("/api/account/sync", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Authorization": "Bearer " + idToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      display_name: user.displayName || "",
      photo_url: user.photoURL || ""
    })
  });
  const data = await response.json().catch(() => ({ ok: false, error: "Resposta inválida do servidor." }));
  if (!response.ok) {
    const error = new Error(data.error || "Não foi possível sincronizar a conta.");
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function workerFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("É necessário iniciar sessão.");

  const request = async (forceRefresh = false) => {
    const idToken = await user.getIdToken(forceRefresh);
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", "Bearer " + idToken);
    if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Resposta inválida do servidor." }));
    return { response, data };
  };

  let { response, data } = await request(false);
  if (!response.ok && (response.status === 401 || data?.code === "FIREBASE_TOKEN_INVALID")) {
    ({ response, data } = await request(true));
  }

  if (!response.ok) {
    const detail = data?.details ? " — " + data.details : "";
    const error = new Error((data.error || "Pedido não concluído.") + detail);
    error.code = data.code;
    error.details = data.details || null;
    throw error;
  }
  return data;
}

export {
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
  signOut
};
