import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false, 
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The original group message being replied to
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMessage",
      default: null,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },

    attachment: {
      url: {
        type: String,
        default: "",
      },
      originalName: {
        type: String,
        trim: true,
        maxlength: 255,
        default: "",
      },
      mimeType: {
        type: String,
        default: "",
      },
      size: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// Require text or an attachment unless the message is deleted.
groupMessageSchema.pre("validate", function () {
  // Deleted messages are allowed to have empty content.
  if (this.isDeleted) return;

  const hasText = Boolean(this.text?.trim());
  const hasAttachment = Boolean(this.attachment?.url);

  if (!hasText && !hasAttachment) {
    this.invalidate(
      "text",
      "A message must contain text or an attachment."
    );
  }
});
export default mongoose.model("GroupMessage", groupMessageSchema);