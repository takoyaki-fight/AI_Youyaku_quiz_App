import { Timestamp } from "firebase-admin/firestore";

export interface Message {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Timestamp;
  expireAt: Timestamp;
  activeMaterialVersion?: number;
}
