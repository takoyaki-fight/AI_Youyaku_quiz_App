import { Timestamp } from "firebase-admin/firestore";

export interface ConversationSheet {
  sheetId: string;
  title: string;
  markdown: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expireAt: Timestamp;
}
