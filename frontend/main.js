// دیتابیس دوره‌ها
const COURSES = {
  en: {
    id: 'en',
    name: 'انگلیسی',
    nativeName: 'English',
    flag: 'assets/en.png',
    path: 'english/index.html',
    color: '#1cb0f6'
  },
  fr: {
    id: 'fr',
    name: 'فرانسوی',
    nativeName: 'Français',
    flag: 'assets/fr.png',
    path: 'french/index.html',
    color: '#ce82ff'
  }
};

// نمایش دوره‌ها
function renderCourses() {
  const grid = document.getElementById('course-grid');
  
  let html = '';
  for (let courseId in COURSES) {
    const course = COURSES[courseId];
    html += `
      <div class="course-card" onclick="selectCourse('${course.id}')">
        <img src="${course.flag}" alt="${course.name}">
        <h3>${course.name}</h3>
        <p>${course.nativeName}</p>
      </div>
    `;
  }
  
  grid.innerHTML = html;
}

// انتخاب دوره
function selectCourse(courseId) {
  localStorage.setItem('currentCourse', courseId);
  window.location.href = COURSES[courseId].path;
}

// اجرا بعد از لود صفحه
document.addEventListener('DOMContentLoaded', renderCourses);


fetch("http://192.168.1.20:5000/api/hello")
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
// فرض کنید تابع saveSettings در dataStorage.js وجود دارد
// window.saveSettings = async function(settings) { ... }

const saveButton = document.getElementById('save-settings-btn');
const feedbackDiv = document.getElementById('settings-feedback');

async function handleSaveSettings() {
    const currentSettings = { /* ... دریافت تنظیمات فعلی از فیلدها ... */ }; // باید این قسمت رو کامل کنی

    // نمایش وضعیت لودینگ
    saveButton.disabled = true;
    feedbackDiv.innerHTML = '<div class="spinner"></div> در حال ذخیره تنظیمات...';
    feedbackDiv.className = 'feedback-message loading'; // تنظیم کلاس برای نمایش
    feedbackDiv.style.display = 'flex'; // نمایش div

    try {
        // فرض می‌کنیم تابع saveSettings یک Promise برمی‌گرداند
        // اگر تابع شما synchronous است، نیازی به await نیست
        const result = await window.saveSettings(currentSettings); // جایگزین کنید با تابع واقعی شما

        // نمایش پیام موفقیت
        feedbackDiv.innerHTML = 'تنظیمات با موفقیت ذخیره شد.';
        feedbackDiv.className = 'feedback-message success';
        setTimeout(() => { // مخفی کردن پیام بعد از چند ثانیه
            feedbackDiv.style.display = 'none';
            saveButton.disabled = false; // فعال کردن دوباره دکمه
        }, 3000);

    } catch (error) {
        // نمایش پیام خطا
        console.error("خطا در ذخیره تنظیمات:", error);
        feedbackDiv.innerHTML = `خطا در ذخیره: ${error.message || 'خطای ناشناخته'}`;
        feedbackDiv.className = 'feedback-message error';
        // دکمه را فعال می‌کنیم تا کاربر دوباره تلاش کند
        saveButton.disabled = false;
    }
}

// اطمینان از اینکه تابع saveSettings وجود دارد
if (saveButton && typeof window.saveSettings === 'function') {
    saveButton.addEventListener('click', handleSaveSettings);
} else if (saveButton) {
    // اگر تابع وجود نداشت، دکمه را غیرفعال کن و پیام بده
    saveButton.disabled = true;
    feedbackDiv.innerHTML = 'خطا: تابع ذخیره تنظیمات در دسترس نیست.';
    feedbackDiv.className = 'feedback-message error';
    feedbackDiv.style.display = 'block';
}

// ----- همین منطق رو برای لود کردن تنظیمات اولیه هم میشه پیاده کرد -----

async function loadSettings() {
    const settingsDiv = document.getElementById('settings-form'); // فرض کنید فرم تنظیمات داخل این div است
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'spinner';
    settingsDiv.innerHTML = ''; // پاک کردن محتوای قبلی
    settingsDiv.appendChild(loadingIndicator);
    settingsDiv.innerHTML += ' در حال بارگذاری تنظیمات...';

    try {
        const settings = await window.getSettings(); // تابع فرضی برای گرفتن تنظیمات
        // حالا تنظیمات رو در فرم نمایش بده
        // ... کد پر کردن فیلدها ...
        settingsDiv.innerHTML = 'تنظیمات با موفقیت بارگذاری شد.'; // نمایش پیام موقت
        setTimeout(() => {
             // بعد از چند ثانیه، محتوای واقعی فرم رو نمایش بده
             // یا فقط لودینگ رو پاک کن
             settingsDiv.innerHTML = `
                <input type="text" value="${settings.username || ''}" placeholder="نام کاربری">
                <input type="email" value="${settings.email || ''}" placeholder="ایمیل">
                <!-- ... بقیه فیلدها ... -->
             `;
             // دکمه ذخیره رو هم فعال کن
             if (saveButton) saveButton.disabled = false;

        }, 1000);

    } catch (error) {
        console.error("خطا در بارگذاری تنظیمات:", error);
        settingsDiv.innerHTML = `خطا در بارگذاری تنظیمات: ${error.message || 'خطای ناشناخته'}`;
        if (saveButton) saveButton.disabled = true; // اگر لود نشد، دکمه ذخیره غیرفعال باشه
    }
}

// اگر صفحه profile.html باشه، تابع loadSettings رو فراخوانی کن
// document.addEventListener('DOMContentLoaded', () => {
//     if (document.getElementById('save-settings-btn')) { // چک کن که این صفحه هستیم
//         loadSettings();
//     }
// });
