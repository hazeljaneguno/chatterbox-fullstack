
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

export function registerGroupMessageEdit(io, socket) {
  const userId = socket.user.id;

  socket.on("group:message:edit", async (payload, callback) => {
    try {
      const { messageId, text } = payload || {};

      if (!mongoose.isValidObjectId(messageId)) {
        return callback?.({
          ok: false,
          message: "Invalid message ID.",
        });
      }

      const cleanText =
        typeof text === "string" ? text.trim() : "";

      if (!cleanText || cleanText.length > 4000) {
        return callback?.({
          ok: false,
          message: "Message must contain 1–4000 characters.",
        });
      }

      const message = await GroupMessage.findOne({
        _id: messageId,
        sender: userId,
      });

      if (!message || message.isDeleted) {
        return callback?.({
          ok: false,
          message: "Message not found or cannot be edited.",
        });
      }

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

      message.text = cleanText;
      await message.save();

      const updatedMessage = {
        id: message._id.toString(),
        groupId: group._id.toString(),
        senderId: userId,
        senderName: socket.user.username,
        text: message.text,
        attachment: message.attachment?.url
          ? message.attachment
          : null,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        edited: true,
      };

      for (const memberId of group.members) {
        io.to(`user:${memberId.toString()}`).emit(
          "group:message:edited",
          updatedMessage
        );
      }

      return callback?.({
        ok: true,
        message: updatedMessage,
      });
    } catch (error) {
      console.error("Group message edit error:", error);

      return callback?.({
        ok: false,
        message: "Unable to edit group message.",
      });
    }
  });
}
