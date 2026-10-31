import mongoose from "mongoose";

const conversationSettingsSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    background: {
      type: String,
      enum: ["default", "lavender", "ocean", "sunset", "forest", "rose", "mint", "peach", "night", "sky "],
      default: "default",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "ConversationSettings",
  conversationSettingsSchema
);