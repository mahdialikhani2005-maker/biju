// این فایل به‌جای تعریف دوباره‌ی API_URL، از همون متغیری که
// config.js تعریف کرده استفاده می‌کنه (باید همیشه بعد از config.js لود بشه)
const API_BASE = `${API_URL}/api`;

let currentUser = null;
let heartsCache = 5;
let xpCache = 0;
let nextHeartSeconds = null;
let heartsFetchedAt = 0;

// ======================
// HELPER
// ======================

async function apiRequest(url, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token && !options.skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  let data = {};
  try { data = await res.json(); } catch {}

  if (!res.ok) throw new Error(data.detail || "خطای سرور");
  return data;
}

// ======================
// SESSION
// ======================

function loadUserFromStorage() {
  const saved = localStorage.getItem("user");
  if (saved) currentUser = JSON.parse(saved);
}

function saveUser(user) {
  currentUser = user;
  localStorage.setItem("user", JSON.stringify(user));

  if (user.access_token) {
    localStorage.setItem("access_token", user.access_token);
  }
}

function getToken() {
  return localStorage.getItem("access_token");
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("user");
  localStorage.removeItem("access_token");
  localStorage.removeItem("premiumUntil");
}

function getUserId() { return currentUser?.id; }
function getUserProfile() { return currentUser; }
function isLoggedIn() { return currentUser != null && !!getToken(); }

// ======================
// AUTH
// ======================

async function registerUser(data) {
  const user = await apiRequest(`${API_BASE}/register`, {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      full_name: data.name || data.full_name,
      username: data.username,
      phone_number: data.phone || data.phone_number || data.mobile,
      password: data.password
    })
  });
  saveUser(user);
  return user;
}

async function loginUser(username, password) {
  const user = await apiRequest(`${API_BASE}/login`, {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ username, password })
  });
  saveUser(user);
  return user;
}

// ======================
// PREMIUM
// ======================

function isPremium() {
  const until = localStorage.getItem("premiumUntil");
  if (!until) return false;
  return new Date(parseInt(until)) > new Date();
}

async function buyPremium(planId) {
  if (!isLoggedIn()) {
    throw new Error("ابتدا وارد حساب کاربری خود شوید");
  }

  const data = await apiRequest(`${API_BASE}/premium/buy`, {
    method: "POST",
    body: JSON.stringify({ plan: planId })
  });

  const expiresAt = new Date(data.expires_on).getTime();
  localStorage.setItem("premiumUntil", expiresAt);

  if (currentUser) {
    currentUser.premium = true;
    localStorage.setItem("user", JSON.stringify(currentUser));
  }

  return data;
}

// ======================
// HEARTS (واقعاً از سرور می‌خونه، شارژ خودکارش هم سمت سرور حساب میشه)
// ======================

async function fetchHearts() {
  if (isPremium()) {
    heartsCache = 999;
    nextHeartSeconds = null;
    return heartsCache;
  }

  if (!isLoggedIn()) {
    heartsCache = 5;
    nextHeartSeconds = null;
    return heartsCache;
  }

  try {
    const data = await apiRequest(`${API_BASE}/hearts/me`, { method: "GET" });
    heartsCache = data.heart_count;
    nextHeartSeconds = data.seconds_until_next_heart;
    heartsFetchedAt = Date.now();
  } catch (err) {
    console.error("خطا در گرفتن قلب‌ها:", err);
  }

  return heartsCache;
}

function getHearts() {
  if (isPremium()) return 999;
  return heartsCache;
}

async function loseHeart() {
  if (isPremium()) return 999;

  if (!isLoggedIn()) {
    heartsCache = Math.max(0, heartsCache - 1);
    return heartsCache;
  }

  try {
    const data = await apiRequest(`${API_BASE}/hearts/decrease`, { method: "POST" });
    heartsCache = data.remaining;
    nextHeartSeconds = data.seconds_until_next_heart;
    heartsFetchedAt = Date.now();
  } catch (err) {
    console.error("خطا در کم کردن قلب:", err);
  }

  return heartsCache;
}

// این تابع دیگه خودش قلب رو محاسبه نمی‌کنه (محاسبه سمت سرور انجام میشه)،
// فقط یه‌بار دیگه از سرور آخرین وضعیت رو می‌گیره
async function checkAndRegenHearts() {
  const before = heartsCache;
  await fetchHearts();
  return heartsCache !== before;
}

// شمارش‌معکوس نمایشی (بدون نیاز به درخواست جدید هر ثانیه)
function getTimeUntilNextHeart() {
  if (isPremium() || nextHeartSeconds === null) return null;
  const elapsedSeconds = (Date.now() - heartsFetchedAt) / 1000;
  const remaining = Math.round(nextHeartSeconds - elapsedSeconds);
  return Math.max(0, remaining);
}

// ======================
// XP (مجموع واقعی از سرور)
// ======================

async function addXP(amount, lesson_slug = "general") {
  if (!isLoggedIn()) {
    xpCache = parseInt(localStorage.getItem("xp") || "0") + amount;
    localStorage.setItem("xp", xpCache);
    return xpCache;
  }

  try {
    await apiRequest(`${API_BASE}/progress/xp`, {
      method: "POST",
      body: JSON.stringify({ lesson_slug, amount })
    });
    // بعد از ثبت، مجموع کل رو دوباره از سرور می‌گیریم که همه‌جا هماهنگ باشه
    await fetchXP();
  } catch (err) {
    console.error("خطا در ثبت XP:", err);
  }

  return xpCache;
}

async function fetchXP() {
  if (!isLoggedIn()) {
    xpCache = parseInt(localStorage.getItem("xp") || "0");
    return xpCache;
  }

  try {
    const data = await apiRequest(`${API_BASE}/progress/xp/total`, { method: "GET" });
    xpCache = data.total_xp;
  } catch (err) {
    console.error("خطا در گرفتن مجموع XP:", err);
  }

  return xpCache;
}

function getTotalXP() { return xpCache; }

// رفرش دوره‌ای قلب‌ها و XP از سرور
async function refreshUserStats() {
  await fetchHearts();
  await fetchXP();
}

// ======================
// INIT
// ======================

// اگه کاربر نه واقعی لاگین کرده نه اکانت مهمان داره، خودکار یه اکانت
// مهمان براش می‌سازه (بدون نیاز به پر کردن هیچ فرمی)
async function ensureGuestSession() {
  if (isLoggedIn()) return;

  try {
    const user = await apiRequest(`${API_BASE}/guest`, {
      method: "POST",
      skipAuth: true
    });
    saveUser(user);
  } catch (err) {
    console.error("خطا در ساخت اکانت مهمان:", err);
  }
}

async function initUserData() {
  loadUserFromStorage();
  await ensureGuestSession();
  await fetchHearts();
  await fetchXP();
}

// ======================
// GLOBAL EXPORTS
// ======================

window.initUserData = initUserData;
window.ensureGuestSession = ensureGuestSession;

window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.getToken = getToken;

window.getUserProfile = getUserProfile;
window.isLoggedIn = isLoggedIn;
window.isPremium = isPremium;
window.buyPremium = buyPremium;

window.getHearts = getHearts;
window.loseHeart = loseHeart;
window.fetchHearts = fetchHearts;

window.addXP = addXP;
window.fetchXP = fetchXP;
window.getTotalXP = getTotalXP;
window.refreshUserStats = refreshUserStats;

// ======================
// اجبار به آپدیت
// ======================

function isVersionOlder(current, required) {
  const c = String(current).split(".").map(Number);
  const r = String(required).split(".").map(Number);
  for (let i = 0; i < Math.max(c.length, r.length); i++) {
    const cv = c[i] || 0;
    const rv = r[i] || 0;
    if (cv < rv) return true;
    if (cv > rv) return false;
  }
  return false;
}

function showForceUpdateOverlay(message, updateUrl) {
  if (document.getElementById("force-update-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "force-update-overlay";
  overlay.style.cssText =
    "position:fixed; inset:0; background:rgba(0,0,0,0.94); color:#fff; " +
    "z-index:99999; display:flex; flex-direction:column; align-items:center; " +
    "justify-content:center; text-align:center; padding:32px; " +
    "font-family:sans-serif; direction:rtl;";

  overlay.innerHTML =
    '<div style="font-size:48px; margin-bottom:16px;">🔄</div>' +
    '<p style="font-size:16px; line-height:1.8; margin-bottom:24px; max-width:320px;">' +
    message +
    "</p>" +
    '<button id="force-update-btn" style="background:#58cc02; color:white; ' +
    'border:none; padding:14px 32px; border-radius:16px; font-size:16px; ' +
    'font-weight:bold; cursor:pointer;">به‌روزرسانی</button>';

  document.body.appendChild(overlay);

  document.getElementById("force-update-btn").onclick = () => {
    window.open(updateUrl, "_blank");
  };
}

// این تابع رو باید تو home.html (نقطه‌ی ورود اپ) صدا زد
async function checkForForcedUpdate() {
  try {
    const res = await fetch(
      "https://mahdialikhani2005-maker.github.io/bijo-app/version.json",
      { cache: "no-store" }
    );
    if (!res.ok) return;

    const data = await res.json();

    if (typeof APP_VERSION !== "undefined" && isVersionOlder(APP_VERSION, data.min_version)) {
      showForceUpdateOverlay(data.message, data.update_url);
    }
  } catch (err) {
    console.warn("چک کردن نسخه‌ی اپ ناموفق بود:", err);
  }
}

window.checkForForcedUpdate = checkForForcedUpdate;

// آیا کاربر فعلی یه اکانت مهمانه (نه ثبت‌نام واقعی)؟
function isGuestUser() {
  return !!(currentUser && currentUser.role === "guest");
}

window.isGuestUser = isGuestUser;