// Builds the {ROCK_NUMBERS_WITH_LINKS} HTML snippet for the "Response
// Email Multi" template: the same "X, Y, Z" list as {ROCK_NUMBERS}, but
// each number is a link to that rock's Track the Rocks page (see
// client/src/pages/track-the-rocks/TrackTheRocks.jsx's ?rock= deep link).
// &from=email-* marks the visit as coming from one of our emails for site
// tracking (data/ai-build-docs/site-tracking/); the page ignores it otherwise.
function buildRockNumbersWithLinksTag(rockNumbers) {
  return rockNumbers
    .map(
      (rockNumber) =>
        `<a href="https://aidensrocks.com/track-the-rocks?rock=${rockNumber}&from=email-response">${rockNumber}</a>`
    )
    .join(', ');
}

module.exports = buildRockNumbersWithLinksTag;
