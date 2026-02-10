import { Timestamp } from "firebase-admin/firestore";

export interface User {
  userId: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
