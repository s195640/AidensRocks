import { useEffect, useState } from "react";
import styles from "./JourneyAdmin.module.css";
import AdminContainer from "../../components/admin-base/AdminContainer";
import JourneyAdminEditDialog from "./journey-edit-dlg/JourneyAdminEditDialog";
import JourneyAdminTable from "./journey-table/JourneyAdminTable";
import LightboxRock from "../../../components/lightbox-rock/LightboxRock";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "react-photo-album/rows.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";


const JourneyAdmin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [popupRockNumber, setPopupRockNumber] = useState(null);
  const [imagesLightbox, setImagesLightbox] = useState(null);
  const [imagesIndex, setImagesIndex] = useState(-1);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/journey-admin");
      if (!res.ok) throw new Error("Failed to fetch journey posts");
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleToggleShow = async (rps_key, currentShow) => {
    try {
      const res = await fetch(`/api/journey-admin/${rps_key}/toggle-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show: !currentShow }),
      });
      if (!res.ok) throw new Error("Toggle show failed");
      setPosts((posts) =>
        posts.map((post) =>
          post.rps_key === rps_key ? { ...post, show: !currentShow } : post
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (rps_key) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/journey-admin/${rps_key}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setPosts((posts) => posts.filter((post) => post.rps_key !== rps_key));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
  };

  const openImagePopup = (rock_number) => {
    setPopupRockNumber(rock_number);
  };

  const closeImagePopup = () => {
    setPopupRockNumber(null);
  };

  const openImagesLightbox = (post) => {
    setImagesLightbox(
      Array.from({ length: post.total_images }, (_, i) => ({
        src: `/media/rocks/${post.rock_number}/${post.uuid}/webp/${i + 1}_${post.uuid}.webp`
      }))
    );
    setImagesIndex(0);
  }
  const closeImagesLightbox = () => {
    setImagesIndex(-1);
    setImagesLightbox(null);
  }
  return (
    <AdminContainer>
      <h2>Journey Posts Admin</h2>
      <JourneyAdminTable
        posts={posts}
        handleToggleShow={handleToggleShow}
        handleDelete={handleDelete}
        handleEdit={handleEdit}
        openImageDialog={openImagePopup}
        openImagesLightbox={openImagesLightbox}
      />

      {editingPost &&
        <JourneyAdminEditDialog
          post={editingPost}
          isOpen={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={() => {
            fetchPosts();
            setEditingPost(null);
          }}
          openImagesLightbox={openImagesLightbox}
        />}


      <LightboxRock open={popupRockNumber} onClose={closeImagePopup} imageSrc={{ rock_number: popupRockNumber }} />
      <Lightbox
        slides={imagesLightbox}
        open={imagesIndex >= 0}
        index={imagesIndex}
        close={() => closeImagesLightbox()}
        plugins={[Thumbnails, Fullscreen, Zoom, Counter, Slideshow, Captions]}
        thumbnails={{
          position: "bottom",
          width: 100,
          height: 60,
          borderRadius: 4,
        }}
        slideshow={{ autoplay: false, delay: 3000 }}
        captions={{
          descriptionTextAlign: "center",
          descriptionMaxLines: 2,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
          slide: { padding: "10px" },
        }}
      />
    </AdminContainer>
  );
};

export default JourneyAdmin;
