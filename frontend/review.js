let reviewWords = [];   // [{word_id, term, translation}, ...]
let reviewQueue = [];    // سؤالات ساخته‌شده از reviewWords
let reviewIndex = 0;
let reviewedWordIds = [];

// courseRouter.js هر بار currentCourse رو عوض کنه، همینو تو localStorage["userLang"]
// هم می‌ذاره — این‌جا مستقیم همون رو می‌خونیم که وابسته به ES module نباشیم
function getCourseForReview() {
  return localStorage.getItem("userLang") || "english";
}

window.onload = async function () {
  if (typeof initUserData === "function") {
    try {
      await initUserData();
    } catch (err) {
      console.warn("گرفتن اطلاعات کاربر ناموفق بود:", err);
    }
  }

  updateHeartDisplay();

  if (typeof fetchReviewWords !== "function") {
    console.error("fetchReviewWords در دسترس نیست — dataStorage.js لود نشده؟");
    return;
  }

  const courseSlug = getCourseForReview();
  reviewWords = await fetchReviewWords(courseSlug, 20);

  if (!reviewWords || reviewWords.length === 0) {
    document.getElementById("review-empty").style.display = "block";
    return;
  }

  reviewQueue = buildQuestions(reviewWords);
  document.getElementById("review-question-box").style.display = "block";
  showReviewQuestion();
};

function updateHeartDisplay() {
  const el = document.getElementById("heart-count");
  if (el && typeof getHearts === "function") {
    el.textContent = getHearts();
  }
}

function updateProgressDisplay() {
  const el = document.getElementById("review-progress");
  if (el) el.textContent = `${reviewIndex}/${reviewQueue.length}`;
}

// از هر کلمه یه سؤال چهارگزینه‌ای می‌سازه: کلمه‌ی انگلیسی رو نشون میده،
// گزینه‌ها ترجمه‌ها هستن (۱ درست + حداکثر ۳ گزینه‌ی غلط از بقیه‌ی کلمات)
function buildQuestions(words) {
  return words.map((w) => {
    const distractors = words
      .filter((other) => other.word_id !== w.word_id)
      .map((other) => other.translation);

    const wrongOptions = shuffleArray(distractors).slice(0, 3);
    const options = shuffleArray([w.translation, ...wrongOptions]);

    return {
      word_id: w.word_id,
      term: w.term,
      answer: w.translation,
      options
    };
  });
}

function showReviewQuestion() {
  if (reviewIndex >= reviewQueue.length) {
    finishReview();
    return;
  }

  updateProgressDisplay();

  const q = reviewQueue[reviewIndex];
  document.getElementById("review-question-title").textContent =
    `ترجمه‌ی «${q.term}» چیه؟`;

  const optionsBox = document.getElementById("review-options");
  optionsBox.innerHTML = "";

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt;
    btn.onclick = () => selectReviewAnswer(opt);
    optionsBox.appendChild(btn);
  });
}

// نکته‌ی مهم: اینجا هیچ‌وقت loseHeart() صدا زده نمیشه —
// جواب غلط تو مرور هیچ اثری روی قلب‌ها نداره
function selectReviewAnswer(selected) {
  const q = reviewQueue[reviewIndex];

  if (selected !== q.answer) {
    // فقط بازخورد بصری، بدون کم شدن قلب
    alert(`جواب درست: ${q.answer}`);
  }

  reviewedWordIds.push(q.word_id);
  reviewIndex++;
  showReviewQuestion();
}

async function finishReview() {
  document.getElementById("review-question-box").style.display = "none";

  let result = { hearts_earned: 0, heart_count: typeof getHearts === "function" ? getHearts() : 0 };

  if (typeof submitReviewAnswers === "function") {
    try {
      result = await submitReviewAnswers(reviewedWordIds);
    } catch (err) {
      console.warn("ثبت نتیجه‌ی مرور ناموفق بود:", err);
    }
  }

  updateHeartDisplay();

  const resultBox = document.getElementById("review-result");
  const titleEl = document.getElementById("review-result-title");
  const detailEl = document.getElementById("review-result-detail");

  if (result.hearts_earned > 0) {
    titleEl.textContent = "مرور تمام شد 🎉 یک قلب گرفتی!";
  } else {
    titleEl.textContent = "مرور تمام شد 🎉";
  }
  detailEl.textContent = `تعداد قلب فعلی: ${result.heart_count}`;

  resultBox.style.display = "block";
}

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}