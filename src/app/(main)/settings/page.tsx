"use client";

import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { apiGet } from "@/lib/api-client";
import { toast } from "sonner";

interface SettingsData {
  dailyQuizEnabled: boolean;
  dailyQuizMaxTotal: number;
  dailyQuizMaxPerConversation: number;
  regenerationDailyLimit: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ settings: SettingsData }>("/api/v1/settings")
      .then((data) => setSettings(data.settings))
      .catch(() => toast.error("設定の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">設定</h1>
      {settings && <SettingsForm initialSettings={settings} />}
    </div>
  );
}
