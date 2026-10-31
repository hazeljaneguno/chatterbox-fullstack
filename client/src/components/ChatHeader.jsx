import "./ChatHeader.css";
import { useState } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  Phone,
  Video,
  Palette,
  Trash2,
} from "lucide-react";

import Avatar from "./Avatar.jsx";

export default function ChatHeader({
  activeChat,
  onlineIds,
  setMobileChatOpen,
  showNotice,
  handleDeleteGroup,
  onOpenBackgroundPicker,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isGroup = activeChat.isGroup;
  const isOnline = onlineIds.has(String(activeChat.id));

  const handleBackgroundClick = () => {
    setMenuOpen(false);
    onOpenBackgroundPicker?.(activeChat);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    handleDeleteGroup(activeChat);
  };

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

        <div className="chat-options">
          <button
            className="icon-button"
            aria-label="Conversation options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((previous) => !previous)}
          >
            <MoreHorizontal size={21} />
          </button>

          {menuOpen && (
            <div className="chat-options-menu">
              <button onClick={handleBackgroundClick}>
                <Palette size={17} />
                <span>Change background</span>
              </button>

              {isGroup && (
                <button
                  className="danger-option"
                  onClick={handleDeleteClick}
                >
                  <Trash2 size={17} />
                  <span>Delete group</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
