
import { useEffect } from "react";
import { MessageCircle, LoaderCircle } from "lucide-react";
import MessageList from "./MessageList/MessageList.jsx";
import "./ConversationBody.css";

export default function ConversationBody({
  activeChat,
  loadingMessages,
  user,
  onReply,
  deleteMessage,
  editingMessageId,
  editDraft,
  savingEdit,
  setEditDraft,
  saveEditedMessage,
  cancelEditing,
  startEditing,
  removeImage,
  bottomRef,
}) {
  // Keep hooks before conditional returns.
  useEffect(() => {
    bottomRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeChat?.id, activeChat?.messages?.length, loadingMessages]);

  if (!activeChat) return null;

  return (
    <div
      className={`conversation-body chat-background-${
        activeChat.background || "default"
      }`}
    >
      <div className="day-divider">
        <span />
        <p>MESSAGES</p>
        <span />
      </div>

      {loadingMessages && (
        <div className="loading-messages">
          <LoaderCircle className="spin" size={18} />
          Loading conversation...
        </div>
      )}

      {!loadingMessages && (activeChat.messages || []).length === 0 && (
        <div className="welcome-state">
          <div className="welcome-icon">
            <MessageCircle size={27} />
          </div>

          <h3>
            Say hello to {activeChat.username || activeChat.name}
          </h3>

          <p>
            Your conversation starts here. Send the first message!
          </p>
        </div>
      )}

      <MessageList
        messages={activeChat.messages || []}
        user={user}
        currentUserId={user?.id ?? user?._id}
        activeChat={activeChat}
        isGroup={Boolean(activeChat.isGroup)}
        onReply={onReply}
        deleteMessage={deleteMessage}
        editingMessageId={editingMessageId}
        editDraft={editDraft}
        savingEdit={savingEdit}
        setEditDraft={setEditDraft}
        saveEditedMessage={saveEditedMessage}
        cancelEditing={cancelEditing}
        startEditing={startEditing}
        removeImage={removeImage}
      />

      <div ref={bottomRef} />
    </div>
  );
}
