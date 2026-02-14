"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiGet, apiPost } from "@/lib/api-client";

interface FirestoreTimestamp {
  _seconds?: number;
  seconds?: number;
  _nanoseconds?: number;
  nanoseconds?: number;
}

interface ConversationSheetItem {
  sheetId: string;
  title: string;
  markdown: string;
  updatedAt?: FirestoreTimestamp | null;
}

const timestampFormatter = new Intl.DateTimeFormat("ja-JP", {
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

function toMillis(timestamp?: FirestoreTimestamp | null): number {
  const date = toDate(timestamp);
  return date ? date.getTime() : 0;
}

function formatUpdatedAt(timestamp?: FirestoreTimestamp | null): string {
  const date = toDate(timestamp);
  if (!date) return "Unknown update time";
  return timestampFormatter.format(date);
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function buildDownloadFilename(sheet: ConversationSheetItem): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const safeTitle = sanitizeFilenamePart(sheet.title) || "conversation-sheet";
  return `${safeTitle}-${yyyy}${mm}${dd}.md`;
}

export default function ConversationSheetPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [sheet, setSheet] = useState<ConversationSheetItem | null>(null);

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ sheets: ConversationSheetItem[] }>(
        `/api/v1/conversations/${conversationId}/sheets`
      );
      const latest = [...data.sheets].sort(
        (a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt)
      )[0] ?? null;
      setSheet(latest);
    } catch {
      toast.error("Failed to load conversation sheet");
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void fetchSheet();
  }, [fetchSheet]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const result = await apiPost<{ sheet: ConversationSheetItem }>(
        `/api/v1/conversations/${conversationId}/sheets`,
        {},
        uuidv4()
      );
      setSheet(result.sheet);
      toast.success("Conversation sheet regenerated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to regenerate sheet";
      toast.error(message);
    } finally {
      setRegenerating(false);
    }
  }, [conversationId]);

  const handleDownload = useCallback(() => {
    if (!sheet) return;

    const blob = new Blob([sheet.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadFilename(sheet);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [sheet]);

  const updatedAtLabel = useMemo(
    () => formatUpdatedAt(sheet?.updatedAt),
    [sheet?.updatedAt]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-3 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/chat/${conversationId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chat
        </Button>

        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4" />
          Conversation Sheet
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void handleRegenerate()}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!sheet}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !sheet ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <FileText className="h-10 w-10 text-[color:var(--md-sys-color-outline)]" />
            <div>
              <p className="text-sm font-medium">No conversation sheet yet</p>
              <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                Generate after at least one message exists in this conversation.
              </p>
            </div>
            <Button
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{sheet.title}</p>
              <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                Last updated: {updatedAtLabel}
              </p>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
                <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-lowest)] p-4 shadow-[var(--md-elevation-1)] md:p-6">
                  <MarkdownContent content={sheet.markdown} />
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
