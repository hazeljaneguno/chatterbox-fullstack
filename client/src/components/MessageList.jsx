
import { useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Reply,
  Pencil,
  X,
  Check as SaveIcon,
  Image as ImageIcon,
  FileText,
  ZoomIn,
} from "lucide-react";

import Avatar from "./Avatar";
import MentionText from "./MentionText";
import { API_URL } from "../api";
import "./MessageList.css";

function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function formatTime(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAttachmentUrl(attachment) {
  if (!attachment?.url) return "";

  if (
    attachment.url.startsWith("http://") ||
    attachment.url.startsWith("https://")
  ) {
    return attachment.url;
  }

  return `${API_URL}${attachment.url.startsWith("/") ? "" : "/"}${attachment.url}`;
}

function getReplyPreview(message) {
  if (!message) return "Message unavailable";

  if (message.text?.trim()) return message.text;

  if (message.attachment?.mimeType?.startsWith("image/")) {
    return "📷 Photo";
  }

  if (message.attachment) return "📎 Attachment";

  return "Message";
}

export default function MessageList({
  messages = [],
  user,
  currentUserId,
  activeChat,
  editingMessageId,
  editDraft,
  savingEdit,
  setEditDraft,
  saveEditedMessage,
  cancelEditing,
  startEditing,
  onReply,
  removeImage,
}) {
  const swipeStartRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);

  const loggedInUserId =
    currentUserId ?? user?.id ?? user?._id ?? user?.userId;

  const messageMap = new Map(
    messages.map((message) => [String(message.id), message])
  );

  function getSenderId(message) {
    return message.senderId ?? message.sender?._id ?? message.sender?.id;
  }

  function isMine(message) {
    return sameId(getSenderId(message), loggedInUserId);
  }

  function getReplyTarget(message) {
    const replyId =
      typeof message.replyTo === "object"
        ? message.replyTo?.id ?? message.replyTo?._id
        : message.replyTo;

    if (replyId == null) return null;

    return (
      messageMap.get(String(replyId)) ??
      (typeof message.replyTo === "object" ? message.replyTo : null)
    );
  }

  function handleTouchStart(event, message) {
    const touch = event.touches?.[0];
    if (!touch) return;

    swipeStartRef.current = {
      messageId: message.id,
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event, message) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || !sameId(start.messageId, message.id)) return;
    if (isMine(message)) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // A deliberate left swipe, not a vertical scroll.
    if (deltaX < -65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      onReply?.(message);
    }
  }

  function handleTouchCancel() {
    swipeStartRef.current = null;
  }

  function openImage(attachment, message) {
    setSelectedImage({
      src: getAttachmentUrl(attachment),
      alt: attachment.originalName || "Message image",
      senderName: message.senderName || "Image",
    });
  }

  function handleLightboxKeyDown(event) {
    if (event.key === "Escape") setSelectedImage(null);
  }

  return (
    <>
      <div className="message-list">
        {messages.map((message) => {
          const mine = isMine(message);
          const editing = sameId(editingMessageId, message.id);
          const attachment = message.attachment;
          const attachmentUrl = getAttachmentUrl(attachment);
          const isImage = attachment?.mimeType?.startsWith("image/");
          const replyTarget = getReplyTarget(message);

          const messageTime = formatTime(
            message.updatedAt || message.createdAt
          );

          return (
            <div
              key={message.id}
              className={`message-row ${mine ? "message-mine" : "message-theirs"}`}
              onTouchStart={(event) => handleTouchStart(event, message)}
              onTouchEnd={(event) => handleTouchEnd(event, message)}
              onTouchCancel={handleTouchCancel}
            >
              {!mine && (
                <div className="message-avatar-space">
                  <Avatar user={message.sender} name={message.senderName} />
                </div>
              )}

              <div className="message-content">
                {!mine && (
                  <div className="message-heading">
                    <span className="sender-name">
                      {message.senderName || "User"}
                    </span>
                    <span className="message-time">{messageTime}</span>
                  </div>
                )}

                <div className="message-bubble-wrap">
                  <div
                    className={`message-bubble ${
                      mine ? "bubble-mine" : "bubble-theirs"
                    } ${editing ? "bubble-editing" : ""}`}
                  >
                    {replyTarget && (
                      <div className="reply-quote">
                        <div className="reply-quote-heading">
                          <Reply size={14} />
                          <span>
                            {replyTarget.senderName ||
                              (sameId(getSenderId(replyTarget), loggedInUserId)
                                ? "You"
                                : "Message")}
                          </span>
                        </div>

                        <p className="reply-quote-text">
                          {getReplyPreview(replyTarget)}
                        </p>
                      </div>
                    )}

                    {editing ? (
                      <div className="message-edit-form">
                        <textarea
                          className="message-edit-input"
                          value={editDraft}
                          onChange={(event) =>
                            setEditDraft(event.target.value.slice(0, 4000))
                          }
                          maxLength={4000}
                          rows={Math.min(
                            6,
                            Math.max(2, (editDraft || "").split("\n").length)
                          )}
                          autoFocus
                          aria-label="Edit message"
                        />

                        <div className="message-edit-footer">
                          <span className="edit-character-count">
                            {(editDraft || "").length}/4000
                          </span>

                          <div className="message-edit-actions">
                            <button
                              type="button"
                              className="message-action-button cancel-edit-button"
                              onClick={cancelEditing}
                              disabled={savingEdit}
                            >
                              <X size={15} />
                              Cancel
                            </button>

                            <button
                              type="button"
                              className="message-action-button save-edit-button"
                              onClick={() => saveEditedMessage(message)}
                              disabled={savingEdit || !editDraft.trim()}
                            >
                              <SaveIcon size={15} />
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {attachment && (
                          <div className="message-attachment">
                            {isImage ? (
                              <button
                                type="button"
                                className="message-image-button"
                                onClick={() => openImage(attachment, message)}
                                aria-label="View image larger"
                              >
                                <img
                                  src={attachmentUrl}
                                  alt={attachment.originalName || "Attachment"}
                                  className="message-image"
                                  loading="lazy"
                                />
                                <span className="image-zoom-hint">
                                  <ZoomIn size={16} />
                                  View image
                                </span>
                              </button>
                            ) : (
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="message-file-link"
                              >
                                <span className="message-file-icon">
                                  <FileText size={20} />
                                </span>
                                <span className="message-file-details">
                                  <strong>
                                    {attachment.originalName || "Download file"}
                                  </strong>
                                  <small>Open attachment</small>
                                </span>
                              </a>
                            )}

                            {mine && isImage && removeImage && (
                              <button
                                type="button"
                                className="remove-message-image"
                                onClick={() => removeImage(message)}
                                aria-label="Remove image attachment"
                                title="Remove image"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        )}

                        {message.text?.trim() && (
                          <div className="message-text">
                            <MentionText text={message.text} />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {!editing && (
                    <div className="message-actions">
                      {!mine && (
                        <button
                          type="button"
                          className="message-action-icon reply-message-button"
                          onClick={() => onReply?.(message)}
                          title="Reply to message"
                          aria-label="Reply to message"
                        >
                          <Reply size={16} />
                        </button>
                      )}

                      {mine && (
                        <button
                          type="button"
                          className="message-action-icon edit-message-button"
                          onClick={() => startEditing(message)}
                          title="Edit message"
                          aria-label="Edit message"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {mine && (
                  <div className="message-meta">
                    {message.updatedAt &&
                      message.createdAt &&
                      new Date(message.updatedAt).getTime() >
                        new Date(message.createdAt).getTime() && (
                        <span className="edited-label">Edited</span>
                      )}

                    <span className="message-time">{messageTime}</span>

                    <span
                      className={`read-check ${
                        message.read ? "message-read" : ""
                      }`}
                      title={message.read ? "Read" : "Sent"}
                      aria-label={message.read ? "Read" : "Sent"}
                    >
                      {message.read ? (
                        <CheckCheck size={15} />
                      ) : (
                        <Check size={15} />
                      )}
                    </span>
                  </div>
                )}
              </div>

              {mine && (
                <div className="message-avatar-space">
                  <Avatar user={user} />
                </div>
              )}
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="message-empty-state">
            <div className="message-empty-icon">
              <ImageIcon size={24} />
            </div>
            <strong>Start a conversation</strong>
            <p>Send a message to get things going.</p>
          </div>
        )}
      </div>

      {selectedImage && (
        <div
          className="message-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setSelectedImage(null)}
          onKeyDown={handleLightboxKeyDown}
          tabIndex={-1}
        >
          <button
            type="button"
            className="message-lightbox-close"
            onClick={() => setSelectedImage(null)}
            aria-label="Close image preview"
          >
            <X size={23} />
          </button>

          <div
            className="message-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={selectedImage.src} alt={selectedImage.alt} />
            <span>{selectedImage.senderName}</span>
          </div>
        </div>
      )}
    </>
  );
}