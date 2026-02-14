"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPut } from "@/lib/api-client";
import { toast } from "sonner";
import { BrainCircuit, RefreshCw, Save, Loader2 } from "lucide-react";

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
    <div className="space-y-5">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm">日次Q&A設定</CardTitle>
              <CardDescription className="text-xs">
                Q&Aの自動生成に関する設定
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50">
            <div>
              <label className="text-sm font-medium text-gray-700">日次Q&A自動生成</label>
              <p className="text-xs text-gray-400 mt-0.5">毎朝07:00に自動でQ&Aを生成します</p>
            </div>
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizEnabled: !s.dailyQuizEnabled,
                }))
              }
              className={`relative w-11 h-6 rounded-full transition-all shadow-inner ${
                settings.dailyQuizEnabled
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  settings.dailyQuizEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">全体上限（1日あたり最大問数）</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={settings.dailyQuizMaxTotal}
              className="rounded-lg"
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
            <label className="text-sm font-medium text-gray-700">会話ごと上限</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.dailyQuizMaxPerConversation}
              className="rounded-lg"
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

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm">再生成設定</CardTitle>
              <CardDescription className="text-xs">
                Q&Aの再生成回数の制限
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">再生成 1日あたりの上限回数</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={settings.regenerationDailyLimit}
              className="rounded-lg"
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

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm h-11"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {saving ? "保存中..." : "設定を保存"}
      </Button>
    </div>
  );
}
