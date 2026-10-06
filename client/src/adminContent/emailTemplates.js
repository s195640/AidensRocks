// Per-template metadata for every email-template page_content row (see
// admin/pages/pages/emailSlugs.js), mirroring server/src/utils/
// emailTemplates.js:
//   description - shown in Page Details' "Used for" column
//   kind        - "automatic" (the site sends it) or "default" (only
//                 pre-fills a freeform send the admin edits and sends)
//   required    - always on; the Active switch is locked (sign-up/reset)
//   fields      - inputs the Preview and test-Send dialogs collect; `key` is
//                 the raw value sent to the server, which derives any HTML
//                 placeholders ({ROCK_IMAGE}, links, ...) itself. `query` is
//                 an optional EmailPreview URL param that pre-fills it.
//   tokens      - {PLACEHOLDER}s offered in the editor's Insert menu
const ROCK_NUMBER_FIELD = {
  key: "ROCK_NUMBER",
  label: "Rock number",
  placeholder: "123",
  type: "number",
  query: "rock",
  required: true,
};

const EMAIL_TEMPLATES = {
  "response-email": {
    description: "Sent to someone who shares a rock and leaves their email (one rock).",
    kind: "automatic",
    fields: [ROCK_NUMBER_FIELD],
    tokens: [
      ["{ROCK_NUMBER}", "Rock Number"],
      ["{ROCK_IMAGE}", "Rock Image"],
    ],
  },
  "response-email-multi": {
    description: "Sent from the Catch-up job when one person has several rocks.",
    kind: "automatic",
    fields: [
      {
        key: "ROCK_NUMBERS",
        label: "Rock numbers",
        placeholder: "123, 124, 125",
        query: "rocks",
        required: true,
      },
    ],
    tokens: [
      ["{ROCK_NUMBERS}", "Rock Numbers"],
      ["{ROCK_IMAGES}", "Rock Images"],
      ["{ROCK_NUMBERS_WITH_LINKS}", "Rock Numbers (with links)"],
    ],
  },
  "follow-rocks-email": {
    description: "Sent to followers when a rock they follow travels somewhere new.",
    kind: "automatic",
    fields: [
      ROCK_NUMBER_FIELD,
      { key: "LOCATION", label: "Location", placeholder: "Yosemite National Park" },
      { key: "DATE", label: "Date", placeholder: "October 4, 2026" },
    ],
    tokens: [
      ["{ROCK_NUMBER}", "Rock Number"],
      ["{ROCK_IMAGE}", "Rock Image"],
      ["{LOCATION}", "Location"],
      ["{DATE}", "Date"],
      ["{ROCK_JOURNEY_LINK}", "Rock Journey Link"],
    ],
  },
  "account-verify-email": {
    description: "Sent when someone creates an account, to verify their email. Always on.",
    kind: "automatic",
    required: true,
    fields: [{ key: "EMAIL", label: "Account email", placeholder: "visitor@example.com" }],
    tokens: [
      ["{EMAIL}", "Account Email"],
      ["{VERIFY_LINK}", "Verify Link"],
    ],
  },
  "password-reset-email": {
    description: "Sent from Forgot Password / admin reset; also unlocks accounts. Always on.",
    kind: "automatic",
    required: true,
    fields: [{ key: "EMAIL", label: "Account email", placeholder: "visitor@example.com" }],
    tokens: [
      ["{EMAIL}", "Account Email"],
      ["{RESET_LINK}", "Reset Link"],
    ],
  },
  "new-journey-email": {
    description: "Sent to you when a new rock journey is posted (photos attached).",
    kind: "automatic",
    fields: [
      ROCK_NUMBER_FIELD,
      { key: "NAME", label: "Name", placeholder: "Jane" },
      { key: "DATE", label: "Date", placeholder: "10/04/2026" },
      { key: "LOCATION", label: "Location", placeholder: "Zion National Park" },
      { key: "COMMENT", label: "Comment", placeholder: "What a view!" },
      { key: "SUBMITTER_EMAIL", label: "Submitter email", placeholder: "jane@example.com" },
    ],
    tokens: [
      ["{ROCK_NUMBER}", "Rock Number"],
      ["{ROCK_IMAGE}", "Rock Image"],
      ["{NAME}", "Name"],
      ["{DATE}", "Date"],
      ["{LOCATION}", "Location"],
      ["{COMMENT}", "Comment"],
      ["{SUBMITTER_EMAIL}", "Submitter Email"],
    ],
  },
  "new-rock-request-email": {
    description: "Sent to you when someone submits Request A Rock.",
    kind: "automatic",
    fields: [
      { key: "NAME", label: "Name", placeholder: "Jane" },
      { key: "EMAIL", label: "Email", placeholder: "jane@example.com" },
      { key: "ADDRESS", label: "Address", placeholder: "123 Main St" },
      { key: "ROCKS_REQUESTED", label: "Rocks requested", placeholder: "2" },
      { key: "NEEDED_BY", label: "Need rocks by", placeholder: "2026-12-01" },
      { key: "MESSAGE", label: "Message", placeholder: "(none)" },
    ],
    tokens: [
      ["{NAME}", "Name"],
      ["{EMAIL}", "Email"],
      ["{ADDRESS}", "Address"],
      ["{ROCKS_REQUESTED}", "Rocks Requested"],
      ["{NEEDED_BY}", "Need Rocks By (date or \"No rush\")"],
      ["{MESSAGE}", "Message"],
    ],
  },
  "rock-request-reply-email": {
    description:
      "Default text for Rock Requests → Send Email (sent as plain text; links/images aren't kept).",
    kind: "default",
    fields: [
      { key: "NAME", label: "Name", placeholder: "Jane" },
      { key: "ROCK_NUMBERS", label: "Rock numbers", placeholder: "343, 234" },
      { key: "TRACKING_NUMBER", label: "Tracking number", placeholder: "1Z999..." },
    ],
    tokens: [
      ["{NAME}", "Name"],
      ["{ROCK_NUMBERS}", "Rock Numbers"],
      ["{TRACKING_NUMBER}", "Tracking Number"],
    ],
  },
  "send-email-default": {
    description:
      "Default subject/message for the Send Email job (sent as plain text; links/images aren't kept).",
    kind: "default",
    fields: [],
    tokens: [],
  },
};

export default EMAIL_TEMPLATES;
