/**
 * script.js
 * ----------
 * UI + content-based рекомендации с переключателем метрики (Cosine / Jaccard).
 * Всегда выводим ТОП-5 и показываем значения сходства в скобках.
 * Зависит от data.js: movies, ratings, loadData()
 */

const TOP_N = 5;

/* Канонический список 18 жанров (как в data.js, без 'unknown') */
const GENRES_18 = [
  'Action', 'Adventure', 'Animation', "Children's", 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror', 'Musical',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

/* Быстрый доступ жанр -> индекс */
const GENRE_TO_IDX = Object.fromEntries(GENRES_18.map((g, i) => [g, i]));

/**
 * Преобразуем список жанров фильма в бинарный вектор длины 18.
 * 1 — жанр присутствует, 0 — нет.
 */
function toGenreVector(genres) {
  const v = new Array(GENRES_18.length).fill(0);
  if (!Array.isArray(genres)) return v;
  for (const g of genres) {
    const idx = GENRE_TO_IDX[g];
    if (idx != null) v[idx] = 1;
  }
  return v;
}

/**
 * Косинусное сходство для бинарных векторов одинаковой длины.
 * cos(A,B) = (A·B) / (||A|| * ||B||)
 * Для нулевых векторов возвращаем 0.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Жаккар для бинарных векторов.
 * J(A,B) = |A ∩ B| / |A ∪ B|
 * Здесь |A ∩ B| = dot (т.к. бинарные векторы),
 * |A| = сумма единиц в A, |B| = сумма единиц в B, |A ∪ B| = |A| + |B| − dot
 */
function jaccardSimilarity(a, b) {
  let dot = 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai & bi;   // 0/1: побитовое И = умножение
    sumA += ai;
    sumB += bi;
  }
  const union = sumA + sumB - dot;
  if (union === 0) return 0;
  return dot / union;
}

/** Получить выбранную метрику из радио-кнопок */
function getSelectedMetric() {
  const el = document.querySelector('input[name="metric"]:checked');
  return el ? el.value : 'cosine';
}

/** Красивое имя метрики для выдачи */
function metricLabel(metric) {
  return metric === 'jaccard' ? 'Jaccard' : 'Cosine';
}

/** Формат значения сходства: 3 знака после запятой */
function fmt(score) {
  return Number.isFinite(score) ? score.toFixed(3) : '0.000';
}

window.onload = (async function () {
  const status = document.getElementById('result');
  if (status) status.innerText = 'Loading data…';

  try {
    await loadData();               // 1) Загружаем данные
    populateMoviesDropdown();       // 2) Заполняем селект
    if (status) status.innerText = 'Data loaded. Please select a movie.';
  } catch (e) {
    // Ошибка уже показана в loadData()
  }
})();

/**
 * Заполняем выпадающий список фильмами (по алфавиту).
 */
function populateMoviesDropdown() {
  const select = document.getElementById('movie-select');
  if (!select) return;

  select.innerHTML = '';

  const sorted = [...movies].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  );

  for (const m of sorted) {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.title;
    select.appendChild(opt);
  }
}

/**
 * Рекомендации с выбранной метрикой.
 * Всегда печатаем TOP_N фильмов и показываем значения сходства в скобках:
 * Title (0.873), Title (0.812), ...
 */
function getRecommendations() {
  const resultEl = document.getElementById('result');
  const select = document.getElementById('movie-select');
  if (!select || !resultEl) return;

  const selectedVal = select.value;
  if (!selectedVal) {
    resultEl.innerText = 'Please choose a movie first.';
    return;
  }
  const selectedId = Number.parseInt(selectedVal, 10);

  const likedMovie = movies.find((m) => m.id === selectedId);
  if (!likedMovie) {
    resultEl.innerText = 'Selected movie was not found. Please try another.';
    return;
  }

  const metric = getSelectedMetric(); // 'cosine' | 'jaccard'

  // Вектор жанров выбранного фильма
  const likedVec = toGenreVector(likedMovie.genres);

  // Кандидаты — все остальные фильмы
  const candidateMovies = movies.filter((m) => m.id !== likedMovie.id);

  // Выбираем функцию сходства
  const simFn = metric === 'jaccard' ? jaccardSimilarity : cosineSimilarity;

  // Считаем сходство
  const scoredMovies = candidateMovies.map((cand) => {
    const candVec = toGenreVector(cand.genres);
    const score = simFn(likedVec, candVec);
    return { ...cand, score };
  });

  // Сортировка: по сходству убыв., при равенстве — по алфавиту
  scoredMovies.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  const topN = scoredMovies.slice(0, TOP_N);

  if (topN.length === 0) {
    resultEl.innerText = `We couldn't find any similar titles to "${likedMovie.title}". Try another movie.`;
  } else {
    const listText = topN
      .map((x) => `${x.title} (${fmt(x.score)})`)
      .join(', ');

    resultEl.innerText =
      `Because you liked "${likedMovie.title}", we recommend (${metricLabel(metric)}): ` +
      listText;
  }
}
