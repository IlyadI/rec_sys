// ==========================
// Data Loading & Parsing
// ==========================

// Global variables to store dataset
let ratings = [];       // array of {userId, movieId, rating}
let movies = {};        // mapping movieId -> title
let numUsers = 0;
let numMovies = 0;

/**
 * Load and parse the MovieLens dataset (u.item, u.data).
 * Uses fetch() to retrieve files.
 */
async function loadData() {
  // Load movie metadata
  const itemResponse = await fetch("https://raw.githubusercontent.com/grouplens/datasets/master/movielens/100k/u.item");
  const itemText = await itemResponse.text();
  parseItemData(itemText);

  // Load user ratings
  const dataResponse = await fetch("https://raw.githubusercontent.com/grouplens/datasets/master/movielens/100k/u.data");
  const dataText = await dataResponse.text();
  parseRatingData(dataText);

  console.log("Data loaded:", numUsers, "users,", numMovies, "movies,", ratings.length, "ratings");
}

/**
 * Parse u.item file (movieId | title | …).
 */
function parseItemData(text) {
  const lines = text.trim().split("\n");
  lines.forEach(line => {
    const parts = line.split("|");
    const movieId = parseInt(parts[0]);
    const title = parts[1];
    movies[movieId] = title;
  });
  numMovies = Object.keys(movies).length;
}

/**
 * Parse u.data file (userId, movieId, rating, timestamp).
 */
function parseRatingData(text) {
  const lines = text.trim().split("\n");
  lines.forEach(line => {
    const [userId, movieId, rating] = line.split("\t").map(Number);
    ratings.push({ userId: userId - 1, movieId: movieId - 1, rating }); // shift IDs to start at 0
    numUsers = Math.max(numUsers, userId);
  });
}
