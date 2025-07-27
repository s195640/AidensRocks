import PhotoUploader from "../components/photo-uploader/PhotoUploader";
import UploadRockButton from "../components/upload-rock-form/UploadRockButton";

function Page3() {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <UploadRockButton />
      <h1>Page 3</h1>
      <p>This is the content for Page 3.</p>
      <PhotoUploader />
    </div>
  );
}

export default Page3;
