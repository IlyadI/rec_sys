/**
 * data.js
 * ----------
 * Responsible for loading and parsing local data files:
 *  - u.item (movie metadata + genre flags)
 *  - u.data (user ratings)
 *
 * Exposes:
 *  - Global arrays: movies, ratings
 *  - loadData(): async loader
 *  - parseItemData(text), parseRatingData(text)
 */

/* Global state (intentionally using let for potential future reassignments) */
let movies = [];
let ratings = [];

/**
 * loadData
 * Async function to fetch and parse local files.
 * Assumes 'u.item' and 'u.data' are placed next to index.html.
 */
async function loadData() {
  try {
    // Load and parse u.item (movie metadata & genres)
    const itemRes = await fetch('u.item');
    if (!itemRes.ok) throw new Error(`Failed to fetch u.item (${itemRes.status})`);
    const itemText = await itemRes.text();
    parseItemData(itemText);

    // Load and parse u.data (ratings)
    const dataRes = await fetch('u.data');
    if (!dataRes.ok) throw new Error(`Failed to fetch u.data (${dataRes.status})`);
    const dataText = await dataRes.text();
    parseRatingData(dataText);
  } catch (err) {
    // Display a user-friendly error message in the UI result area
    const target = document.getElementById('result');
    if (target) {
      target.innerText = `Error loading data: ${err.message}`;
    }
    throw err;
  }
}

/**
 * parseItemData
 * Parses the raw text from 'u.item' into the global `movies` array.
 *
 * - MovieLens 100k 'u.item' has 19 binary genre flags at the end:
 *   [unknown, Action, Adventure, Animation, Children's, Comedy, Crime,
 *    Documentary, Drama, Fantasy, Film-Noir, Horror, Musical, Mystery,
 *    Romance, Sci-Fi, Thriller, War, Western]
 *
 * - The specification asks to define 18 genre names starting from "Action"
 *   through "Western", skipping the leading "unknown". We therefore map
 *   the last 19 fields but ignore index 0 (unknown) when building the genre list.
 */
function parseItemData(text) {
  const GENRES_18 = [
    'Action', 'Adventure', 'Animation', "Children's", 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror', 'Musical',
    'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
  ];

  movies = []; // reset in case of re-parse

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('|');
    const idRaw = parts[0];
    const titleRaw = parts[1];
    if (typeof idRaw === 'undefined' || typeof titleRaw === 'undefined') continue;

    const id = Number.parseInt(idRaw, 10);
    const title = titleRaw.trim();

    const flagsStartIndex = parts.length - 19;
    if (flagsStartIndex < 0) continue; // malformed line

    const genres = [];
    for (let i = 0; i < 19; i++) {
      const flag = parts[flagsStartIndex + i];
      if (flag === '1') {
        if (i > 0) {
          const gName = GENRES_18[i - 1];
          if (gName) genres.push(gName);
        }
      }
    }

    movies.push({ id, title, genres });
  }
}

/**
 * parseRatingData
 * Parses the raw text from 'u.data' into the global `ratings` array.
 * Format per line (tab-separated): userId  itemId  rating  timestamp
 */
function parseRatingData(text) {
  ratings = []; // reset in case of re-parse

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 4) continue; // malformed line

    const userId = Number.parseInt(parts[0], 10);
    const itemId = Number.parseInt(parts[1], 10);
    const rating = Number.parseInt(parts[2], 10);
    const timestamp = Number.parseInt(parts[3], 10);

    ratings.push({ userId, itemId, rating, timestamp });
  }
}
