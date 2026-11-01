
import { Router } from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { conversationKey } from "./messages.js";

const router = Router();

// GET private message history
router.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid conversation.",
      });
    }

    const otherUser = await User.findById(userId).select("_id");

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (String(otherUser._id) === String(req.user._id)) {
      return res.status(400).json({
        message: "Invalid conversation.",
      });
    }

    const key = conversationKey(req.user._id, otherUser._id);

    const messages = await Message.find({
      conversationKey: key,
    })
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

    return res.json({
      messages: messages.map((message) => ({
        id: message._id.toString(),
        senderId: message.sender?._id?.toString(),
        senderName: message.sender?.username,
        recipientId: message.recipient?.toString(),
        text: message.text,
        attachment: message.attachment || null,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,

        replyTo: message.replyTo
          ? {
              id: message.replyTo._id.toString(),
              senderId:
                message.replyTo.sender?._id?.toString(),
              senderName:
                message.replyTo.sender?.username,
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

export default router;
