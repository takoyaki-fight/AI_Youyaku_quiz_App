import { Timestamp } from "firebase-admin/firestore";

export interface UserSettings {
  dailyQuizEnabled: boolean;
  dailyQuizMaxTotal: number;
  dailyQuizMaxPerConversation: number;
  regenerationDailyLimit: number;
  updatedAt: Timestamp;
}

export const DEFAULT_SETTINGS: Omit<UserSettings, "updatedAt"> = {
  dailyQuizEnabled: true,
  dailyQuizMaxTotal: 20,
  dailyQuizMaxPerConversation: 5,
  regenerationDailyLimit: 10,
};
