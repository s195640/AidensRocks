import { useState } from "react";
import PhotoAlbum from "../photo-album/PhotoAlbum";
import PhotoCollection from "../photo-album/PhotoCollection";

const BirthdayAlbums = ({ title = "Photo Albums" }) => {
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  return selectedAlbum ? (
    <PhotoCollection
      album={selectedAlbum}
      onBack={() => setSelectedAlbum(null)}
    />
  ) : (
    <PhotoAlbum
      tag="birthday"
      title={title}
      onAlbumClick={(album) => setSelectedAlbum(album)}
    />
  );
};

export default BirthdayAlbums;
