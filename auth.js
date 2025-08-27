// auth.js (load with: <script type="module" src="auth.js"></script>)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// --- Your Firebase project config ---
const firebaseConfig = {
  apiKey: "AIzaSyBjoLNuLEFwEZURiZAj_O3q-YXu4kug2eM",
  authDomain: "ai-dream-translator.firebaseapp.com",
  projectId: "ai-dream-translator",
  storageBucket: "ai-dream-translator.firebasestorage.app",
  messagingSenderId: "684674852759",
  appId: "1:684674852759:web:732de7d510e70187de06d2"
};
// ------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function el(id) { return document.getElementById(id); }
function msg(text, isError = false) {
  const m = el('authMsg');
  if (!m) return;
  m.textContent = text;
  m.style.color = isError ? '#ffb3b3' : '#cfe5ff';
}

function humanizeError(codeOrMsg = "") {
  const code = String(codeOrMsg || "").toLowerCase();
  if (code.includes("invalid-credential")) return "Email or password is incorrect, or this domain is not authorized in Firebase.";
  if (code.includes("user-not-found")) return "No account found with that email.";
  if (code.includes("wrong-password")) return "Incorrect password.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again later.";
  if (code.includes("network-request-failed")) return "Network error. Check your connection.";
  if (code.includes("email-already-in-use")) return "That email is already registered.";
  return codeOrMsg; // fallback
}

// Make the auth instance available if needed elsewhere
window._auth = auth;

// --- Sign in ---
window.signIn = async (e) => {
  e.preventDefault();
  try {
    const email = el('si-email').value.trim();
    const pass  = el('si-pass').value;
    msg("Signing in…");
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    if (!user.emailVerified) {
      msg("Check your inbox and verify your email before signing in.", true);
      await signOut(auth);
      return;
    }

    // Redirect
    if (window._afterLogin) window._afterLogin();
    else window.location.href = "dashboard.html";
  } catch (err) {
    msg(humanizeError(err.code || err.message), true);
  }
};

// --- Sign up ---
window.signUp = async (e) => {
  e.preventDefault();
  try {
    const name  = el('su-name')?.value?.trim() || "";
    const email = el('su-email').value.trim();
    const pass  = el('su-pass').value;
    msg("Creating your account…");

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) { try { await updateProfile(cred.user, { displayName: name }); } catch(_){} }

    await sendEmailVerification(cred.user);
    msg("Verification email sent. Please verify, then sign in.");
    await signOut(auth);
  } catch (err) {
    msg(humanizeError(err.code || err.message), true);
  }
};

// --- Forgot password ---
window.resetPass = async (e) => {
  e.preventDefault();
  try {
    const email = el('si-email').value.trim();
    if (!email) { msg("Enter your email above first.", true); return; }
    msg("Sending reset link…");
    await sendPasswordResetEmail(auth, email);
    msg("Reset link sent. Check your email.");
  } catch (err) {
    msg(humanizeError(err.code || err.message), true);
  }
};

// Optional: reflect auth state (e.g., tweak nav)
onAuthStateChanged(auth, (user) => {
  // You can update UI if you want. We just no-op here.
});
