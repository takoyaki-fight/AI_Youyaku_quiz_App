"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TermList } from "@/components/terms/TermList";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api-client";
import { toast } from "sonner";

interface TermItem {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: string;
  messageId: string;
}

export default function TermsPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ terms: TermItem[] }>(
      `/api/v1/conversations/${conversationId}/terms`
    )
      .then((data) => setTerms(data.terms))
      .catch(() => toast.error("用語の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [conversationId]);

  const handleJumpToMessage = (messageId: string) => {
    router.push(`/chat/${conversationId}?highlight=${messageId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/chat/${conversationId}`)}
        >
          ← チャットに戻る
        </Button>
        <h1 className="font-medium">用語辞書</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <TermList terms={terms} onJumpToMessage={handleJumpToMessage} />
      </div>
    </div>
  );
}
