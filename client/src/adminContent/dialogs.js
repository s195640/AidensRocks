// The dialogs edited in Page Details' "Dialogs" table (mirror of
// server/src/utils/dialogSlugs.js). Each has an editable message (the body)
// and its own options, stored in the row's draft/published `settings`
// (draft until Publish). Dialogs are always on. `fallback` is shown until
// the row exists / if its message is blank.
export const MAX_ROCKS_CEILING = 100;

export const DIALOGS = {
  "request-a-rock": {
    fallback: {
      message:
        "If you would like some rocks sent to you for your upcoming trips, or if you have a " +
        "special location in mind where you’d like to place an Aiden Rock, please let us know " +
        "how many you would like and where to send them. We will send them anywhere in the " +
        "world for free; we just want to see them take off and travel!",
    },
  },
};

export const DIALOG_SLUGS = new Set(Object.keys(DIALOGS));
