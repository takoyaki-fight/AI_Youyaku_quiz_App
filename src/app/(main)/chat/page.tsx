"use client";

import { Sparkles, MessageSquare, BrainCircuit, BookOpen } from "lucide-react";

export default function ChatListPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200/50">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">AI学習アシスタント</h2>
        <p className="text-sm text-gray-400 mb-8">
          会話を選択、または新規作成して学習を始めましょう
        </p>
        <div className="grid gap-3 text-left">
          {[
            {
              icon: MessageSquare,
              title: "自然な対話で学ぶ",
              desc: "AIとの会話を通じて理解を深められます",
            },
            {
              icon: BrainCircuit,
              title: "復習問題の自動生成",
              desc: "会話内容からQ&Aが毎日自動作成されます",
            },
            {
              icon: BookOpen,
              title: "用語の自動整理",
              desc: "重要な用語が辞書として蓄積されます",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-gray-100"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
