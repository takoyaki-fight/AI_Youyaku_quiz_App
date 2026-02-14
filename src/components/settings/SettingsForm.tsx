"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

function SectionSwitch({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked
          ? "bg-primary"
          : "bg-[color:color-mix(in_srgb,var(--md-sys-color-outline),transparent_35%)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[var(--md-elevation-1)] transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
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
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)]">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">日次Q&A設定</CardTitle>
              <CardDescription className="text-xs">
                復習カード生成の挙動を調整します
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-3">
            <div>
              <label className="text-sm font-medium text-foreground">
                日次Q&Aの自動生成
              </label>
              <p className="mt-0.5 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                毎朝 07:00 に前日の会話からQ&Aを生成します
              </p>
            </div>
            <SectionSwitch
              checked={settings.dailyQuizEnabled}
              onToggle={() =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizEnabled: !s.dailyQuizEnabled,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              1日あたりの最大カード数
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              value={settings.dailyQuizMaxTotal}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizMaxTotal: parseInt(e.target.value, 10) || 20,
                }))
              }
            />
            <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              1〜50（デフォルト: 20）
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              1会話あたりの最大カード数
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.dailyQuizMaxPerConversation}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  dailyQuizMaxPerConversation: parseInt(e.target.value, 10) || 5,
                }))
              }
            />
            <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              1〜10（デフォルト: 5）
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">再生成設定</CardTitle>
              <CardDescription className="text-xs">
                Q&Aの再生成回数を制御します
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            1日あたりの再生成上限
          </label>
          <Input
            type="number"
            min={1}
            max={50}
            value={settings.regenerationDailyLimit}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                regenerationDailyLimit: parseInt(e.target.value, 10) || 10,
              }))
            }
          />
          <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            1〜50（デフォルト: 10）
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saving ? "保存中..." : "設定を保存"}
      </Button>
    </div>
  );
}
