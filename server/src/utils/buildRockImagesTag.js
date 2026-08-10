const buildRockImageTag = require('./buildRockImageTag');

// Builds the {ROCK_IMAGES} HTML snippet for the "Response Email Multi"
// template (routes/pagesAdmin.js's manual "Send" test) — one
// buildRockImageTag() per rock number, wrapped in an inline-block div so
// several photos wrap into a simple grid inside an email client's limited
// CSS support (inline-block, not flex/grid, same reasoning as
// buildRockImageTag.js's own `style`-not-class note).
function buildRockImagesTag(rockNumbers) {
  return rockNumbers
    .map(
      (rockNumber) =>
        `<div style="display:inline-block;margin:4px;">${buildRockImageTag(rockNumber)}</div>`
    )
    .join('');
}

module.exports = buildRockImagesTag;
