
import { API_URL } from "../api";

export function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function getMessageId(message) {
  return message?.id ?? message?._id;
}

export function formatTime(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getAttachmentUrl(attachment) {
  if (!attachment?.url) return "";

  if (
    attachment.url.startsWith("http://") ||
    attachment.url.startsWith("https://")
  ) {
    return attachment.url;
  }

  return `${API_URL}${attachment.url.startsWith("/") ? "" : "/"}${attachment.url}`;
}

export function getReplyPreview(message) {
  if (!message) return "Message unavailable";

  if (message.isDeleted) {
    return "This message was deleted";
  }

  if (message.text?.trim()) return message.text;

  if (message.attachment?.mimeType?.startsWith("image/")) {
    return "📷 Photo";
  }

  if (message.attachment) return "📎 Attachment";

  return "Message";
}
