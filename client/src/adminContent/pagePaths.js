// page_content only stores a nav_label/order_num per slug, not the actual
// route path, so this is the one place that slug -> public route mapping
// lives (used by both the navbar and the admin "Preview" link).
const PAGE_PATHS = {
  home: "/",
  "share-your-rock": "/share-your-rock",
  photos: "/photos",
  birthdays: "/birthdays",
  "track-the-rocks": "/track-the-rocks",
  map: "/map",
  sudc: "/sudc",
};

export default PAGE_PATHS;
