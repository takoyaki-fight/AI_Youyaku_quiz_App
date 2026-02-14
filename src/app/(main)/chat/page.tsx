"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { apiGet, apiPost } from "@/lib/api-client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  BrainCircuit,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";

type GuideAction = "conversation" | "daily_quiz" | "terms";

interface QuickGuideItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  action: GuideAction;
}

interface ConversationItem {
  conversationId: string;
  messageCount: number;
}

interface CreateConversationResponse {
  conversationId: string;
}

const quickGuides: QuickGuideItem[] = [
  {
    icon: MessageSquare,
    title: "対話で思考する",
    desc: "問いと応答を繰り返しながら、理解の輪郭を段階的に明確にします。",
    action: "conversation",
  },
  {
    icon: BrainCircuit,
    title: "Daily Quiz を作る",
    desc: "会話内容を Daily Quiz に変換し、能動的な想起を促します。",
    action: "daily_quiz",
  },
  {
    icon: BookOpen,
    title: "重要語を確認する",
    desc: "重要語の定義と文脈を紐づけ、概念理解を促します。",
    action: "terms",
  },
];

export default function ChatListPage() {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<GuideAction | null>(null);

  const createConversation = async () => {
    const conversation = await apiPost<CreateConversationResponse>(
      "/api/v1/conversations",
      { title: "新しい会話" },
      uuidv4()
    );
    window.dispatchEvent(new Event("conversations:refresh"));
    return conversation;
  };

  const handleGuideAction = async (action: GuideAction) => {
    if (pendingAction) return;
    setPendingAction(action);

    try {
      if (action === "daily_quiz") {
        router.push("/daily-quiz");
        return;
      }

      if (action === "conversation") {
        const conversation = await createConversation();
        router.push(`/chat/${conversation.conversationId}`);
        return;
      }

      const data = await apiGet<{ conversations: ConversationItem[] }>(
        "/api/v1/conversations"
      );
      const targetConversation =
        data.conversations.find((conv) => conv.messageCount > 0) ||
        data.conversations[0];

      if (targetConversation) {
        router.push(`/chat/${targetConversation.conversationId}/terms`);
        return;
      }

      const conversation = await createConversation();
      toast.info("まずは会話を作成してから重要語を確認できます");
      router.push(`/chat/${conversation.conversationId}`);
    } catch {
      toast.error("画面の遷移に失敗しました");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-[var(--md-shape-xl)] border border-border/80 bg-card px-6 py-8 shadow-[var(--md-elevation-2)] md:px-8">
        <div className="text-center">
          <BrandLogo size="lg" showTagline className="mx-auto mb-4" />
          <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
            新しい対話を始めて、問いによって理解を深めていきましょう。
          </p>
        </div>

        <div className="mt-7 grid gap-3 text-left">
          {quickGuides.map((item) => {
            const Icon = item.icon;
            const isRunning = pendingAction === item.action;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  void handleGuideAction(item.action);
                }}
                disabled={pendingAction !== null}
                className="group flex items-start gap-3 rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-4 text-left transition-colors hover:bg-[color:var(--md-sys-color-surface-container)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-1 flex h-5 w-5 items-center justify-center text-[color:var(--md-sys-color-on-surface-variant)]">
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
