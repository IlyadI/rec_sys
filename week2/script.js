/**
 * script.js
 * ----------
 * Handles UI initialization and content-based recommendation logic.
 * Depends on globals & functions from data.js: movies, ratings, loadData()
 */

window.onload = (async function () {
  const status = document.getElementById('result');
  if (status) status.innerText = 'Loading data…';

  try {
    // 1) Load data from local files (via data.js)
    await loadData();

    // 2) Populate UI
    populateMoviesDropdown();

    // 3) Update status
    if (status) status.innerText = 'Data loaded. Please select a movie.';
  } catch (e) {
    // loadData already wrote an error to #result, nothing else to do
  }
})();

/**
 * populateMoviesDropdown
 * Sorts movies alphabetically and fills the <select> with options.
 */
function populateMoviesDropdown() {
  const select = document.getElementById('movie-select');
  if (!select) return;

  // Clear existing
  select.innerHTML = '';

  // Sort by title (ascending, case-insensitive)
  const sorted = [...movies].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  );

  // Create <option> nodes
  for (const m of sorted) {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.title;
    select.appendChild(opt);
  }
}

/**
 * getRecommendations
 * Main content-based filtering using Jaccard similarity over genre sets.
 *
 * Steps (per spec):
 * 1) Read selected movie id
 * 2) Find likedMovie
 * 3) Prepare genre Set and candidate list
 * 4) Score candidates by Jaccard Index
 * 5) Sort by score desc
 * 6) Take top 2
 * 7) Display message
 */
function getRecommendations() {
  const resultEl = document.getElementById('result');
  const select = document.getElementById('movie-select');

  if (!select || !resultEl) return;

  // Step 1: get user selection
  const selectedVal = select.value;
  if (!selectedVal) {
    resultEl.innerText = 'Please choose a movie first.';
    return;
  }
  const selectedId = Number.parseInt(selectedVal, 10);

  // Step 2: find liked movie
  const likedMovie = movies.find((m) => m.id === selectedId);
  if (!likedMovie) {
    resultEl.innerText = 'Selected movie was not found. Please try another.';
    return;
  }

  // Step 3: prepare genre sets and candidates
  const likedSet = new Set(likedMovie.genres || []);
  const candidateMovies = movies.filter((m) => m.id !== likedMovie.id);

  // Step 4: score by Jaccard similarity
  const scoredMovies = candidateMovies.map((cand) => {
    const candSet = new Set(cand.genres || []);

    // Intersection size
    let intersectCount = 0;
    for (const g of likedSet) {
      if (candSet.has(g)) intersectCount++;
    }

    // Union size = |A| + |B| - |A∩B|
    const unionSize = likedSet.size + candSet.size - intersectCount;

    // Handle edge-case: if both sets are empty, treat score as 0
    const score = unionSize === 0 ? 0 : intersectCount / unionSize;

    return { ...cand, score };
  });

  // Step 5: sort by score (desc), stable tie-breaker by title asc
  scoredMovies.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  // Step 6: top N (2 per spec)
  const topN = scoredMovies.slice(0, 2);

  // Step 7: display result
  if (topN.length === 0) {
    resultEl.innerText = `We couldn't find any similar titles to "${likedMovie.title}". Try another movie.`;
  } else {
    const recTitles = topN.map((x) => x.title).join(', ');
    resultEl.innerText = `Because you liked "${likedMovie.title}", we recommend: ${recTitles}`;
  }
}
