"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
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
  if (!date) return "\u66f4\u65b0\u65e5\u6642\u4e0d\u660e";
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

function buildSheetHref(
  pathname: string,
  conversationId: string,
  sheetId: string
): string {
  const params = new URLSearchParams();
  params.set("conversationId", conversationId);
  params.set("sheetId", sheetId);
  return `${pathname}?${params.toString()}`;
}

function downloadMarkdown(sheet: SummarySheetItem): void {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const safeTitle = sanitizeFilenamePart(sheet.title) || "summary-sheet";
  const filename = `${safeTitle}-${yyyy}${mm}${dd}.md`;

  // Prefix UTF-8 BOM for better compatibility with markdown viewers on Windows.
  const blob = new Blob(["\uFEFF", sheet.markdown], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function SummarySheetsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheets, setSheets] = useState<SummarySheetItem[]>([]);
  const [allowEmptySelection, setAllowEmptySelection] = useState(false);

  const selectedConversationId = searchParams.get("conversationId");
  const selectedSheetId = searchParams.get("sheetId");

  const selectedSheet = useMemo(() => {
    if (!selectedConversationId || !selectedSheetId) return null;
    return (
      sheets.find(
        (sheet) =>
          sheet.conversationId === selectedConversationId &&
          sheet.sheetId === selectedSheetId
      ) || null
    );
  }, [selectedConversationId, selectedSheetId, sheets]);

  const fetchSheets = useCallback(async () => {
    try {
      const data = await apiGet<{ sheets: SummarySheetItem[] }>(
        "/api/v1/summary-sheets"
      );
      setSheets(data.sheets);
    } catch {
      toast.error(
        "\u8981\u7d04\u30b7\u30fc\u30c8\u4e00\u89a7\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSheets();
  }, [fetchSheets]);

  useEffect(() => {
    if (!sheets.length) return;
    if (selectedSheet) return;

    const hasAnyQuery = Boolean(selectedConversationId || selectedSheetId);
    const fallback = sheets[0];
    const fallbackHref = buildSheetHref(
      pathname,
      fallback.conversationId,
      fallback.sheetId
    );

    if (hasAnyQuery || !allowEmptySelection) {
      router.replace(fallbackHref, { scroll: false });
    }
  }, [
    allowEmptySelection,
    pathname,
    router,
    selectedConversationId,
    selectedSheet,
    selectedSheetId,
    sheets,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSheets();
  };

  const handleSelectSheet = useCallback(
    (sheet: SummarySheetItem) => {
      setAllowEmptySelection(false);
      router.push(
        buildSheetHref(pathname, sheet.conversationId, sheet.sheetId),
        { scroll: false }
      );
    },
    [pathname, router]
  );

  const handleBackToListMobile = useCallback(() => {
    setAllowEmptySelection(true);
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const shouldShowDetail = Boolean(selectedSheet);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-7xl flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4" />
          {"\u8981\u7d04\u30b7\u30fc\u30c8"}
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
            {"\u66f4\u65b0"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--md-shape-lg)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-lowest)]">
        {sheets.length === 0 ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
            <FileText className="h-10 w-10 text-[color:var(--md-sys-color-outline)]" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {"\u307e\u3060\u8981\u7d04\u30b7\u30fc\u30c8\u304c\u3042\u308a\u307e\u305b\u3093"}
              </p>
              <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                {
                  "\u5404\u30c1\u30e3\u30c3\u30c8\u306e\u300c\u8981\u7d04\u30b7\u30fc\u30c8\u300d\u753b\u9762\u304b\u3089\u751f\u6210\u3059\u308b\u3068\u4e00\u89a7\u306b\u8868\u793a\u3055\u308c\u307e\u3059"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full md:grid md:grid-cols-[340px_minmax(0,1fr)]">
            <section className={`${shouldShowDetail ? "hidden md:block" : "block"} min-h-0 border-r border-border/70`}>
              <ScrollArea className="h-full">
                <div className="divide-y divide-border/70">
                  {sheets.map((sheet) => {
                    const isSelected =
                      selectedSheet?.conversationId === sheet.conversationId &&
                      selectedSheet?.sheetId === sheet.sheetId;

                    return (
                      <article
                        key={`${sheet.conversationId}:${sheet.sheetId}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => handleSelectSheet(sheet)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectSheet(sheet);
                          }
                        }}
                        className={`cursor-pointer px-4 py-3 transition-colors ${
                          isSelected
                            ? "bg-[color:var(--md-sys-color-secondary-container)]/50"
                            : "hover:bg-[color:var(--md-sys-color-surface-container-low)]"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{sheet.conversationTitle}</span>
                        </div>

                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {sheet.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
                          {buildExcerpt(sheet.markdown)}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-[color:var(--md-sys-color-on-surface-variant)]">
                            {"\u66f4\u65b0: "}
                            {formatUpdatedAt(sheet.updatedAt)}
                          </p>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              downloadMarkdown(sheet);
                            }}
                            onKeyDown={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <Download className="h-3 w-3" />
                            DL
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </ScrollArea>
            </section>

            <section className={`${shouldShowDetail ? "block" : "hidden md:block"} min-h-0`}>
              {selectedSheet ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-4 py-3">
                    <div className="mb-2 md:hidden">
                      <Button variant="ghost" size="sm" onClick={handleBackToListMobile}>
                        <ArrowLeft className="h-4 w-4" />
                        {"\u4e00\u89a7\u306b\u623b\u308b"}
                      </Button>
                    </div>
                    <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                      {selectedSheet.conversationTitle}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {selectedSheet.title}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                      {"\u66f4\u65b0: "}
                      {formatUpdatedAt(selectedSheet.updatedAt)}
                    </p>
                  </div>

                  <ScrollArea className="min-h-0 flex-1">
                    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
                      <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-lowest)] p-4 shadow-[var(--md-elevation-1)] md:p-6">
                        <MarkdownContent content={selectedSheet.markdown} />
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <div>
                    <FileText className="mx-auto h-8 w-8 text-[color:var(--md-sys-color-outline)]" />
                    <p className="mt-3 text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
                      {"\u8981\u7d04\u30b7\u30fc\u30c8\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044"}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
