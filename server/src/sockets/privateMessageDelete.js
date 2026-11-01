
import mongoose from "mongoose";
import Message from "../models/Message.js";

export function registerPrivateMessageDelete(io, socket) {
  const userId = socket.user.id;

  socket.on("message:delete", async (payload, callback) => {
    try {
      const { messageId, deleteType } = payload || {};

      // Validate message ID.
      if (!mongoose.isValidObjectId(messageId)) {
        return callback?.({
          ok: false,
          message: "Invalid message ID.",
        });
      }

      // Validate deletion option.
      if (
        !["deleteForYou", "deleteForEveryone"].includes(deleteType)
      ) {
        return callback?.({
          ok: false,
          message: "Invalid delete option.",
        });
      }

      // Find the message.
      const message = await Message.findOne({
        _id: messageId,
        $or: [
          { sender: userId },
          { recipient: userId },
        ],
      });

      if (!message) {
        return callback?.({
          ok: false,
          message: "Private message not found.",
        });
      }

      // Delete for the current user only.
      if (deleteType === "deleteForYou") {
        await Message.updateOne(
          { _id: message._id },
          { $addToSet: { deletedFor: userId } }
        );

        const update = {
          id: message._id.toString(),
          deletedFor: String(userId),
          deleteType,
        };

        io.to(`user:${userId}`).emit(
          "message:deleted",
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

      // Only the original sender can delete for everyone.
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
        deleteType,
        isDeleted: true,
        deletedBy: String(userId),
        deletedAt: message.deletedAt,
      };

      // Notify both participants.
      io.to(`user:${message.sender.toString()}`).emit(
        "message:deleted",
        update
      );

      io.to(`user:${message.recipient.toString()}`).emit(
        "message:deleted",
        update
      );

      return callback?.({
        ok: true,
        message: update,
      });
    } catch (error) {
      console.error("Private message deletion error:", error);

      return callback?.({
        ok: false,
        message: "Unable to delete private message.",
      });
    }
  });
}
