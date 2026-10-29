
import { useEffect } from "react";
import { sameId } from "../utils/chatHelpers.js";

export default function useChatMessages({
  socket,
  user,
  activeIdRef,
  setChats,
  setOnlineIds,
}) {
  useEffect(() => {
    if (!socket || !user) return;

    function handleDirectMessage(message) {
      const otherId = sameId(message.senderId, user.id)
        ? message.recipientId
        : message.senderId;

      setChats((previous) =>
        previous.map((chat) => {
          if (chat.isGroup || !sameId(chat.id, otherId)) {
            return chat;
          }

          const messages = chat.messages || [];

          if (messages.some((item) => sameId(item.id, message.id))) {
            return chat;
          }

          const isActive = sameId(activeIdRef.current, otherId);
          const isOwnMessage = sameId(message.senderId, user.id);

          return {
            ...chat,
            messages: [...messages, message],
            unread:
              isActive || isOwnMessage
                ? chat.unread || 0
                : (chat.unread || 0) + 1,
          };
        })
      );
    }

    function handleGroupMessage(message) {
      setChats((previous) =>
        previous.map((chat) => {
          if (!chat.isGroup || !sameId(chat.id, message.groupId)) {
            return chat;
          }

          const messages = chat.messages || [];

          if (messages.some((item) => sameId(item.id, message.id))) {
            return chat;
          }

          const isActive = sameId(activeIdRef.current, message.groupId);
          const isOwnMessage = sameId(message.senderId, user.id);

          return {
            ...chat,
            messages: [...messages, message],
            unread:
              isActive || isOwnMessage
                ? chat.unread || 0
                : (chat.unread || 0) + 1,
          };
        })
      );
    }

    function handleMessageUpdated(message) {
      const otherId = sameId(message.senderId, user.id)
        ? message.recipientId
        : message.senderId;

      setChats((previous) =>
        previous.map((chat) =>
          !chat.isGroup && sameId(chat.id, otherId)
            ? {
                ...chat,
                messages: (chat.messages || []).map((item) =>
                  sameId(item.id, message.id)
                    ? { ...item, ...message }
                    : item
                ),
              }
            : chat
        )
      );
    }

    function handlePresenceUpdate({ userId, online }) {
      setOnlineIds((previous) => {
        const next = new Set(previous);

        if (online) {
          next.add(String(userId));
        } else {
          next.delete(String(userId));
        }

        return next;
      });
    }

    socket.on("message:new", handleDirectMessage);
    socket.on("group:message:new", handleGroupMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("message:new", handleDirectMessage);
      socket.off("group:message:new", handleGroupMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [socket, user, activeIdRef, setChats, setOnlineIds]);
}
