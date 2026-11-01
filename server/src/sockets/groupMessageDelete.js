
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

export function registerGroupMessageDelete(io, socket) {
  const userId = socket.user.id;

  socket.on("group:message:delete", async (payload, callback) => {
    try {
      const { messageId, deleteType } = payload || {};

      if (!mongoose.isValidObjectId(messageId)) {
        return callback?.({
          ok: false,
          message: "Invalid message ID.",
        });
      }

      if (!["deleteForYou", "deleteForEveryone"].includes(deleteType)) {
        return callback?.({
          ok: false,
          message: "Invalid delete option.",
        });
      }

      const message = await GroupMessage.findById(messageId);

      if (!message) {
        return callback?.({
          ok: false,
          message: "Group message not found.",
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

      // Delete for the current user only.
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

      // Delete for everyone.
      if (message.isDeleted) {
        return callback?.({
          ok: false,
          message: "This message has already been deleted.",
        });
      }

      if (String(message.sender) !== String(userId)) {
        return callback?.({
          ok: false,
          message:
            "Only the sender can delete this message for everyone.",
        });
      }

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
}
