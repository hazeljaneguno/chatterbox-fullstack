
import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, "../uploads");

export function registerGroupAttachmentHandlers(io, socket) {
  const userId = socket.user.id;

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

        if (hasText) {
          message.attachment = undefined;
          await message.save();
        } else {
          await GroupMessage.deleteOne({
            _id: message._id,
            sender: userId,
          });
        }

        try {
          await fs.unlink(filePath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error(
              "Could not delete attachment file:",
              error
            );
          }
        }

        const updatedMessage = {
          id: message._id.toString(),
          groupId: group._id.toString(),
          attachment: null,
          deleted: !hasText,
        };

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
}
