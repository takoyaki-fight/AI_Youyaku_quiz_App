"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiGet } from "@/lib/api-client";

interface FirestoreTimestamp {
  _seconds?: number;
  seconds?: number;
  _nanoseconds?: number;
  nanoseconds?: number;
}

interface SummarySheetItem {
  conversationId: string;
  conversationTitle: string;
  sheetId: string;
  title: string;
  markdown: string;
  updatedAt?: FirestoreTimestamp | null;
}

const updatedAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(timestamp?: FirestoreTimestamp | null): Date | null {
  if (!timestamp) return null;

  const seconds =
    typeof timestamp._seconds === "number"
      ? timestamp._seconds
      : typeof timestamp.seconds === "number"
        ? timestamp.seconds
        : null;

  const nanoseconds =
    typeof timestamp._nanoseconds === "number"
      ? timestamp._nanoseconds
      : typeof timestamp.nanoseconds === "number"
        ? timestamp.nanoseconds
        : 0;

  if (seconds === null) return null;
  return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
}

function formatUpdatedAt(timestamp?: FirestoreTimestamp | null): string {
  const date = toDate(timestamp);
  if (!date) return "更新日時不明";
  return updatedAtFormatter.format(date);
}

function buildExcerpt(markdown: string, maxLength = 160): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength)}...`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function downloadMarkdown(sheet: SummarySheetItem): void {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const safeTitle = sanitizeFilenamePart(sheet.title) || "summary-sheet";
  const filename = `${safeTitle}-${yyyy}${mm}${dd}.md`;

  const blob = new Blob([sheet.markdown], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function SummarySheetsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheets, setSheets] = useState<SummarySheetItem[]>([]);

  const fetchSheets = useCallback(async () => {
    try {
      const data = await apiGet<{ sheets: SummarySheetItem[] }>(
        "/api/v1/summary-sheets"
      );
      setSheets(data.sheets);
    } catch {
      toast.error("要約シート一覧の取得に失敗しました");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSheets();
  }, [fetchSheets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSheets();
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-6xl flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4" />
          要約シート
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            更新
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--md-shape-lg)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-lowest)]">
        <ScrollArea className="h-full">
          {sheets.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="h-10 w-10 text-[color:var(--md-sys-color-outline)]" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  まだ要約シートがありません
                </p>
                <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                  各チャットの「要約シート」画面から生成すると一覧に表示されます
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 p-3 md:grid-cols-2">
              {sheets.map((sheet) => (
                <article
                  key={`${sheet.conversationId}:${sheet.sheetId}`}
                  className="rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="truncate">{sheet.conversationTitle}</span>
                  </div>
                  <h2 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {sheet.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
                    {buildExcerpt(sheet.markdown)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-[color:var(--md-sys-color-on-surface-variant)]">
                      更新: {formatUpdatedAt(sheet.updatedAt)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => downloadMarkdown(sheet)}
                      >
                        <Download className="h-3 w-3" />
                        DL
                      </Button>
                      <Button size="xs" asChild>
                        <Link href={`/chat/${sheet.conversationId}/sheet`}>開く</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
