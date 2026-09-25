import { useEffect, useState } from "react";
import authFetch from "../../utils/authFetch";
import AdminContainer from "../../components/admin-base/AdminContainer";
import RockRequestsAdminTable from "./rock-requests-table/RockRequestsAdminTable";
import RockRequestsEditDialog from "./rock-requests-edit-dlg/RockRequestsEditDialog";
import CreateRockRequestDialog from "./rock-requests-create-dlg/CreateRockRequestDialog";
import ToggleSwitch from "../../../components/simple-components/toggle-switch/ToggleSwitch";
import styles from "./RockRequestsAdmin.module.css";

const RockRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/rock-requests");
      if (!res.ok) throw new Error("Failed to fetch rock requests");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRocks = async () => {
    try {
      const res = await authFetch("/api/rocks");
      if (!res.ok) throw new Error("Failed to fetch catalog rocks");
      const data = await res.json();
      setRocks(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchRocks();
  }, []);

  const handleEdit = (request) => {
    setEditingRequest(request);
  };

  const handleDelete = async (rq_key) => {
    if (!window.confirm("Are you sure you want to delete this rock request?")) return;
    try {
      const res = await authFetch(`/api/rock-requests/${rq_key}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to delete request.");
        return;
      }
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to delete request.");
    }
  };

  const handleUndelete = async (rq_key) => {
    try {
      const res = await authFetch(`/api/rock-requests/${rq_key}/undelete`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to undelete request.");
        return;
      }
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to undelete request.");
    }
  };

  return (
    <AdminContainer>
      <div className={styles.headerTop}>
        <h2>Rock Requests</h2>
        <div className={styles.headerActions}>
          <label className={styles.showDeletedToggle}>
            <ToggleSwitch checked={showDeleted} onChange={() => setShowDeleted((v) => !v)} />
            Show Deleted
          </label>
          <button className={styles.createButton} onClick={() => setShowCreateDialog(true)}>
            + Create Request
          </button>
        </div>
      </div>
      <RockRequestsAdminTable
        requests={requests}
        loading={loading}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleUndelete={handleUndelete}
        showDeleted={showDeleted}
      />

      {editingRequest && (
        <RockRequestsEditDialog
          request={editingRequest}
          rocks={rocks}
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
          onSave={() => {
            // Deliberately doesn't close the dialog -- Save just persists
            // and refreshes the list in the background; the admin closes
            // via Cancel/Escape once they're done (e.g. after also using
            // Send Email, which requires no unsaved changes).
            fetchRequests();
            fetchRocks();
          }}
          onEmailSent={fetchRequests}
        />
      )}

      {showCreateDialog && (
        <CreateRockRequestDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            fetchRequests();
            setShowCreateDialog(false);
          }}
        />
      )}
    </AdminContainer>
  );
};

export default RockRequestsAdmin;
