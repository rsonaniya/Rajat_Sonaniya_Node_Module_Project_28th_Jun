const fs = require("fs");
const path = require("path");

const users = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./user_data.json"))
);
const relatedUsers = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./related_users.json"))
);
const movies = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./movie_data.json"))
);
const userPreferences = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./user_preference.json"))
);

function gaussianDecay(days, sigma = 30) {
  return Math.exp(-Math.pow(days, 2) / (2 * Math.pow(sigma, 2)));
}

function getUserPreferences(userId) {
  return userPreferences
    .filter((pref) => pref.user_id === userId)
    .reduce((acc, curr) => {
      acc[curr.genre] = curr.preference_score;
      return acc;
    }, {});
}

function getRelatedUsers(userId) {
  return relatedUsers[userId]
    .filter((rel) => rel.user_id === userId)
    .map((rel) => rel.related_user_id);
}

function calculateMovieScore(
  movie,
  userPreferences,
  relatedUsersPreferences,
  today
) {
  const releaseDate = new Date(movie.release_date);
  const timeDeltaDays = Math.floor(
    (today - releaseDate) / (1000 * 60 * 60 * 24)
  );
  const timeScore = gaussianDecay(timeDeltaDays);

  const genres = movie.genres;
  const userGenreScore =
    genres.reduce((acc, genre) => acc + (userPreferences[genre] || 0), 0) /
    genres.length;

  const relatedUsersGenreScores =
    genres.reduce(
      (acc, genre) => acc + (relatedUsersPreferences[genre] || 0),
      0
    ) / genres.length;
  const relatedUsersScore = relatedUsersGenreScores / genres.length;

  const totalScore = timeScore + userGenreScore + relatedUsersScore;
  return totalScore;
}

function generatePersonalizedFeed(userId) {
  const today = new Date();
  const userPrefs = getUserPreferences(userId);
  const relatedUsersIds = getRelatedUsers(userId);
  const relatedUsersPrefs = relatedUsersIds.reduce((acc, relUserId) => {
    const prefs = getUserPreferences(relUserId);
    Object.keys(prefs).forEach((genre) => {
      if (!acc[genre]) {
        acc[genre] = 0;
      }
      acc[genre] += prefs[genre];
    });
    return acc;
  }, {});

  const scoredMovies = movies.map((movie) => {
    const score = calculateMovieScore(
      movie,
      userPrefs,
      relatedUsersPrefs,
      today
    );
    return { movie, score };
  });

  scoredMovies.sort((a, b) => b.score - a.score);

  return scoredMovies.slice(0, 10).map((scored) => scored.movie);
}

const userId = "125";
const personalizedFeed = generatePersonalizedFeed(userId);
console.log(personalizedFeed);
