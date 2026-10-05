// The account pages edited in Page Details' "Account Pages" table (mirror
// of server/src/utils/accountPageSlugs.js). Each has an editable Title
// (stored in the row's email-subject columns) and description (the body);
// `visible` turns the page/feature on or off. Sign In is always on.
// `fallback` is shown until the row is published / if it doesn't exist.
export const ACCOUNT_PAGES = {
  "sign-in": {
    lockedOn: true,
    fallback: { title: "Sign In", description: "Follow Aiden's rocks on their journeys." },
  },
  "create-account": {
    fallback: {
      title: "Create an Account",
      description: "Follow rocks you care about and hear when they travel somewhere new.",
    },
  },
  "reset-password": {
    fallback: {
      title: "Reset Password",
      description:
        "Enter your email and we'll send you a link to choose a new password. This also unlocks a locked account.",
    },
  },
};

export const ACCOUNT_PAGE_SLUGS = new Set(Object.keys(ACCOUNT_PAGES));
