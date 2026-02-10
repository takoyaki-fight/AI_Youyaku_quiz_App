"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export function ChatHeader() {
  const params = useParams();
  const conversationId = params.conversationId as string | undefined;

  if (!conversationId) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
      <div />
      <Link
        href={`/chat/${conversationId}/terms`}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        用語辞書を開く
      </Link>
    </div>
  );
}
