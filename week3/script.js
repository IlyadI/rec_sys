// ==========================
// Model Definition & Training
// ==========================

let model; // Global variable for the trained model

// When page loads, fetch data, populate dropdowns, and train model
window.onload = async function() {
  document.getElementById("result").innerText = "Loading dataset...";
  await loadData();
  populateDropdowns();
  await trainModel();
};

/**
 * Populate dropdowns with users and movies.
 */
function populateDropdowns() {
  const userSelect = document.getElementById("user-select");
  for (let i = 0; i < numUsers; i++) {
    let option = document.createElement("option");
    option.value = i;
    option.text = "User " + (i + 1);
    userSelect.appendChild(option);
  }

  const movieSelect = document.getElementById("movie-select");
  for (const movieId in movies) {
    let option = document.createElement("option");
    option.value = movieId - 1; // shift ID to zero-based
    option.text = movies[movieId];
    movieSelect.appendChild(option);
  }
}

/**
 * Define the Matrix Factorization model.
 * @param {number} numUsers 
 * @param {number} numMovies 
 * @param {number} latentDim 
 */
function createModel(numUsers, numMovies, latentDim = 20) {
  // Input layers (user IDs, movie IDs)
  const userInput = tf.input({shape: [], dtype: "int32"});
  const movieInput = tf.input({shape: [], dtype: "int32"});

  // Embedding layers map IDs to latent vectors
  const userEmbedding = tf.layers.embedding({
    inputDim: numUsers,
    outputDim: latentDim,
    embeddingsInitializer: "randomNormal"
  }).apply(userInput);

  const movieEmbedding = tf.layers.embedding({
    inputDim: numMovies,
    outputDim: latentDim,
    embeddingsInitializer: "randomNormal"
  }).apply(movieInput);

  // Flatten embeddings (from [batch, 1, latentDim] -> [batch, latentDim])
  const userVec = tf.layers.flatten().apply(userEmbedding);
  const movieVec = tf.layers.flatten().apply(movieEmbedding);

  // Dot product = predicted rating
  const dotProduct = tf.layers.dot({axes: 1}).apply([userVec, movieVec]);

  // Build and return model
  return tf.model({inputs: [userInput, movieInput], outputs: dotProduct});
}

/**
 * Train the model on the ratings dataset.
 */
async function trainModel() {
  document.getElementById("result").innerText = "Training model...";

  // Create model
  model = createModel(numUsers, numMovies);

  // Compile model with optimizer and loss
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "meanSquaredError"
  });

  // Prepare training data
  const userIds = ratings.map(r => r.userId);
  const movieIds = ratings.map(r => r.movieId);
  const labels = ratings.map(r => r.rating);

  const userTensor = tf.tensor2d(userIds, [userIds.length, 1], "int32");
  const movieTensor = tf.tensor2d(movieIds, [movieIds.length, 1], "int32");
  const labelTensor = tf.tensor2d(labels, [labels.length, 1], "float32");

  // Train
  await model.fit([userTensor, movieTensor], labelTensor, {
    batchSize: 64,
    epochs: 5,
    verbose: 1
  });

  document.getElementById("result").innerText = "Model trained! Select user and movie to predict.";
}

/**
 * Predict rating for selected user and movie.
 */
async function predictRating() {
  const userId = parseInt(document.getElementById("user-select").value);
  const movieId = parseInt(document.getElementById("movie-select").value);

  const userTensor = tf.tensor2d([userId], [1, 1], "int32");
  const movieTensor = tf.tensor2d([movieId], [1, 1], "int32");

  const prediction = model.predict([userTensor, movieTensor]);
  const rating = (await prediction.data())[0];

  document.getElementById("result").innerText =
    `Predicted rating for User ${userId+1} on "${movies[movieId+1]}" = ${rating.toFixed(2)} / 5`;
}
