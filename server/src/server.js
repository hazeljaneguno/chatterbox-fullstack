
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Server } from "socket.io";
import { config } from "./config.js";
import Group from "./models/Group.js";
import GroupMessage from "./models/GroupMessage.js";
import User from "./models/User.js";
import Message from "./models/Message.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { conversationKey } from "./routes/messages.js";
import { configureSocketAuth } from "./utils/socketAuth.js";
import groupRoutes from "./routes/groups.js";
import uploadRoutes from "./routes/uploads.js";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = config.clientUrl
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "chatterbox-api" })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/uploads", uploadRoutes);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  maxHttpBufferSize: 1e6,
});

configureSocketAuth(io);

io.on("connection", (socket) => {
  const userId = socket.user.id;

  console.log("User connected:", socket.id);

  socket.join(`user:${userId}`);

  // ==========================================
  // SEND A GROUP MESSAGE
  // ==========================================
  socket.on("group:message:send", async (payload, callback) => {
    try {
      const { groupId, text, attachment } = payload || {};

      if (!mongoose.isValidObjectId(groupId)) {
        return callback?.({
          ok: false,
          message: "Invalid group.",
        });
      }

      const cleanText = typeof text === "string" ? text.trim() : "";

      const validAttachment =
        attachment &&
        typeof attachment.url === "string" &&
        attachment.url.startsWith("/uploads/") &&
        typeof attachment.originalName === "string" &&
        typeof attachment.mimeType === "string" &&
        Number.isFinite(attachment.size) &&
        attachment.size >= 0;

      if (
        (!cleanText && !validAttachment) ||
        cleanText.length > 4000
      ) {
        return callback?.({
          ok: false,
          message:
            "Send a message or attach a file. Messages must be at most 4000 characters.",
        });
      }

      const group = await Group.findOne({
        _id: groupId,
        members: userId,
      }).select("_id name members");

      if (!group) {
        return callback?.({
          ok: false,
          message: "Group not found or you are not a member.",
        });
      }

      const savedMessage = await GroupMessage.create({
        group: group._id,
        sender: userId,
        text: cleanText,
        ...(validAttachment && {
          attachment: {
            url: attachment.url,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            size: attachment.size,
          },
        }),
      });

      const message = {
        id: savedMessage._id.toString(),
        groupId: group._id.toString(),
        senderId: userId,
        senderName: socket.user.username,
        text: savedMessage.text,
        attachment: validAttachment ? savedMessage.attachment : null,
        createdAt: savedMessage.createdAt,
      };

      for (const memberId of group.members) {
        io.to(`user:${memberId.toString()}`).emit(
          "group:message:new",
          message
        );
      }

      // Find usernames mentioned in the message.
      const mentionedUsernames = [
        ...new Set(
          [...cleanText.matchAll(/@([a-zA-Z0-9_.-]+)/g)].map(
            (match) => match[1].toLowerCase()
          )
        ),
      ];

      if (mentionedUsernames.length > 0) {
        const members = await User.find({
          _id: { $in: group.members },
        }).select("_id username");

        const mentionedMembers = members.filter(
          (member) =>
            mentionedUsernames.includes(member.username.toLowerCase()) &&
            member._id.toString() !== userId
        );

        for (const member of mentionedMembers) {
          io.to(`user:${member._id.toString()}`).emit(
            "mention:notification",
            {
              messageId: savedMessage._id.toString(),
              groupId: group._id.toString(),
              groupName: group.name,
              senderId: userId,
              senderName: socket.user.username,
              text: cleanText,
              createdAt: savedMessage.createdAt,
            }
          );
        }
      }

      // Acknowledge the sent message.
      return callback?.({ ok: true, message });
    } catch (error) {
      console.error("Group message error:", error);

      return callback?.({
        ok: false,
        message: "Unable to send group message.",
      });
    }
  });

  // ==========================================
  // REMOVE AN IMAGE FROM YOUR GROUP MESSAGE
  // ==========================================
  socket.on(
    "group:message:remove-attachment",
    async (payload, callback) => {
      try {
        const { messageId } = payload || {};

        if (!mongoose.isValidObjectId(messageId)) {
          return callback?.({
            ok: false,
            message: "Invalid message ID.",
          });
        }

        // Only the original sender can remove the attachment.
        const message = await GroupMessage.findOne({
          _id: messageId,
          sender: userId,
        });

        if (!message || !message.attachment?.url) {
          return callback?.({
            ok: false,
            message: "Message or attachment not found.",
          });
        }

        // Confirm the sender still belongs to the group.
        const group = await Group.findOne({
          _id: message.group,
          members: userId,
        }).select("_id members");

        if (!group) {
          return callback?.({
            ok: false,
            message: "Group not found or you are not a member.",
          });
        }

        const attachmentUrl = message.attachment.url;
        const prefix = "/uploads/";
        const filename = path.basename(attachmentUrl);

        // Only allow a single filename inside /uploads/.
        if (
          !attachmentUrl.startsWith(prefix) ||
          filename !== attachmentUrl.slice(prefix.length) ||
          filename === "." ||
          filename === ".."
        ) {
          return callback?.({
            ok: false,
            message: "Invalid attachment path.",
          });
        }

        const uploadDirectory = path.resolve(__dirname, "uploads");
        const filePath = path.resolve(uploadDirectory, filename);

        if (path.dirname(filePath) !== uploadDirectory) {
          return callback?.({
            ok: false,
            message: "Invalid attachment path.",
          });
        }

        const hasText =
          typeof message.text === "string" &&
          message.text.trim().length > 0;

        // Remove the attachment from the database.
        if (hasText) {
          // Preserve the text message.
          message.attachment = undefined;
          await message.save();
        } else {
          // An image-only message must be deleted entirely.
          await GroupMessage.deleteOne({
            _id: message._id,
            sender: userId,
          });
        }

        // Delete the uploaded file from disk.
        try {
          await fs.unlink(filePath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error("Could not delete attachment file:", error);
          }
        }

        const updatedMessage = {
          id: message._id.toString(),
          groupId: group._id.toString(),
          attachment: null,
          deleted: !hasText,
        };

        // Notify all connected members of the group.
        for (const memberId of group.members) {
          io.to(`user:${memberId.toString()}`).emit(
            "group:message:attachment-removed",
            updatedMessage
          );
        }

        return callback?.({
          ok: true,
          message: updatedMessage,
        });
      } catch (error) {
        console.error("Remove group attachment error:", error);

        return callback?.({
          ok: false,
          message: "Unable to remove image.",
        });
      }
    }
  );

  // ==========================================
  // DISCONNECT
  // ==========================================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ==========================================
// PRIVATE MESSAGE HISTORY
// ==========================================
app.get("/api/messages/:userId", requireAuth, async (req, res, next) => {
  try {
    const otherUser = await User.findById(req.params.userId).select("_id");

    if (!otherUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (String(otherUser._id) === String(req.user._id)) {
      return res.status(400).json({ message: "Invalid conversation." });
    }

    const key = conversationKey(req.user._id, otherUser._id);

    const messages = await Message.find({ conversationKey: key })
      .sort({ createdAt: 1 })
      .limit(500)
      .populate("sender", "_id username")
      .lean();

    res.json({
      messages: messages.map((message) => ({
        id: message._id.toString(),
        senderId: message.sender._id.toString(),
        senderName: message.sender.username,
        recipientId: message.recipient.toString(),
        text: message.text,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use((error, _req, res, _next) => {
  console.error("API error:", error);
  res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

// ==========================================
// START SERVER
// ==========================================
async function start() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  server.listen(config.port, () => {
    console.log(`Chatterbox API listening on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
