// Builds the {ROCK_NUMBERS_WITH_LINKS} HTML snippet for the "Response
// Email Multi" template: the same "X, Y, Z" list as {ROCK_NUMBERS}, but
// each number is a link to that rock's Track the Rocks page (see
// client/src/pages/track-the-rocks/TrackTheRocks.jsx's ?rock= deep link).
function buildRockNumbersWithLinksTag(rockNumbers) {
  return rockNumbers
    .map(
      (rockNumber) =>
        `<a href="https://aidensrocks.com/track-the-rocks?rock=${rockNumber}">${rockNumber}</a>`
    )
    .join(', ');
}

module.exports = buildRockNumbersWithLinksTag;
