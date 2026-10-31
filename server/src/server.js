
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
import settingsRoutes from "./routes/settings.js";
import conversationRoutes from "./routes/conversations.js";
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

// Parse request data BEFORE mounting routes
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

// API routes
app.use("/api/settings", settingsRoutes);
app.use("/api/conversations", conversationRoutes);

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
app.set("io", io);
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
    const { groupId, text, attachment, replyTo } = payload || {};

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

    // Confirm that the sender belongs to the group.
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

    // Validate the original message being replied to.
    let originalMessage = null;

    if (replyTo) {
      if (!mongoose.isValidObjectId(replyTo)) {
        return callback?.({
          ok: false,
          message: "Invalid reply message.",
        });
      }

      originalMessage = await GroupMessage.findOne({
        _id: replyTo,
        group: group._id,
      }).select("_id");

      if (!originalMessage) {
        return callback?.({
          ok: false,
          message: "Original message not found in this group.",
        });
      }
    }

    // Save the new group message.
    const savedMessage = await GroupMessage.create({
      group: group._id,
      sender: userId,
      replyTo: originalMessage?._id || null,
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

    // Populate the sender and the original replied-to message.
    await savedMessage.populate([
      {
        path: "sender",
        select: "_id username",
      },
      {
        path: "replyTo",
        select: "_id text sender attachment",
        populate: {
          path: "sender",
          select: "_id username",
        },
      },
    ]);

    // Prepare the message for the frontend.
    const message = {
      id: savedMessage._id.toString(),
      groupId: group._id.toString(),

      senderId: savedMessage.sender?._id?.toString(),
      senderName: savedMessage.sender?.username || "User",

      text: savedMessage.text,
      attachment: savedMessage.attachment?.url
        ? savedMessage.attachment
        : null,

      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,

      // Include the original message and its sender.
      replyTo: savedMessage.replyTo
        ? {
            id: savedMessage.replyTo._id.toString(),
            senderId: savedMessage.replyTo.sender?._id?.toString(),
            senderName: savedMessage.replyTo.sender?.username || "User",
            text: savedMessage.replyTo.text,
            attachment: savedMessage.replyTo.attachment?.url
              ? savedMessage.replyTo.attachment
              : null,
          }
        : null,
    };

    // Broadcast to all group members.
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
    return callback?.({
      ok: true,
      message,
    });
  } catch (error) {
    console.error("Group message error:", error);

    return callback?.({
      ok: false,
      message: "Unable to send group message.",
    });
  }
});
  // ==========================================
  // DELETE A GROUP MESSAGE
  // ==========================================
  
  // ==========================================
  // DELETE A GROUP MESSAGE
  // ==========================================
  socket.on("group:message:delete", async (payload, callback) => {
    try {
      const { messageId, deleteType } = payload || {};

      // Validate the message ID.
      if (!mongoose.isValidObjectId(messageId)) {
        return callback?.({
          ok: false,
          message: "Invalid message ID.",
        });
      }

      // Validate the deletion option.
      if (!["deleteForYou", "deleteForEveryone"].includes(deleteType)) {
        return callback?.({
          ok: false,
          message: "Invalid delete option.",
        });
      }

      // Find the group message.
      const message = await GroupMessage.findById(messageId);

      if (!message) {
        return callback?.({
          ok: false,
          message: "Group message not found.",
        });
      }

      // Confirm that the user is still a member of this group.
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

      // ==========================================
      // DELETE FOR YOU
      // ==========================================
      if (deleteType === "deleteForYou") {
        await GroupMessage.updateOne(
          { _id: message._id },
          { $addToSet: { deletedFor: userId } }
        );

        const update = {
          id: message._id.toString(),
          groupId: group._id.toString(),
          deletedFor: String(userId),
          deleteType,
        };

        io.to(`user:${userId}`).emit(
          "group:message:deleted",
          update
        );

        return callback?.({
          ok: true,
          message: update,
        });
      }

      // ==========================================
      // DELETE FOR EVERYONE
      // ==========================================

      // A globally deleted message cannot be deleted again.
      if (message.isDeleted) {
        return callback?.({
          ok: false,
          message: "This message has already been deleted.",
        });
      }

      // Only the original sender can delete for everyone.
      if (String(message.sender) !== String(userId)) {
        return callback?.({
          ok: false,
          message: "Only the sender can delete this message for everyone.",
        });
      }

      // Mark the message as deleted.
      message.isDeleted = true;
      message.deletedBy = userId;
      message.deletedAt = new Date();
      message.text = "";
      message.attachment = undefined;
      message.replyTo = null;

      await message.save();

      const update = {
        id: message._id.toString(),
        groupId: group._id.toString(),
        deleteType,
        isDeleted: true,
        deletedBy: String(userId),
        deletedAt: message.deletedAt,
      };

      // Notify all group members.
      for (const memberId of group.members) {
        io.to(`user:${memberId.toString()}`).emit(
          "group:message:deleted",
          update
        );
      }

      return callback?.({
        ok: true,
        message: update,
      });
    } catch (error) {
      console.error("Group message deletion error:", error);

      return callback?.({
        ok: false,
        message: "Unable to delete group message.",
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
      .populate({
        path: "replyTo",
        select: "_id text sender attachment",
        populate: {
          path: "sender",
          select: "_id username",
        },
      })
      .lean();

    res.json({
      messages: messages.map((message) => ({
        id: message._id.toString(),
        senderId: message.sender?._id?.toString(),
        senderName: message.sender?.username,
        recipientId: message.recipient.toString(),
        text: message.text,
        attachment: message.attachment || null,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,

        replyTo: message.replyTo
          ? {
              id: message.replyTo._id.toString(),
              senderId: message.replyTo.sender?._id?.toString(),
              senderName: message.replyTo.sender?.username,
              text: message.replyTo.text,
              attachment: message.replyTo.attachment || null,
            }
          : null,
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
