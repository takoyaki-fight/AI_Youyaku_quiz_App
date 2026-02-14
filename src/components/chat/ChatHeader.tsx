"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen } from "lucide-react";

export function ChatHeader() {
  const params = useParams();
  const conversationId = params.conversationId as string | undefined;

  if (!conversationId) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white/60 backdrop-blur-sm">
      <div />
      <Link
        href={`/chat/${conversationId}/terms`}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        用語辞書
      </Link>
    </div>
  );
}
