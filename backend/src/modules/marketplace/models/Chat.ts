import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  order: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  body: string;
  readAt?: Date;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'MarketplaceOrder', required: true, unique: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    lastMessageAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 4000 },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
