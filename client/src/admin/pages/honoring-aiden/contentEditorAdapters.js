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
//
// `reporter` ({ onStart(fileName), onProgress(percent), onDone() }) drives
// EntryDetailView's UploadingDialog. It's optional so this still works
// standalone (e.g. tests) without a reporter wired up.
//
// Uploads are serialized through a tiny promise chain: ContentEditor's
// FileHandler extension calls onUploadImage/onUploadVideo once per file
// independently, so pasting/dropping several files at once can fire several
// of these "at once". Queuing here keeps only one chunked upload — and one
// visible dialog — in flight at a time, instead of multiple onProgress
// streams racing to update the same dialog state.
export function makeUploadCallbacks(uploadMedia = honoringAidenAdminApi.uploadMedia, reporter, entryId) {
  let queue = Promise.resolve();

  function runUpload(file) {
    const task = () => uploadWithProgress(file);
    const result = queue.then(task, task); // run even if the previous upload rejected
    queue = result.catch(() => {}); // one failure shouldn't break the chain for the next file
    return result;
  }

  async function uploadWithProgress(file) {
    reporter?.onStart?.(file.name);
    try {
      return await uploadMedia(file, (percent) => reporter?.onProgress?.(percent), entryId);
    } finally {
      reporter?.onDone?.();
    }
  }

  return {
    onUploadImage: async (file) => {
      const uploaded = await runUpload(file);
      return {
        url: uploaded.media_path,
        width: uploaded.width || undefined,
        height: uploaded.height || undefined,
      };
    },
    onUploadVideo: async (file) => {
      const uploaded = await runUpload(file);
      return {
        url: uploaded.media_path,
        poster: uploaded.media_poster_path || undefined,
        duration: uploaded.media_duration ?? undefined,
      };
    },
  };
}
