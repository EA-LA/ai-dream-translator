/* =============================
   PLAN / USAGE — FULL ENTITLEMENTS (FREE/LITE/STANDARD/PRO)
   Replace the previous PLAN/USAGE block with THIS one.
   ============================= */

// --- Plan config (edit to match your pricing) ---
const ENTITLEMENTS = {
  free: {
    label: "Free",
    daily: { interpret: 2, art: 1 },
    lensesUnlocked: ["psychological"],
    features: {
      export: false,
      tags: false,
      historySearch: false,
      weeklyInsights: false,
      commercial: false,
      priority: "none",
      hdArt: false,
      voiceToDream: false,
      customPrompts: false,
      multilingual: false,
      earlyAccess: false,
      teamSeats: 0,
    },
  },
  lite: {
    label: "Lite",
    daily: { interpret: 8, art: 3 },
    lensesUnlocked: ["psychological", "symbolic"],
    features: {
      export: true,
      tags: true,
      historySearch: false,
      weeklyInsights: false,
      commercial: "lite",
      priority: "lite",
      hdArt: false,
      voiceToDream: false,
      customPrompts: false,
      multilingual: false,
      earlyAccess: false,
      teamSeats: 0,
    },
  },
  standard: {
    label: "Standard",
    daily: { interpret: Infinity, art: 10 },
    lensesUnlocked: ["psychological", "symbolic", "cultural", "spiritual"],
    features: {
      export: true,
      tags: true,
      historySearch: true,
      weeklyInsights: true,
      commercial: true,
      priority: "std",
      hdArt: false,
      voiceToDream: false,
      customPrompts: false,
      multilingual: false,
      earlyAccess: true,
      teamSeats: 0,
    },
  },
  pro: {
    label: "Pro",
    daily: { interpret: Infinity, art: 150 },
    lensesUnlocked: ["psychological", "symbolic", "cultural", "spiritual"],
    features: {
      export: true,
      tags: true,
      historySearch: true,
      weeklyInsights: true,
      commercial: true,
      priority: "max",
      hdArt: true,
      voiceToDream: true,     // placeholder lock/unlock
      customPrompts: true,    // placeholder lock/unlock
      multilingual: true,     // placeholder lock/unlock
      earlyAccess: true,
      teamSeats: 2,
    },
  },
};

// --- storage keys reused from step 1 ---
const USAGE_KEY = "adt_usage";
const PLAN_KEY  = "adt_plan";

// Allow plan override via URL: ?plan=lite|standard|pro (handy for testing)
(function planFromQuery(){
  const p = new URLSearchParams(location.search).get("plan");
  if (p && ENTITLEMENTS[p]) localStorage.setItem(PLAN_KEY, p);
})();

function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getPlan() { return localStorage.getItem(PLAN_KEY) || "free"; }
function setPlan(p) { if (ENTITLEMENTS[p]) localStorage.setItem(PLAN_KEY, p); }

function getUsage() {
  const raw = localStorage.getItem(USAGE_KEY);
  const today = dayKey();
  if (!raw) return { date: today, interpret: 0, art: 0 };
  try {
    const u = JSON.parse(raw);
    return (u.date === today) ? u : { date: today, interpret: 0, art: 0 };
  } catch {
    return { date: today, interpret: 0, art: 0 };
  }
}
function saveUsage(u) { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); }

// limits
function currentLimits(){ return ENTITLEMENTS[getPlan()]?.daily || { interpret: 0, art: 0 }; }
function hasQuota(action) {
  const lim = currentLimits();
  const u = getUsage();
  const used = u[action] || 0;
  const max = lim[action];
  return (max === Infinity) || (used < max);
}
function requireQuota(action) {
  const plan = getPlan();
  if (hasQuota(action)) return true;
  const lim = currentLimits()[action];
  const msg = action === "interpret"
    ? `Limit reached: ${ENTITLEMENTS[plan].label} allows ${lim === Infinity ? 'unlimited' : lim} interpretations/day.`
    : `Limit reached: ${ENTITLEMENTS[plan].label} allows ${lim === Infinity ? 'unlimited' : lim} dream-art/day.`;
  alert(msg + "\nVisit Pricing to upgrade.");
  return false;
}
function recordUsage(action) {
  const u = getUsage();
  u[action] = (u[action] || 0) + 1;
  saveUsage(u);
  updateUsageUI();
}

// Update Settings “Current cycle” tiles if present
function updateUsageUI() {
  const plan = getPlan();
  const u = getUsage();
  const lim = currentLimits();
  const boxes = document.querySelectorAll(".stat-box p"); // 0: interpretations, 1: art
  if (boxes[0]) boxes[0].textContent = `${u.interpret || 0} / ${lim.interpret === Infinity ? "∞" : lim.interpret}`;
  if (boxes[1]) boxes[1].textContent = `${u.art || 0} / ${lim.art === Infinity ? "∞" : lim.art}`;

  // Optional: show plan name somewhere
  const planBadges = document.querySelectorAll("[data-plan-badge]");
  planBadges.forEach(el => el.textContent = ENTITLEMENTS[plan].label);
}

// Lock/unlock features by attribute, e.g. <button data-feature="export">...</button>
// Add [data-lens="psychological|symbolic|cultural|spiritual"] on your lens tabs/buttons
function applyFeatureLocks() {
  const plan = getPlan();
  const cfg = ENTITLEMENTS[plan];

  // Features
  document.querySelectorAll("[data-feature]").forEach(el => {
    const key = el.getAttribute("data-feature");
    const val = cfg.features[key];
    const allowed = (val === true) || (typeof val === "string") || (typeof val === "number" && val > 0);
    el.classList.toggle("locked", !allowed);
    el.toggleAttribute("aria-disabled", !allowed);
    if (!allowed) {
      el.addEventListener("click", (e)=>{ e.preventDefault(); alert("Upgrade to unlock this feature."); }, { once:true });
    }
  });

  // Lenses
  const allowedLenses = new Set(cfg.lensesUnlocked.map(s=>s.toLowerCase()));
  document.querySelectorAll("[data-lens]").forEach(el => {
    const lens = (el.getAttribute("data-lens") || "").toLowerCase();
    const ok = allowedLenses.has(lens);
    el.classList.toggle("locked", !ok);
    el.toggleAttribute("aria-disabled", !ok);
    if (!ok) {
      el.addEventListener("click", (e)=>{ e.preventDefault(); alert("Upgrade to unlock this lens."); }, { once:true });
    }
  });
}

// HD art toggle (Pro). If you add a checkbox with id="hdArtToggle" it will work immediately.
(function wireHdArt(){
  const t = document.getElementById("hdArtToggle");
  if (!t) return;
  const plan = getPlan();
  const allowed = !!ENTITLEMENTS[plan].features.hdArt;
  t.checked = allowed;
  t.disabled = !allowed;
})();

// Rewire the guards to use updated limits (same buttons as step 1)
function wireGuardsV2() {
  const interpretTargets = [
    document.getElementById("interpretBtn"),
    document.getElementById("interpretBtn2")
  ].filter(Boolean);
  interpretTargets.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!requireQuota("interpret")) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      setTimeout(() => recordUsage("interpret"), 0);
    }, true);
  });

  const artTargets = [
    document.getElementById("imageBtn"),
    document.getElementById("generateBtn")
  ].filter(Boolean);
  artTargets.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!requireQuota("art")) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      setTimeout(() => recordUsage("art"), 0);
    }, true);
  });
}

// Expose a tiny helper so you can simulate upgrades in your browser console:
// window.setPlanForTesting('lite'|'standard'|'pro'|'free')
window.setPlanForTesting = function(p){
  if (!ENTITLEMENTS[p]) return alert("Unknown plan: " + p);
  setPlan(p);
  updateUsageUI();
  applyFeatureLocks();
  alert("Plan set to: " + ENTITLEMENTS[p].label);
};

// Boot
(function initPlans(){
  if (!localStorage.getItem(PLAN_KEY)) setPlan("free");
  updateUsageUI();
  applyFeatureLocks();
  wireGuardsV2();

  // Midnight rollover
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,1);
  setTimeout(() => {
    saveUsage({ date: dayKey(), interpret: 0, art: 0 });
    updateUsageUI();
  }, midnight - now);
})();