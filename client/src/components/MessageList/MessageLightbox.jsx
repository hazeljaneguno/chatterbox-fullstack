import { X } from "lucide-react";

export default function MessageLightbox({
  selectedImage,
  onClose,
}) {
  if (!selectedImage) return null;

  return (
    <div
      className="message-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <button
        type="button"
        className="message-lightbox-close"
        onClick={onClose}
        aria-label="Close image preview"
      >
        <X size={23} />
      </button>

      <div
        className="message-lightbox-content"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={selectedImage.src}
          alt={selectedImage.alt}
        />

        <span>{selectedImage.senderName}</span>
      </div>
    </div>
  );
}
