import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },

    // The original message being replied to
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversationKey: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);