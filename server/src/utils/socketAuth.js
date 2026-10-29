import jwt from "jsonwebtoken";
import { config } from "../config.js";
import User from "../models/User.js";

export function configureSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      // The frontend uses the same HTTP-only cookie for Socket.IO.
      // Socket.IO's handshake request includes the cookie header; parse it without exposing the token to JS.
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookieToken = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("chatterbox_session="))
        ?.slice("chatterbox_session=".length);
      const chosenToken = token || cookieToken;
      if (!chosenToken) return next(new Error("Authentication required"));
      const payload = jwt.verify(decodeURIComponent(chosenToken), config.jwtSecret);
      const user = await User.findById(payload.userId).select("_id username email");
      if (!user) return next(new Error("User not found"));
      socket.user = { id: user._id.toString(), username: user.username, email: user.email };
      next();
    } catch {
      next(new Error("Invalid session"));
    }
  });
}