
import { useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

import MessageBubble from "./MessageBubble";
import MessageLightbox from "./MessageLightbox";

import {
  sameId,
  getMessageId,
  getAttachmentUrl,
} from "../../utils/messageHelpers";

import "./MessageList.css";

export default function MessageList({
  messages = [],
  user,
  currentUserId,
  activeChat,
  isGroup = false,
  editingMessageId,
  editDraft,
  savingEdit,
  setEditDraft,
  saveEditedMessage,
  cancelEditing,
  startEditing,
  onReply,
  removeImage,
  deleteMessage,
}) {
  const swipeStartRef = useRef(null);
  const messageRefs = useRef(new Map());

  const [selectedImage, setSelectedImage] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] =
    useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState("deleteForYou");

  const loggedInUserId =
    currentUserId ?? user?.id ?? user?._id ?? user?.userId;

  const messageMap = new Map(
    messages
      .filter((message) => getMessageId(message) != null)
      .map((message) => [
        String(getMessageId(message)),
        message,
      ])
  );

  function getSenderId(message) {
    if (message.senderId != null) {
      return message.senderId;
    }

    if (
      typeof message.sender === "object" &&
      message.sender !== null
    ) {
      return message.sender._id ?? message.sender.id;
    }

    return message.sender;
  }

  function isMine(message) {
    return sameId(getSenderId(message), loggedInUserId);
  }

  function getReplyTarget(message) {
    const replyId =
      typeof message.replyTo === "object"
        ? getMessageId(message.replyTo)
        : message.replyTo;

    if (replyId == null) return null;

    return (
      messageMap.get(String(replyId)) ??
      (typeof message.replyTo === "object"
        ? message.replyTo
        : null)
    );
  }

  function jumpToMessage(messageId) {
    if (!messageId) return;

    const target = messageRefs.current.get(String(messageId));

    if (!target) {
      console.warn("Original message is not currently loaded.");
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setHighlightedMessageId(String(messageId));

    window.setTimeout(() => {
      setHighlightedMessageId((current) =>
        current === String(messageId) ? null : current
      );
    }, 1800);
  }

  function handleTouchStart(event, message) {
    const touch = event.touches?.[0];

    if (!touch) return;

    swipeStartRef.current = {
      messageId: getMessageId(message),
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event, message) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (
      !start ||
      !sameId(start.messageId, getMessageId(message))
    ) {
      return;
    }

    if (isMine(message) || message.isDeleted) return;

    const touch = event.changedTouches?.[0];

    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (
      deltaX < -65 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.3
    ) {
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

  function handleDelete(message, type) {
    if (!deleteMessage) {
      console.error("deleteMessage function was not provided.");
      return;
    }

    deleteMessage(message, type);

    setOpenMenuId(null);
    setConfirmDeleteId(null);
  }

  return (
    <>
      <div className="message-list">
        {messages.map((message, index) => {
          const mine = isMine(message);
          const deleted = message.isDeleted === true;

          const rawMessageId = getMessageId(message);

          const messageId =
            rawMessageId != null
              ? String(rawMessageId)
              : `message-${index}`;

          const menuOpen = openMenuId === messageId;

          const confirmingDelete =
            confirmDeleteId === messageId;

          const editing = sameId(
            editingMessageId,
            rawMessageId
          );

          const replyTarget = getReplyTarget(message);

          const messageTime = (
            message.updatedAt || message.createdAt
          )
            ? new Date(
                message.updatedAt || message.createdAt
              ).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            : "";

          return (
            <div
              key={messageId}
              ref={(element) => {
                if (element && rawMessageId != null) {
                  messageRefs.current.set(
                    messageId,
                    element
                  );
                } else {
                  messageRefs.current.delete(messageId);
                }
              }}
              className={`message-row ${
                mine ? "message-mine" : "message-theirs"
              } ${
                sameId(
                  highlightedMessageId,
                  rawMessageId
                )
                  ? "message-highlighted"
                  : ""
              }`}
              onTouchStart={(event) =>
                handleTouchStart(event, message)
              }
              onTouchEnd={(event) =>
                handleTouchEnd(event, message)
              }
              onTouchCancel={handleTouchCancel}
            >
              <MessageBubble
                message={message}
                mine={mine}
                user={user}
                loggedInUserId={loggedInUserId}
                isGroup={isGroup}
                messageTime={messageTime}
                replyTarget={replyTarget}
                editing={editing}
                editDraft={editDraft}
                savingEdit={savingEdit}
                setEditDraft={setEditDraft}
                saveEditedMessage={saveEditedMessage}
                cancelEditing={cancelEditing}
                startEditing={startEditing}
                onReply={() => onReply?.(message)}
                removeImage={removeImage}
                onOpenImage={openImage}
                jumpToMessage={jumpToMessage}
                menuOpen={menuOpen}
                onToggleMenu={() =>
                  setOpenMenuId(
                    menuOpen ? null : messageId
                  )
                }
                confirmDelete={confirmingDelete}
                deleteType={deleteType}
                onDeleteForYou={() => {
                  setDeleteType("deleteForYou");
                  setConfirmDeleteId(messageId);
                  setOpenMenuId(null);
                }}
                onDeleteForEveryone={() => {
                  setDeleteType("deleteForEveryone");
                  setConfirmDeleteId(messageId);
                  setOpenMenuId(null);
                }}
                onConfirmDelete={(targetMessage) =>
                  handleDelete(targetMessage, deleteType)
                }
                onCancelDelete={() =>
                  setConfirmDeleteId(null)
                }
              />
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

      <MessageLightbox
        selectedImage={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
