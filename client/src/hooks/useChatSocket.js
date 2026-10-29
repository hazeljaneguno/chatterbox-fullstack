
import { useEffect } from "react";

export default function useChatSocket({
  socket,
  setSocketStatus,
  setError,
  setMentionToast,
}) {
  useEffect(() => {
    if (!socket) return;

    function handleConnect() {
      setSocketStatus("connected");
      setError("");
    }

    function handleDisconnect() {
      setSocketStatus("disconnected");
    }

    function handleConnectError(error) {
      setSocketStatus("disconnected");

      setError(
        error.message === "Authentication required" ||
        error.message === "Invalid session"
          ? "Your chat connection needs a fresh login. Please sign in again."
          : "Cannot connect to chat server."
      );
    }

    function handleMentionNotification(notification) {
      setMentionToast({
        senderName: notification.senderName,
        groupName: notification.groupName,
        notification,
      });
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("mention:notification", handleMentionNotification);

    // Sync with the current connection state.
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("mention:notification", handleMentionNotification);
    };
  }, [socket, setSocketStatus, setError, setMentionToast]);
}
