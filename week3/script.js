// Global variables
let model = null;                    // TensorFlow.js model instance
let isTraining = false;              // Flag to track training status
let trainingStartTime = null;        // Track training start time

/**
 * Initialize the application when the window loads
 * This is the main entry point that coordinates all functionality
 */
window.onload = async function() {
    try {
        updateResult('Loading MovieLens dataset...');
        
        // Load and parse the dataset
        await loadData();
        
        // Populate the dropdown menus with users and movies
        populateUserDropdown();
        populateMovieDropdown();
        
        updateResult('Data loaded! Starting model training...');
        
        // Start training the matrix factorization model
        await trainModel();
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateResult(`Error: ${error.message}`);
    }
};

/**
 * Populate the user dropdown with unique user IDs from the ratings data
 */
function populateUserDropdown() {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = ''; // Clear loading message
    
    // Get unique user IDs and sort them
    const uniqueUserIds = [...new Set(ratings.map(r => r.userId))].sort((a, b) => a - b);
    
    // Create option elements for each user
    uniqueUserIds.forEach(userId => {
        const option = document.createElement('option');
        option.value = userId;
        option.textContent = `User ${userId}`;
        userSelect.appendChild(option);
    });
    
    console.log(`Populated user dropdown with ${uniqueUserIds.length} users`);
}

/**
 * Populate the movie dropdown with movie titles from the movies data
 */
function populateMovieDropdown() {
    const movieSelect = document.getElementById('movie-select');
    movieSelect.innerHTML = ''; // Clear loading message
    
    // Sort movies by title for better user experience
    const sortedMovies = [...movies].sort((a, b) => a.title.localeCompare(b.title));
    
    // Create option elements for each movie
    sortedMovies.forEach(movie => {
        const option = document.createElement('option');
        option.value = movie.id;
        option.textContent = movie.title;
        movieSelect.appendChild(option);
    });
    
    console.log(`Populated movie dropdown with ${sortedMovies.length} movies`);
}

/**
 * Create the Matrix Factorization model architecture
 * This model learns latent factors for users and movies and predicts ratings via dot product
 * @param {number} numUsers - Number of unique users in the dataset
 * @param {number} numMovies - Number of unique movies in the dataset
 * @param {number} latentDim - Dimension of the latent factor vectors (default: 10)
 * @returns {tf.LayersModel} Compiled TensorFlow.js model
 */
function createModel(numUsers, numMovies, latentDim = 10) {
    console.log(`Creating model with ${numUsers} users, ${numMovies} movies, latent dimension: ${latentDim}`);
    
    // Input layer for user IDs - shape [null, 1] for batch processing
    const userInput = tf.input({shape: [1], name: 'userInput'});
    
    // Input layer for movie IDs - shape [null, 1] for batch processing  
    const movieInput = tf.input({shape: [1], name: 'movieInput'});
    
    // User embedding layer: maps user IDs to dense vectors in latent space
    // Adding 1 to inputDim to account for 0-based indexing
    const userEmbedding = tf.layers.embedding({
        inputDim: numUsers + 1,
        outputDim: latentDim,
        name: 'userEmbedding'
    }).apply(userInput);
    
    // Movie embedding layer: maps movie IDs to dense vectors in latent space
    // Adding 1 to inputDim to account for 0-based indexing
    const movieEmbedding = tf.layers.embedding({
        inputDim: numMovies + 1,
        outputDim: latentDim,
        name: 'movieEmbedding'
    }).apply(movieInput);
    
    // Flatten the embeddings from 2D to 1D tensors
    const userVector = tf.layers.flatten().apply(userEmbedding);
    const movieVector = tf.layers.flatten().apply(movieEmbedding);
    
    // Compute dot product of user and movie vectors to get predicted rating
    // This is the core matrix factorization operation: userVector • movieVector^T
    const dotProduct = tf.layers.dot({axes: 1}).apply([userVector, movieVector]);
    
    // Create the model with two inputs and one output
    const model = tf.model({
        inputs: [userInput, movieInput],
        outputs: dotProduct
    });
    
    console.log('Model architecture created successfully');
    return model;
}

/**
 * Train the Matrix Factorization model using the loaded ratings data
 * This function handles data preparation, model compilation, and training
 */
async function trainModel() {
    if (isTraining) {
        console.log('Model training already in progress');
        return;
    }
    
    try {
        isTraining = true;
        trainingStartTime = Date.now();
        
        updateResult('Creating model architecture...');
        
        // Create the model with appropriate dimensions
        // Using 15 latent factors for good representation without overfitting
        model = createModel(numUsers, numMovies, 15);
        
        // Compile the model with appropriate optimizer and loss function
        model.compile({
            optimizer: tf.train.adam(0.001), // Adam optimizer with learning rate 0.001
            loss: 'meanSquaredError'         // MSE is standard for rating prediction
        });
        
        console.log('Model compiled, preparing training data...');
        updateResult('Preparing training data...');
        
        // Prepare training data: extract user IDs, movie IDs, and ratings
        const userInputs = ratings.map(r => r.userId);
        const movieInputs = ratings.map(r => r.movieId);
        const ratingTargets = ratings.map(r => r.rating);
        
        // Convert JavaScript arrays to TensorFlow tensors
        const userTensor = tf.tensor2d(userInputs, [userInputs.length, 1]);
        const movieTensor = tf.tensor2d(movieInputs, [movieInputs.length, 1]);
        const ratingTensor = tf.tensor2d(ratingTargets, [ratingTargets.length, 1]);
        
        console.log(`Training on ${ratings.length} ratings...`);
        updateResult(`Training model on ${ratings.length} ratings...`);
        
        // Train the model - using 10 epochs for reasonable training time
        const history = await model.fit(
            [userTensor, movieTensor], // Inputs: user IDs and movie IDs
            ratingTensor,              // Targets: actual ratings
            {
                epochs: 10,            // Number of training passes
                batchSize: 64,         // Batch size for gradient updates
                validationSplit: 0.1,  // Use 10% of data for validation
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        // Update UI with training progress
                        const elapsed = ((Date.now() - trainingStartTime) / 1000).toFixed(1);
                        updateResult(`Training epoch ${epoch + 1}/10 - Loss: ${logs.loss.toFixed(4)} - Time: ${elapsed}s`);
                        console.log(`Epoch ${epoch + 1}, Loss: ${logs.loss}`);
                    }
                }
            }
        );
        
        // Clean up tensors to free memory
        userTensor.dispose();
        movieTensor.dispose();
        ratingTensor.dispose();
        
        const trainingTime = ((Date.now() - trainingStartTime) / 1000).toFixed(1);
        console.log(`Training completed in ${trainingTime} seconds`);
        
        // Enable prediction button and update UI
        document.getElementById('predict-btn').disabled = false;
        updateResult(`Model trained successfully! Ready for predictions. Training time: ${trainingTime}s`);
        
    } catch (error) {
        console.error('Training error:', error);
        updateResult(`Training failed: ${error.message}`);
    } finally {
        isTraining = false;
    }
}

/**
 * Predict a user's rating for a selected movie using the trained model
 * This function is called when the user clicks the "Predict Rating" button
 */
async function predictRating() {
    if (!model) {
        updateResult('Model is not ready yet. Please wait for training to complete.');
        return;
    }
    
    try {
        // Get selected user and movie from dropdowns
        const userId = parseInt(document.getElementById('user-select').value);
        const movieId = parseInt(document.getElementById('movie-select').value);
        
        if (!userId || !movieId) {
            updateResult('Please select both a user and a movie.');
            return;
        }
        
        // Get movie title for display
        const movie = movies.find(m => m.id === movieId);
        const movieTitle = movie ? movie.title : `Movie ${movieId}`;
        
        updateResult(`Predicting rating for User ${userId} and "${movieTitle}"...`);
        
        // Create input tensors for prediction
        // Shape: [1, 1] for single prediction
        const userTensor = tf.tensor2d([[userId]]);
        const movieTensor = tf.tensor2d([[movieId]]);
        
        // Make prediction
        const prediction = model.predict([userTensor, movieTensor]);
        const predictedRating = await prediction.data();
        
        // Clean up tensors
        userTensor.dispose();
        movieTensor.dispose();
        prediction.dispose();
        
        // Display the result - ratings are typically 1-5 scale
        const rating = predictedRating[0];
        const displayRating = Math.min(Math.max(rating, 1), 5).toFixed(2); // Clamp to 1-5 range
        
        updateResult(
            `Predicted rating for User ${userId} and "${movieTitle}": ` +
            `<span class="prediction">${displayRating} / 5.00</span>`
        );
        
        console.log(`Prediction - User: ${userId}, Movie: ${movieId}, Rating: ${displayRating}`);
        
    } catch (error) {
        console.error('Prediction error:', error);
        updateResult(`Prediction failed: ${error.message}`);
    }
}

/**
 * Update the result display area with new message
 * @param {string} message - HTML message to display
 */
function updateResult(message) {
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = `<p>${message}</p>`;
}
