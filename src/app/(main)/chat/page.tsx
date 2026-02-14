"use client";

import { BrandLogo } from "@/components/common/BrandLogo";
import { MessageSquare, BrainCircuit, BookOpen } from "lucide-react";

const quickGuides = [
  {
    icon: MessageSquare,
    title: "対話で思考する",
    desc: "問いと応答を繰り返しながら、理解の輪郭を段階的に明確にします。",
  },
  {
    icon: BrainCircuit,
    title: "Daily Quiz を作る",
    desc: "会話内容を Daily Quiz に変換し、能動的な想起を促します。",
  },
  {
    icon: BookOpen,
    title: "重要語を確認する",
    desc: "重要語の定義と文脈を紐づけ、概念理解を促します。",
  },
];

export default function ChatListPage() {
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
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
