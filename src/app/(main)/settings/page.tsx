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
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)] shadow-[var(--md-elevation-1)]">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">設定</h1>
          <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            学習アシスタントの挙動を調整
          </p>
        </div>
      </div>
      {settings && <SettingsForm initialSettings={settings} />}
    </div>
  );
}
