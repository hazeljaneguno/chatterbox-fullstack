
import User from "../models/User.js";

export function registerPresenceHandlers(io, socket) {
  const userId = String(socket.user.id);
  const userRoom = `user:${userId}`;

  // Remember which account owns this socket connection.
  socket.data.userId = userId;

  async function announceOnline() {
    try {
      const user = await User.findById(userId).select(
        "username activeStatus"
      );

      if (!user || !user.activeStatus) return;

      // Tell other connected users that this user is online.
      socket.broadcast.emit("presence:update", {
        userId,
        username: user.username,
        isOnline: true,
        lastSeen: null,
      });
    } catch (error) {
      console.error("Presence online error:", error);
    }
  }

  announceOnline();

  socket.on("disconnect", async () => {
    try {
      // Check whether this user still has another connected device or tab.
      const remainingSockets = await io.in(userRoom).fetchSockets();

      if (remainingSockets.length > 0) return;

      const user = await User.findByIdAndUpdate(
        userId,
        { lastSeen: new Date() },
        { new: true }
      ).select("username activeStatus lastSeen");

      if (!user || !user.activeStatus) return;

      io.emit("presence:update", {
        userId,
        username: user.username,
        isOnline: false,
        lastSeen: user.lastSeen,
      });
    } catch (error) {
      console.error("Presence offline error:", error);
    }
  });
}
