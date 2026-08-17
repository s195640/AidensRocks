import honoringAidenAdminApi from "./honoringAidenAdminApi";

// Glue between @s195640/content-editor (the ContentEditor package used for
// an entry's whole page body — see EntryDetailView.jsx) and this app's own
// upload endpoint (honoringAidenAdminApi.uploadMedia).

// uploadMedia() resolves { media_path, thumbnail_path? (image), or
// media_poster_path/media_duration (video), width, height } — see
// server/src/routes/honoringAidenAdmin.js's POST /media handler. The
// package wants { url, ... } instead ({url, alt?, width?, height?} for
// images; {url, poster?, duration?} for video) — this just renames/reshapes
// that response, no new network call of its own.
export function makeUploadCallbacks(uploadMedia = honoringAidenAdminApi.uploadMedia) {
  return {
    onUploadImage: async (file) => {
      const uploaded = await uploadMedia(file);
      return {
        url: uploaded.media_path,
        width: uploaded.width || undefined,
        height: uploaded.height || undefined,
      };
    },
    onUploadVideo: async (file) => {
      const uploaded = await uploadMedia(file);
      return {
        url: uploaded.media_path,
        poster: uploaded.media_poster_path || undefined,
        duration: uploaded.media_duration ?? undefined,
      };
    },
  };
}
