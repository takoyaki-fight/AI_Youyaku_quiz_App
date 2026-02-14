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
    apiGet<{ terms: TermItem[] }>(`/api/v1/conversations/${conversationId}/terms`)
      .then((data) => setTerms(data.terms))
      .catch(() => toast.error("用語一覧の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [conversationId]);

  const handleJumpToMessage = (messageId: string) => {
    router.push(`/chat/${conversationId}?highlight=${messageId}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/chat/${conversationId}`)}
        >
          チャットに戻る
        </Button>
        <h1 className="text-sm font-semibold text-foreground">用語集</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <TermList terms={terms} onJumpToMessage={handleJumpToMessage} />
      </div>
    </div>
  );
}
