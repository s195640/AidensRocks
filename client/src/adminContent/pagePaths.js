// page_content only stores a nav_label/order_num per slug, not the actual
// route path, so this is the one place that slug -> public route mapping
// lives (used by both the navbar and the admin "Preview" link).
const PAGE_PATHS = {
  home: "/",
  "share-your-rock": "/share-your-rock",
  photos: "/photos",
  birthdays: "/birthdays",
  "honoring-aiden": "/honoring-aiden",
  "track-the-rocks": "/track-the-rocks",
  map: "/map",
  sudc: "/sudc",
  "follow-rocks": "/follow-rocks",
  // Account pages (Page Details "Account Pages"; never in the nav).
  "sign-in": "/login",
  "create-account": "/sign-up",
  "reset-password": "/forgot-password",
  // Dialogs (Page Details "Dialogs"): a page that opens the dialog.
  "request-a-rock": "/?requestRock=1",
};

export default PAGE_PATHS;
