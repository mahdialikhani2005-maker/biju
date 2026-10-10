// -------------------------------------------------------------
// هر بار که یه تغییر مهم (که باید رو گوشی کاربرا جایگزین بشه) دادی،
// این عدد رو زیاد کن. با همین یه خط، خودکار کش قدیمی پاک میشه و
// دیگه لازم نیست از کاربر بخوای Clear Data کنه.
// نکته: باید هماهنگ با LESSON_CACHE_NAME تو lessonDownloader.js باشه
// -------------------------------------------------------------
const SHELL_CACHE_NAME = 'bijo-shell-v3';
const CURRENT_LESSON_CACHE_NAME = 'bijo-lessons-v3';

const urlsToCache = [
  '/',
  '/home.html',
  '/Login.html',
  '/style.css',
  '/main.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // نسخه‌ی جدید بدون معطلی فعال بشه
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== SHELL_CACHE_NAME && name !== CURRENT_LESSON_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // فقط درخواست‌های هم‌مبدأ (فایل‌های خودِ اپ) رو کش کن.
  // درخواست‌های به سرورهای دیگه (مثل بک‌اند رو Render) رو دست‌نخورده
  // مستقیم بذار برن شبکه، وگرنه POST/PUT به API خراب میشه.
  if (url.origin !== self.location.origin) {
    return;
  }

  // فقط GET رو کش کن (POST/PUT/DELETE اصلاً نباید کش بشن)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});