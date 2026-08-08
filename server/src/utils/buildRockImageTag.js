// Builds the {ROCK_IMAGE} HTML snippet for a given rock number — the site's
// catalog reference photo (routes/rocks.js's saveImage convention:
// media/catalog/<rock_number>/a.webp), NOT a rock journey's own uploaded
// photos (those live under media/rocks/<rock_number>/<uuid>/...). Shared by
// routes/pagesAdmin.js's manual "Send" test and
// utils/rock-upload/sendRockResponseEmail.js's automated send so the two
// paths can't drift apart. `style` (not a CSS class) because HTML email
// clients don't reliably support external/`<style>` CSS.
function buildRockImageTag(rockNumber) {
  return `<img src="https://aidensrocks.com/media/catalog/${rockNumber}/a.webp" alt="Rock ${rockNumber}" style="max-width:100%;border-radius:8px;" />`;
}

module.exports = buildRockImageTag;
