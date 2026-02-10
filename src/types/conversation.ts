import { Timestamp } from "firebase-admin/firestore";

export interface Conversation {
  conversationId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expireAt: Timestamp;
  messageCount: number;
}
