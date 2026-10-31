import { X } from "lucide-react";

export default function ReplyPreview({ replyTo, onCancel }) {
  if (!replyTo) return null;

  return (
    <div className="reply-preview">
      <div className="reply-preview-content">
        <strong>Replying to {replyTo.senderName || "message"}</strong>
        <p>
          {replyTo.text ||
            (replyTo.attachment?.mimeType?.startsWith("image/")
              ? "📷 Photo"
              : "Attachment")}
        </p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel reply"
      >
        <X size={18} />
      </button>
    </div>
  );
}
