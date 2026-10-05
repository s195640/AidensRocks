// Builds the {ROCK_JOURNEY_LINK} HTML snippet for the "Follow Rocks Email"
// template: a link to that rock's Track the Rocks page (see
// client/src/pages/track-the-rocks/TrackTheRocks.jsx's ?rock= deep link).
// Same hardcoded site URL as buildRockImageTag/buildRockNumbersWithLinksTag
// so the admin's preview (EmailPreview.jsx) matches what's sent.
function buildRockJourneyLinkTag(rockNumber) {
  return `<a href="https://aidensrocks.com/track-the-rocks?rock=${rockNumber}">See Rock ${rockNumber}'s journey</a>`;
}

module.exports = buildRockJourneyLinkTag;
