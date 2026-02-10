"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPut } from "@/lib/api-client";
import { toast } from "sonner";

interface SettingsData {
  dailyQuizEnabled: boolean;
  dailyQuizMaxTotal: number;
  dailyQuizMaxPerConversation: number;
  regenerationDailyLimit: number;
}

interface SettingsFormProps {
  initialSettings: SettingsData;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut("/api/v1/settings", settings);
      toast.success("設定を保存しました");
    } catch {
      toast.error("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">日次Q&A設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm">日次Q&A自動生成</label>
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizEnabled: !s.dailyQuizEnabled,
                }))
              }
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.dailyQuizEnabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.dailyQuizEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm">全体上限（1日あたり最大問数）</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={settings.dailyQuizMaxTotal}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizMaxTotal: parseInt(e.target.value) || 20,
                }))
              }
            />
            <p className="text-xs text-gray-400">1〜50（デフォルト: 20）</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm">会話ごと上限</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.dailyQuizMaxPerConversation}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizMaxPerConversation: parseInt(e.target.value) || 5,
                }))
              }
            />
            <p className="text-xs text-gray-400">1〜10（デフォルト: 5）</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">再生成設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm">再生成 1日あたりの上限回数</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={settings.regenerationDailyLimit}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  regenerationDailyLimit: parseInt(e.target.value) || 10,
                }))
              }
            />
            <p className="text-xs text-gray-400">1〜50（デフォルト: 10）</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "保存中..." : "設定を保存"}
      </Button>
    </div>
  );
}
