import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  userId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  role: { type: String, required: true, enum: ['system', 'user', 'assistant'] },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ConversationSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  messages: [MessageSchema],
}, {
  timestamps: true,
});

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);