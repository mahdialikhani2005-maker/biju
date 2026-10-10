/* courseRouter.js
   مسئول:
   - تعیین کورس فعال (english/french/...)
   - هماهنگ کردن userLang و currentCourse
   - وایر کردن نب‌بار مشترک همه‌ی صفحات (مرور، پروفایل، پیشرفت، درس)
*/

const STORAGE_KEY = "duolingo_app_data"; // مطابق dataStorage.js

const SUPPORTED_COURSES = [
  "english", "french", "spanish", "german", "italian",
  "turkish", "arabic", "russian", "japanese", "korean", "chinese"
];

function getAllDataSafe() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAllDataSafe(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** گرفتن کورس فعلی از dataStorage (منبع اصلی) */
export function getCurrentCourse() {
  const data = getAllDataSafe();
  if (data && data.currentCourse) return data.currentCourse;

  // اگه هنوز چیزی ست نشده، از userLang هم می‌تونیم بخونیم (سازگاری قدیمی)
  const fromUserLang = localStorage.getItem("userLang");
  if (fromUserLang && SUPPORTED_COURSES.includes(fromUserLang)) return fromUserLang;

  return "english";
}

/** ست کردن کورس فعلی + همگام‌سازی userLang */
export function setCurrentCourse(course) {
  const normalized = SUPPORTED_COURSES.includes(course) ? course : "english";

  let data = getAllDataSafe();
  if (!data) {
    data = {
      global: { hearts: 5, streak: 0, lastHeartUpdate: null },
      courses: {},
      currentCourse: "english"
    };
  }

  data.currentCourse = normalized;
  saveAllDataSafe(data);

  // همگام‌سازی با dataStorage.js / review.js
  localStorage.setItem("userLang", normalized);
}

/**
 * وایر کردن نب‌بار مشترک.
 * انتظار: تو HTML این ۴ آیدی وجود داشته باشن (هر چندتاش که تو اون صفحه هست):
 *  #nav-lesson   -> <course>/index.html      (لیست درس‌ها)
 *  #nav-review   -> /review.html             (مرور)
 *  #nav-progress -> <course>/progress.html   (آمار XP/دل)
 *  #nav-profile  -> /profile.html            (پروفایل)
 *
 * همه‌ی مسیرها absolute (شروع با /) هستن، پس فرقی نمی‌کنه صفحه‌ی فعلی
 * چقدر تو دایرکتوری‌ها عمیق باشه (english/index.html, ...).
 */
export function wireBottomNav() {
  const course = getCurrentCourse();

  const nav = {
    lesson: document.querySelector("#nav-lesson"),
    review: document.querySelector("#nav-review"),
    progress: document.querySelector("#nav-progress"),
    profile: document.querySelector("#nav-profile")
  };

  if (nav.lesson) nav.lesson.setAttribute("href", `/${course}/index.html`);
  if (nav.progress) nav.progress.setAttribute("href", `/${course}/progress.html`);
  if (nav.review) nav.review.setAttribute("href", "/review.html");
  if (nav.profile) nav.profile.setAttribute("href", "/profile.html");

  // فعال کردن آیتم صفحه‌ی فعلی
  Object.values(nav).forEach((el) => el && el.classList.remove("active"));

  const path = (location.pathname.split("/").pop() || "").toLowerCase();

  if (path === "review.html") {
    nav.review && nav.review.classList.add("active");
  } else if (path === "profile.html") {
    nav.profile && nav.profile.classList.add("active");
  } else if (path === "progress.html") {
    nav.progress && nav.progress.classList.add("active");
  } else if (path === "index.html") {
    nav.lesson && nav.lesson.classList.add("active");
  }
}

/**
 * وقتی وارد صفحه‌ای می‌شویم که "وابسته به کورس" است (مثلا لیست درس‌های فرانسوی)
 * می‌توانیم از طریق query مثل ?course=french کورس را ست کنیم.
 */
export function applyCourseFromQuery() {
  const params = new URLSearchParams(location.search);
  const course = params.get("course");
  if (course && SUPPORTED_COURSES.includes(course)) {
    setCurrentCourse(course);
  }
}

/**
 * تشخیص خودکار دوره از رو خودِ مسیر صفحه — مثلاً وقتی از home.html
 * رو کارت «فرانسوی» می‌زنی و میری french/index.html، هیچ query
 * پارامتری نیست، ولی همینجا از رو اولین بخش مسیر (french) تشخیص
 * می‌دیم که دوره‌ی فعلی عوض شده.
 */
export function applyCourseFromPath() {
  const firstSegment = location.pathname.split("/").filter(Boolean)[0];
  if (firstSegment && SUPPORTED_COURSES.includes(firstSegment)) {
    setCurrentCourse(firstSegment);
  }
}

// اجرای خودکار
document.addEventListener("DOMContentLoaded", () => {
  applyCourseFromQuery();
  applyCourseFromPath();
  wireBottomNav();
});