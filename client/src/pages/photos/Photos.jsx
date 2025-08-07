import { useState } from "react";
import ContentBody from "../../components/content-body/ContentBody";
import PhotoAlbum from "../../components/photo-album/PhotoAlbum";
import PhotoCollection from "../../components/photo-album/PhotoCollection";

const Photos = () => {
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  return (
    <div>
      <ContentBody>
        {selectedAlbum ? (
          <PhotoCollection
            album={selectedAlbum}
            onBack={() => setSelectedAlbum(null)}
          />
        ) : (
          <PhotoAlbum onAlbumClick={(album) => setSelectedAlbum(album)} />
        )}
      </ContentBody>
    </div>
  );
};

export default Photos;
