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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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

const MAX_ADDITIONAL_INSTRUCTION_CHARS = 800;

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
  if (!date) return "\u66f4\u65b0\u65e5\u6642\u4e0d\u660e";
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
  const safeTitle = sanitizeFilenamePart(sheet.title) || "summary-sheet";
  return `${safeTitle}-${yyyy}${mm}${dd}.md`;
}

export default function ConversationSheetPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [sheet, setSheet] = useState<ConversationSheetItem | null>(null);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [additionalInstruction, setAdditionalInstruction] = useState("");

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
      toast.error(
        "\u8981\u7d04\u30b7\u30fc\u30c8\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f"
      );
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void fetchSheet();
  }, [fetchSheet]);

  const handleRegenerate = useCallback(
    async (instruction?: string) => {
      setRegenerating(true);
      try {
        const payload = instruction ? { instruction } : {};
        const result = await apiPost<{ sheet: ConversationSheetItem }>(
          `/api/v1/conversations/${conversationId}/sheets`,
          payload,
          uuidv4()
        );
        setSheet(result.sheet);
        setRegenerateDialogOpen(false);
        setAdditionalInstruction("");
        toast.success(
          "\u8981\u7d04\u30b7\u30fc\u30c8\u3092\u518d\u751f\u6210\u3057\u307e\u3057\u305f"
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "\u8981\u7d04\u30b7\u30fc\u30c8\u306e\u518d\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f";
        toast.error(message);
      } finally {
        setRegenerating(false);
      }
    },
    [conversationId]
  );

  const handleRegenerateSubmit = useCallback(() => {
    const instruction = additionalInstruction.trim();
    void handleRegenerate(instruction.length > 0 ? instruction : undefined);
  }, [additionalInstruction, handleRegenerate]);

  const handleDownload = useCallback(() => {
    if (!sheet) return;

    // Prefix UTF-8 BOM for better compatibility with markdown viewers on Windows.
    const blob = new Blob(["\uFEFF", sheet.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadFilename(sheet);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, [sheet]);

  const updatedAtLabel = useMemo(
    () => formatUpdatedAt(sheet?.updatedAt),
    [sheet?.updatedAt]
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-3 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/chat/${conversationId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            {"\u30c1\u30e3\u30c3\u30c8\u306b\u623b\u308b"}
          </Button>

          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4" />
            {"\u8981\u7d04\u30b7\u30fc\u30c8"}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setRegenerateDialogOpen(true)}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {"\u518d\u751f\u6210"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={!sheet}
            >
              <Download className="h-4 w-4" />
              {"\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9"}
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
                <p className="text-sm font-medium">
                  {"\u8981\u7d04\u30b7\u30fc\u30c8\u304c\u307e\u3060\u3042\u308a\u307e\u305b\u3093"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                  {
                    "\u3053\u306e\u4f1a\u8a71\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u304c\u3042\u308b\u72b6\u614b\u3067\u300c\u518d\u751f\u6210\u300d\u3092\u62bc\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
                  }
                </p>
              </div>
              <Button onClick={() => setRegenerateDialogOpen(true)} disabled={regenerating}>
                {regenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {"\u518d\u751f\u6210"}
              </Button>
            </div>
          ) : (
            <>
              <div className="border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{sheet.title}</p>
                <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                  {"\u6700\u7d42\u66f4\u65b0: "}
                  {updatedAtLabel}
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

      <Dialog
        open={regenerateDialogOpen}
        onOpenChange={(open) => {
          if (regenerating) return;
          setRegenerateDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{"\u8981\u7d04\u30b7\u30fc\u30c8\u3092\u518d\u751f\u6210"}</DialogTitle>
            <DialogDescription>
              {
                "\u4efb\u610f\u3067\u8ffd\u52a0\u6307\u793a\u3092\u5165\u308c\u308b\u3068\u3001\u518d\u751f\u6210\u6642\u306b\u53cd\u6620\u3055\u308c\u307e\u3059\u3002"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={additionalInstruction}
              onChange={(event) => setAdditionalInstruction(event.target.value)}
              maxLength={MAX_ADDITIONAL_INSTRUCTION_CHARS}
              placeholder={
                "\u4f8b: \u521d\u5fc3\u8005\u5411\u3051\u306b\u3001\u8981\u70b9\u3092\u7b87\u6761\u66f8\u304d\u4e2d\u5fc3\u3067\u3001\u6570\u5f0f\u306f\u30b7\u30f3\u30d7\u30eb\u306b\u307e\u3068\u3081\u3066\u304f\u3060\u3055\u3044"
              }
              rows={6}
            />
            <p className="text-right text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              {Array.from(additionalInstruction).length} / {MAX_ADDITIONAL_INSTRUCTION_CHARS}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateDialogOpen(false)}
              disabled={regenerating}
            >
              {"\u30ad\u30e3\u30f3\u30bb\u30eb"}
            </Button>
            <Button onClick={handleRegenerateSubmit} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {"\u518d\u751f\u6210\u3059\u308b"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
