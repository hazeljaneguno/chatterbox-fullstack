
import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";

function createConversationKey(userA, userB) {
  return [userA.toString(), userB.toString()]
    .sort()
    .join(":");
}

export function registerPrivateMessageHandlers(io, socket) {
  const userId = socket.user.id;

  socket.on("message:send", async (payload, callback) => {
    try {
      const {
        recipientId,
        text,
        attachment,
        replyTo,
      } = payload || {};

      // Validate recipient ID.
      if (!mongoose.isValidObjectId(recipientId)) {
        return callback?.({
          ok: false,
          message: "Invalid recipient.",
        });
      }

      if (recipientId.toString() === userId.toString()) {
        return callback?.({
          ok: false,
          message: "You cannot send a private message to yourself.",
        });
      }

      const cleanText =
        typeof text === "string" ? text.trim() : "";

      // Validate attachment.
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

      // Check the sender's current permission in MongoDB.
      const sender = await User.findById(userId)
        .select("_id username role canPrivateMessage");

      if (
        !sender ||
        (sender.role !== "admin" &&
          sender.canPrivateMessage !== true)
      ) {
        return callback?.({
          ok: false,
          message:
            "You are not approved to send private messages.",
        });
      }

      // Confirm that the recipient exists.
      const recipient = await User.findById(recipientId)
        .select("_id username");

      if (!recipient) {
        return callback?.({
          ok: false,
          message: "Recipient not found.",
        });
      }

      const key = createConversationKey(
        sender._id,
        recipient._id
      );

      // Validate reply belongs to this conversation.
      let originalMessage = null;

      if (replyTo) {
        if (!mongoose.isValidObjectId(replyTo)) {
          return callback?.({
            ok: false,
            message: "Invalid reply message.",
          });
        }

        originalMessage = await Message.findOne({
          _id: replyTo,
          conversationKey: key,
        }).select("_id");

        if (!originalMessage) {
          return callback?.({
            ok: false,
            message:
              "Original message not found in this conversation.",
          });
        }
      }

      // Save private message.
      const savedMessage = await Message.create({
        conversationKey: key,
        sender: sender._id,
        recipient: recipient._id,
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

      // Format the message for the frontend.
      const message = {
        id: savedMessage._id.toString(),
        senderId: savedMessage.sender._id.toString(),
        senderName: savedMessage.sender.username || "User",
        recipientId: recipient._id.toString(),
        text: savedMessage.text,
        attachment: savedMessage.attachment?.url
          ? savedMessage.attachment
          : null,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt,

        replyTo: savedMessage.replyTo
          ? {
              id: savedMessage.replyTo._id.toString(),
              senderId:
                savedMessage.replyTo.sender?._id?.toString(),
              senderName:
                savedMessage.replyTo.sender?.username || "User",
              text: savedMessage.replyTo.text,
              attachment:
                savedMessage.replyTo.attachment?.url
                  ? savedMessage.replyTo.attachment
                  : null,
            }
          : null,
      };

      // Send to both participants.
      io.to(`user:${sender._id.toString()}`).emit(
        "message:new",
        message
      );

      io.to(`user:${recipient._id.toString()}`).emit(
        "message:new",
        message
      );

      return callback?.({
        ok: true,
        message,
      });
    } catch (error) {
      console.error("Private message error:", error);

      return callback?.({
        ok: false,
        message: "Unable to send private message.",
      });
    }
  });
}
