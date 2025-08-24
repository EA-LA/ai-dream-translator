// auth.js (CDN module version, no npm needed)

// --- Firebase v12 CDN imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut as fbSignOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc, setDoc, getDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- YOUR Firebase config (from console) ---
const firebaseConfig = {
  apiKey: "AIzaSyBjoLNuLEFwEZURiZAj_O3q-YXu4kug2eM",
  authDomain: "ai-dream-translator.firebaseapp.com",
  projectId: "ai-dream-translator",
  storageBucket: "ai-dream-translator.firebasestorage.app",
  messagingSenderId: "684674852759",
  appId: "1:684674852759:web:732de7d510e70187de06d2",
  measurementId: "G-CPZLDSPPGK"
};

// --- Init ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helpers ---
const el  = (id) => document.getElementById(id);
const msg = (text) => {
  const m = el("authMsg");
  if (m) { m.textContent = text; m.style.color = "#b9c7e6"; }
};

// --- SIGN UP ---
async function signUp(e){
  if (e) e.preventDefault();
  try{
    msg("Creating account…");
    const name  = (el("su-name")?.value || "").trim();
    const email = (el("su-email")?.value || "").trim();
    const pass  = el("su-pass")?.value || "";

    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // profile display name
    if (name) { await updateProfile(cred.user, { displayName: name }); }

    // create a user doc (optional)
    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        name: name || "",
        email,
        createdAt: serverTimestamp()
      });
    } catch {}

    // email verify, then sign out (require verify before login)
    await sendEmailVerification(cred.user);
    await fbSignOut(auth);
    msg("Account created! Check your email to verify, then sign in.");

  }catch(error){
    msg(error.message || "Error creating account.");
  }
}

// --- SIGN IN ---
async function signIn(e){
  if (e) e.preventDefault();
  try{
    msg("Signing in…");
    const email = (el("si-email")?.value || "").trim();
    const pass  = el("si-pass")?.value || "";

    const { user } = await signInWithEmailAndPassword(auth, email, pass);

    if (!user.emailVerified){
      // send (again) and sign out
      await sendEmailVerification(user);
      await fbSignOut(auth);
      msg("We sent a verification email. Please verify, then sign in.");
      return;
    }

    // OK → go to member home
    window.location.href = "dashboard.html";

  }catch(error){
    msg(error.message || "Sign in failed.");
  }
}

// --- FORGOT PASSWORD ---
async function resetPass(e){
  if (e) e.preventDefault();
  const email = (el("si-email")?.value || "").trim() || prompt("Enter your account email:");
  if (!email) return;
  try{
    await sendPasswordResetEmail(auth, email);
    msg("Password reset email sent. Check your inbox.");
  }catch(error){
    msg(error.message || "Could not send reset email.");
  }
}

// --- SIGN OUT ---
async function doSignOut(e){
  if (e) e.preventDefault();
  await fbSignOut(auth);
  window.location.href = "signin.html";
}

// --- PAGE GUARD (protect pages that require auth) ---
function protectPage(){
  const needsAuth = document.body?.hasAttribute("data-requires-auth") || document.documentElement?.hasAttribute("data-requires-auth");
  if (!needsAuth) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user){
      window.location.href = "signin.html";
      return;
    }
    // Fill a few fields if they exist
    const who = el("whoami");
    if (who) who.textContent = user.displayName || user.email;

    try{
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data() || {};
      if (el("s-name"))  el("s-name").value  = data.name  || user.displayName || "";
      if (el("s-email")) el("s-email").value = user.email || "";
    }catch{}
  });
}

// --- Save profile (optional) ---
async function saveProfile(e){
  if (e) e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const name = (el("s-name")?.value || "").trim();
  try{
    await updateProfile(user, { displayName: name });
    try{
      await setDoc(doc(db, "users", user.uid), { name, email: user.email }, { merge: true });
    }catch{}
    alert("Saved!");
  }catch(err){
    alert(err.message || "Could not save");
  }
}

// expose to window for inline handlers
window.signUp     = signUp;
window.signIn     = signIn;
window.resetPass  = resetPass;
window.doSignOut  = doSignOut;
window.saveProfile= saveProfile;

// run guard if the page requires auth
document.addEventListener("DOMContentLoaded", protectPage);
