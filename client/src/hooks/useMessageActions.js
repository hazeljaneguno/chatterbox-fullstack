
import { useCallback } from "react";
import { api } from "../api.js";
export default function useMessageActions({
  activeChat,
  draft,
  setDraft,
  replyTo,
  setReplyTo,
  inputRef,
  socketRef,
  showNotice,
  setError,
  setMentionSuccessToast,
  editDraft,
  setEditDraft,
  setEditingMessageId,
  setSavingEdit,
  savingEdit,
}) {
  // Reply to a message.
  const handleReply = useCallback((message) => {
    setReplyTo(message);
    inputRef.current?.focus();
  }, [setReplyTo, inputRef]);

  // Send private and group messages.
  const sendMessage = useCallback(async (event, selectedFile = null) => {
    event.preventDefault();

    const text = draft.trim();

    if ((!text && !selectedFile) || !activeChat) return;

    if (!socketRef.current?.connected) {
      setError("You're offline from the chat server. Reconnect and try again.");
      throw new Error("You're offline from the chat server.");
    }

    setError("");

    const isGroup = activeChat.isGroup;
    const groupName = activeChat.name || "your group";

    const mentions = isGroup
      ? [...new Set(text.match(/@[a-zA-Z0-9_.-]+/g) || [])]
      : [];

    const eventName = isGroup
      ? "group:message:send"
      : "message:send";

    try {
      let attachment = null;

      // Upload attachment first.
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await api.uploadFile(formData);
        attachment = response.attachment;

        if (!attachment?.url) {
          throw new Error("The server did not return the uploaded file.");
        }
      }

      const replyMessageId = replyTo
        ? replyTo.id ?? replyTo._id ?? null
        : null;

      const payload = isGroup
        ? {
            groupId: activeChat.id,
            text,
            attachment,
            replyTo: replyMessageId,
          }
        : {
            recipientId: activeChat.id,
            text,
            attachment,
            replyTo: replyMessageId,
          };

      // Send through Socket.IO.
      const result = await new Promise((resolve, reject) => {
        socketRef.current.timeout(5000).emit(
          eventName,
          payload,
          (timeoutError, response) => {
            if (timeoutError) {
              reject(
                new Error("The server did not respond. Please try again.")
              );
              return;
            }

            if (!response?.ok) {
              reject(
                new Error(response?.message || "Message could not be sent.")
              );
              return;
            }

            resolve(response);
          }
        );
      });

      // Clear composer only after successful sending.
      setDraft("");
      setReplyTo(null);

      if (mentions.length > 0) {
        setMentionSuccessToast(
          `Message sent! You mentioned ${mentions.join(", ")} in ${groupName}.`
        );

        setTimeout(() => setMentionSuccessToast(""), 4000);
      }

      inputRef.current?.focus();

      return result;
    } catch (error) {
      setError(error.message || "Unable to send your message.");
      throw error;
    }
  }, [
    activeChat,
    draft,
    replyTo,
    socketRef,
    inputRef,
    setDraft,
    setReplyTo,
    setError,
    setMentionSuccessToast,
  ]);

  // Start editing a message.
  const startEditing = useCallback((message) => {
    setEditingMessageId(message.id ?? message._id);
    setEditDraft(message.text || "");
    setError("");
  }, [setEditingMessageId, setEditDraft, setError]);

  // Cancel editing.
  const cancelEditing = useCallback(() => {
    setEditingMessageId("");
    setEditDraft("");
    setSavingEdit(false);
  }, [setEditingMessageId, setEditDraft, setSavingEdit]);

  // Save an edited message.
  const saveEditedMessage = useCallback((message) => {
    const text = editDraft.trim();
    const messageId = message?.id ?? message?._id;

    if (!text || !messageId || savingEdit) return;

    const currentSocket = socketRef.current;

    if (!currentSocket?.connected) {
      setError("You're offline. Please reconnect and try again.");
      return;
    }

    setSavingEdit(true);
    setError("");

    const eventName = activeChat?.isGroup
      ? "group:message:edit"
      : "message:edit";

    currentSocket.timeout(5000).emit(
      eventName,
      { messageId, text },
      (timeoutError, result) => {
        setSavingEdit(false);

        if (timeoutError) {
          setError("The server did not respond. Please try again.");
          return;
        }

        if (!result?.ok) {
          setError(
            result?.message || "Message could not be edited."
          );
          return;
        }

        cancelEditing();
      }
    );
  }, [
    editDraft,
    savingEdit,
    socketRef,
    activeChat,
    setError,
    setSavingEdit,
    cancelEditing,
  ]);

  // Delete private and group messages.
  const handleDeleteMessage = useCallback((message, deleteType) => {
    const currentSocket = socketRef.current;

    if (!currentSocket?.connected) {
      setError("You're offline. Please reconnect and try again.");
      return;
    }

    const messageId = message.id ?? message._id;

    if (!messageId || !activeChat) {
      setError("Message could not be identified.");
      return;
    }

    const eventName = activeChat.isGroup
      ? "group:message:delete"
      : "message:delete";

    setError("");

    currentSocket.timeout(5000).emit(
      eventName,
      { messageId, deleteType },
      (timeoutError, result) => {
        if (timeoutError) {
          setError("The server did not respond. Please try again.");
          return;
        }

        if (!result?.ok) {
          setError(result?.message || "Unable to delete message.");
          return;
        }

        showNotice(
          deleteType === "deleteForEveryone"
            ? "Message deleted for everyone."
            : "Message deleted for you."
        );
      }
    );
  }, [activeChat, socketRef, setError, showNotice]);

  // Remove an image attachment from a group message.
  const removeImage = useCallback((messageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this image?"
    );

    if (!confirmed) return;

    const currentSocket = socketRef.current;

    if (!currentSocket?.connected) {
      setError("You're offline. Please reconnect and try again.");
      return;
    }

    setError("");

    currentSocket.timeout(5000).emit(
      "group:message:remove-attachment",
      { messageId },
      (timeoutError, result) => {
        if (timeoutError) {
          setError("The server did not respond. Please try again.");
          return;
        }

        if (!result?.ok) {
          setError(result?.message || "Unable to remove image.");
        }
      }
    );
  }, [socketRef, setError]);

  return {
    sendMessage,
    handleReply,
    handleDeleteMessage,
    startEditing,
    cancelEditing,
    saveEditedMessage,
    removeImage,
  };
}
