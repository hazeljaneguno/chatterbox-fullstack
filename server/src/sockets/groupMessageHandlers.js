
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";

export function registerGroupMessageHandlers(io, socket) {
  const userId = socket.user.id;

  socket.on("group:message:send", async (payload, callback) => {
    try {
      const { groupId, text, attachment, replyTo } = payload || {};

      if (!mongoose.isValidObjectId(groupId)) {
        return callback?.({
          ok: false,
          message: "Invalid group.",
        });
      }

      const cleanText =
        typeof text === "string" ? text.trim() : "";

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

        replyTo: savedMessage.replyTo
          ? {
              id: savedMessage.replyTo._id.toString(),
              senderId:
                savedMessage.replyTo.sender?._id?.toString(),
              senderName:
                savedMessage.replyTo.sender?.username || "User",
              text: savedMessage.replyTo.text,
              attachment: savedMessage.replyTo.attachment?.url
                ? savedMessage.replyTo.attachment
                : null,
            }
          : null,
      };

      // Broadcast to group members.
      for (const memberId of group.members) {
        io.to(`user:${memberId.toString()}`).emit(
          "group:message:new",
          message
        );
      }

      // Find mentioned usernames.
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
            mentionedUsernames.includes(
              member.username.toLowerCase()
            ) &&
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
}
