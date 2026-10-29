
import {
  ArrowLeft,
  MoreHorizontal,
  Phone,
  Video,
} from "lucide-react";

import Avatar from "./Avatar.jsx";

export default function ChatHeader({
  activeChat,
  onlineIds,
  setMobileChatOpen,
  showNotice,
  handleDeleteGroup,
}) {
  const isGroup = activeChat.isGroup;

  const isOnline = onlineIds.has(String(activeChat.id));

  return (
    <header className="chat-header">
      <button
        className="icon-button mobile-back"
        aria-label="Back to people"
        onClick={() => setMobileChatOpen(false)}
      >
        <ArrowLeft size={20} />
      </button>

      <Avatar
        name={activeChat.username || activeChat.name}
        online={!isGroup && isOnline}
        small
      />

      <div className="chat-header-copy">
        <h2>
          {isGroup
            ? activeChat.name
            : activeChat.username || activeChat.name}
        </h2>

        <p>
          {isGroup
            ? `${activeChat.members?.length || 0} members`
            : isOnline
              ? <><i /> Online now</>
              : "Messages are private to this conversation"}
        </p>
      </div>

      <div className="header-actions">
        {!isGroup && (
          <>
            <button
              className="icon-button"
              aria-label="Voice call"
              onClick={() =>
                showNotice("Voice calling is not enabled yet.")
              }
            >
              <Phone size={19} />
            </button>

            <button
              className="icon-button"
              aria-label="Video call"
              onClick={() =>
                showNotice("Video calling is not enabled yet.")
              }
            >
              <Video size={20} />
            </button>
          </>
        )}

        <span className="action-divider" />

        <button
          className="icon-button"
          aria-label={isGroup ? "Delete group" : "Conversation options"}
          onClick={() => {
            if (isGroup) {
              handleDeleteGroup(activeChat);
            } else {
              showNotice("Conversation options are coming soon.");
            }
          }}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
    </header>
  );
}
