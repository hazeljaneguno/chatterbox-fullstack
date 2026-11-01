
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import ConversationSettings from "../models/ConversationSettings.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { conversationKey } from "./messages.js";

const router = Router();

const allowedBackgrounds = [
  "default",
  "lavender",
  "ocean",
  "sunset",
  "forest",
  "rose",
  "mint",
  "peach",
  "night",
  "sky",
];

// Get shared private conversation settings
router.get("/:userId/settings", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (
      !mongoose.isValidObjectId(userId) ||
      String(userId) === String(req.user._id)
    ) {
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

    const key = conversationKey(req.user._id, otherUser._id);=

    const settings = await ConversationSettings.findOne({
      conversationKey: key,
    }).lean();

    return res.json({
      background: settings?.background || "default",
    });
  } catch (error) {
    next(error);
  }
});

// Change shared private conversation background
router.patch("/:userId/settings", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const background = req.body?.background;

    if (
      !mongoose.isValidObjectId(userId) ||
      String(userId) === String(req.user._id)
    ) {
      return res.status(400).json({
        message: "Invalid conversation.",
      });
    }

    if (!allowedBackgrounds.includes(background)) {
      return res.status(400).json({
        message: "Invalid background.",
      });
    }

    const otherUser = await User.findById(userId).select("_id username");

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const key = conversationKey(req.user._id, otherUser._id);


    const settings = await ConversationSettings.findOneAndUpdate(
      { conversationKey: key },
      {
        $set: {
          background,
          updatedBy: req.user._id,
        },
        $setOnInsert: {
          conversationKey: key,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    const io = req.app.get("io");

    const update = {
      conversationKey: key,
      background: settings.background,
      changedBy: {
        id: String(req.user._id),
        username: req.user.username,
      },
    };

    io?.to(`user:${req.user._id}`).emit(
      "conversation:background:updated",
      update
    );

    io?.to(`user:${otherUser._id}`).emit(
      "conversation:background:updated",
      update
    );

    return res.json({
      message: "Conversation background updated.",
      ...update,
    });
  } catch (error) {
    next(error);
  }
});

// Update personal appearance theme
router.patch("/theme", requireAuth, async (req, res, next) => {
  try {
    const theme = req.body?.theme;

    if (!["light", "dark"].includes(theme)) {
      return res.status(400).json({
        message: "Invalid theme.",
      });
    }

    req.user.theme = theme;
    await req.user.save();

    return res.json({
      message: "Theme updated.",
      theme: req.user.theme,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
