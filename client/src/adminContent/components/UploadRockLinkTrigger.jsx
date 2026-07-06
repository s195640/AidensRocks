import { useUploadRockModal } from "../UploadRockModalProvider";

export default function UploadRockLinkTrigger() {
  const { open } = useUploadRockModal();

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        open();
      }}
    >
      here
    </a>
  );
}
