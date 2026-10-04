import { Schema, model, models } from "mongoose";

const chatMessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    source: {
      type: String,
      enum: ["database", "openai", "faq", "system"],
      default: "system",
    },
  },
  { timestamps: true },
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessageModel =
  models.ChatMessage || model("ChatMessage", chatMessageSchema);
