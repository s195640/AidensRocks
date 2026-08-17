import axios from "axios";

// Thin wrapper around the admin CRUD endpoints for the Honoring Aiden
// entries content model (server/src/routes/honoringAidenAdmin.js). Auth is
// handled globally — AuthContext already attaches the Bearer token to every
// axios request once the admin is signed in — so these calls need nothing
// extra.
const BASE = "/api/admin/honoring-aiden";

// Cloudflare (prod host) hard-caps request bodies at 100MB, so anything
// bigger has to be split client-side into chunks before it's sent — same
// constant/rationale as AlbumsCreateDlg.jsx and UploadRockForm.jsx.
const CHUNK_SIZE = 80 * 1024 * 1024;

// Mirrors AlbumsCreateDlg.jsx's uploadInChunks: chunks POST to
// /media/stage-chunk (server/src/routes/honoringAidenAdmin.js), sequentially
// so chunks land in order (the server just appends each one to a temp
// file). The server auto-finalizes on the last chunk and, unlike the Albums
// endpoint, that final response IS the fully-processed media payload
// (same shape POST /media returns) — returned here as this function's result.
async function uploadMediaChunked(file, onProgress, entryId) {
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let lastResponseData;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const chunk = file.slice(start, start + CHUNK_SIZE);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", chunkIndex);
    formData.append("totalChunks", totalChunks);
    formData.append("originalName", file.name);
    formData.append("entry_id", entryId);

    const res = await axios.post(`${BASE}/media/stage-chunk`, formData, {
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        const chunkFraction = e.loaded / e.total;
        onProgress(Math.round(((chunkIndex + chunkFraction) / totalChunks) * 100));
      },
    });
    lastResponseData = res.data;
  }

  return lastResponseData;
}

const honoringAidenAdminApi = {
  fetchEntries: () => axios.get(`${BASE}/entries`).then((r) => r.data),
  fetchEntryBySlug: (slug) =>
    axios.get(`${BASE}/entries/slug/${slug}`).then((r) => r.data),

  // createEntry: {title} only. updateEntry: always the full
  // {title, published, body_json} shape — see routes/honoringAidenAdmin.js's
  // PUT /entries/:id doc comment for why.
  createEntry: (data) => axios.post(`${BASE}/entries`, data).then((r) => r.data),
  updateEntry: (id, data) => axios.put(`${BASE}/entries/${id}`, data).then((r) => r.data),
  archiveEntry: (id) => axios.patch(`${BASE}/entries/${id}/archive`).then((r) => r.data),
  // parentId: null promotes to top-level, or a top-level entry's id to
  // move under it — see routes/honoringAidenAdmin.js's own PATCH
  // /entries/:id/move doc for why this is separate from updateEntry.
  moveEntry: (id, parentId) =>
    axios.patch(`${BASE}/entries/${id}/move`, { parent_id: parentId }).then((r) => r.data),
  reorderEntries: (order) =>
    axios.patch(`${BASE}/entries/reorder`, { order }).then((r) => r.data),

  // Synchronous — resolves only once the file is fully processed
  // (WebP/thumbnail or poster-frame/duration-probe), no polling. Files over
  // CHUNK_SIZE are staged in chunks (uploadMediaChunked) instead of sent
  // whole, same as AlbumsCreateDlg/UploadRockForm; either path reports
  // progress through the same onProgress(percent) callback, so callers
  // don't need to know or care which one ran. entryId is required — the
  // server records every upload against the entry it belongs to (see
  // routes/honoringAidenAdmin.js's entry_media table) so the Media tab
  // below can list/ref-count/delete it later.
  uploadMedia: (file, onProgress, entryId) => {
    if (file.size > CHUNK_SIZE) {
      return uploadMediaChunked(file, onProgress, entryId);
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entry_id", entryId);
    return axios
      .post(`${BASE}/media`, formData, {
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  // Media tab (list / ref-count / delete for a given entry) — see
  // routes/honoringAidenAdmin.js's GET/DELETE /entries/:id/media.
  fetchEntryMedia: (entryId) => axios.get(`${BASE}/entries/${entryId}/media`).then((r) => r.data),
  deleteEntryMedia: (entryId, mediaPath) =>
    axios
      .delete(`${BASE}/entries/${entryId}/media`, { data: { media_path: mediaPath } })
      .then((r) => r.data),
};

export default honoringAidenAdminApi;
