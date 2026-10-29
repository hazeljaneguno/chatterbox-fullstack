
import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Require either text or an attachment.
groupMessageSchema.pre("validate", function () {
  const hasText = Boolean(this.text?.trim());
  const hasAttachment = Boolean(this.attachment?.url);

  if (!hasText && !hasAttachment) {
    this.invalidate("text", "A message must contain text or an attachment.");
  }
});

export default mongoose.model("GroupMessage", groupMessageSchema);
