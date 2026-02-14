"use client";

import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { apiGet } from "@/lib/api-client";
import { toast } from "sonner";
import { Settings } from "lucide-react";

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
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-sm">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
          <p className="text-xs text-gray-400">アプリケーションの設定を管理</p>
        </div>
      </div>
      {settings && <SettingsForm initialSettings={settings} />}
    </div>
  );
}
