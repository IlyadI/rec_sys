// Global variables to store parsed data and dimensions
let movies = [];          // Array to store movie objects with id and title
let ratings = [];         // Array to store rating objects {userId, movieId, rating}
let numUsers = 0;         // Number of unique users in the dataset
let numMovies = 0;        // Number of unique movies in the dataset

// MovieLens 100K dataset files from your repository
const MOVIES_URL = 'u.item';
const RATINGS_URL = 'u.data';

/**
 * Main function to load and parse both movies and ratings data
 * This function coordinates the entire data loading process
 */
async function loadData() {
    try {
        console.log('Starting data loading process...');
        
        // Fetch both datasets in parallel for better performance
        const [moviesResponse, ratingsResponse] = await Promise.all([
            fetch(MOVIES_URL),
            fetch(RATINGS_URL)
        ]);
        
        // Check if both requests were successful
        if (!moviesResponse.ok || !ratingsResponse.ok) {
            throw new Error('Failed to fetch dataset files');
        }
        
        // Get the text content from both responses
        const moviesText = await moviesResponse.text();
        const ratingsText = await ratingsResponse.text();
        
        console.log('Raw data fetched, starting parsing...');
        
        // Parse the data using our parsing functions
        movies = parseItemData(moviesText);
        ratings = parseRatingData(ratingsText);
        
        // Calculate the number of unique users and movies
        numUsers = new Set(ratings.map(r => r.userId)).size;
        numMovies = movies.length;
        
        console.log(`Data loading complete: ${numUsers} users, ${numMovies} movies, ${ratings.length} ratings`);
        
        return {
            movies,
            ratings,
            numUsers,
            numMovies
        };
        
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

/**
 * Parse movie data from the MovieLens u.item format
 * Expected format: movieId|title|releaseDate|...|genres
 * Example: 1|Toy Story (1995)|01-Jan-1995||http://...|0|0|0|1|1|1|0|0|0|0|0|0|0|0|0|0|0|0|0
 * @param {string} text - Raw text data from u.item file
 * @returns {Array} Array of movie objects {id, title}
 */
function parseItemData(text) {
    const movies = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
            // Split by pipe character for u.item format
            const parts = line.split('|');
            if (parts.length >= 2) {
                const movieId = parseInt(parts[0]);
                const title = parts[1].trim();
                
                // Only add if we have valid data
                if (!isNaN(movieId) && title) {
                    movies.push({
                        id: movieId,
                        title: title
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to parse movie line:', line, e);
        }
    }
    
    console.log(`Parsed ${movies.length} movies`);
    return movies;
}

/**
 * Parse rating data from the MovieLens u.data format
 * Expected format: userId movieId rating timestamp
 * Example: 196	242	3	881250949
 * @param {string} text - Raw text data from u.data file
 * @returns {Array} Array of rating objects {userId, movieId, rating}
 */
function parseRatingData(text) {
    const ratings = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
            // Split by tab character for u.data format
            const parts = line.split('\t');
            if (parts.length >= 3) {
                const userId = parseInt(parts[0]);
                const movieId = parseInt(parts[1]);
                const rating = parseFloat(parts[2]);
                
                // Only add if we have valid data
                if (!isNaN(userId) && !isNaN(movieId) && !isNaN(rating)) {
                    ratings.push({
                        userId: userId,
                        movieId: movieId,
                        rating: rating
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to parse rating line:', line, e);
        }
    }
    
    console.log(`Parsed ${ratings.length} ratings`);
    return ratings;
}
