import { Router } from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

function conversationKey(userA, userB) {
  return [String(userA), String(userB)].sort().join(":");
}

router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Invalid user ID." });
    if (String(req.user._id) === userId) return res.status(400).json({ message: "You cannot start a conversation with yourself." });
    const otherUser = await User.findById(userId).select("_id");
    if (!otherUser) return res.status(404).json({ message: "User not found." });

    const key = conversationKey(req.user._id, otherUser._id);
const messages = await Message.find({ conversationKey: key })
  .sort({ createdAt: 1 })
  .limit(500)
  .populate("sender", "_id username")
  .populate({
    path: "replyTo",
    select: "_id text sender",
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

  createdAt: message.createdAt,

  replyTo: message.replyTo
    ? {
        id: message.replyTo._id.toString(),
        senderId: message.replyTo.sender?._id?.toString(),
        senderName: message.replyTo.sender?.username,
        text: message.replyTo.text,
      }
    : null,
})),
    });
  } catch (error) {
    console.error("Load messages error:", error);
    res.status(500).json({ message: "Could not load messages." });
  }
});

export { conversationKey };
export default router;