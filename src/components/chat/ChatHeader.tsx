"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, FileText, MessagesSquare } from "lucide-react";

export function ChatHeader() {
  const params = useParams();
  const conversationId = params.conversationId as string | undefined;

  if (!conversationId) return null;

  return (
    <div className="flex items-center justify-between border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
        <MessagesSquare className="h-4 w-4" />
        <span className="font-medium">Chat Session</span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/chat/${conversationId}/sheet`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-[color:var(--md-sys-color-surface-container-high)] px-3 py-1.5 text-xs font-medium text-[color:var(--md-sys-color-on-surface)] transition-colors hover:brightness-95"
        >
          <FileText className="h-3.5 w-3.5" />
          要約シート
        </Link>
        <Link
          href={`/chat/${conversationId}/terms`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--md-sys-color-secondary-container)] px-3 py-1.5 text-xs font-medium text-[color:var(--md-sys-color-on-secondary-container)] transition-colors hover:brightness-95"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Terms
        </Link>
      </div>
    </div>
  );
}
