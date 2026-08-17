import axios from "axios";

// Thin wrapper around the admin CRUD endpoints for the Honoring Aiden
// entries content model (server/src/routes/honoringAidenAdmin.js). Auth is
// handled globally — AuthContext already attaches the Bearer token to every
// axios request once the admin is signed in — so these calls need nothing
// extra.
const BASE = "/api/admin/honoring-aiden";

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
  // (WebP/thumbnail or poster-frame/duration-probe), no polling.
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axios.post(`${BASE}/media`, formData).then((r) => r.data);
  },
};

export default honoringAidenAdminApi;
