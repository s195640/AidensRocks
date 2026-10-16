import { useUploadRockModal } from "../UploadRockModalProvider";
import styles from "./UploadRockButton.module.css";

export default function UploadRockButton() {
  const { open } = useUploadRockModal();

  return (
    <button onClick={() => open("page_button")} className={styles.uploadBtn}>
      Upload Your Rock
    </button>
  );
}
