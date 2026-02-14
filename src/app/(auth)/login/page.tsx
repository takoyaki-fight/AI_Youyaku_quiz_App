"use client";

import { useAuth } from "@/lib/firebase/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, MessageSquare, BrainCircuit, BookOpen } from "lucide-react";
import { toast } from "sonner";

function getLoginErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "このドメインは Firebase 認証で未許可です。localhost で開くか、Firebase Authentication の Authorized domains に追加してください。";
    case "auth/popup-closed-by-user":
      return "Google ログインがキャンセルされました。";
    case "auth/popup-blocked":
      return "ブラウザにポップアップをブロックされました。許可して再試行してください。";
    case "auth/cancelled-popup-request":
      return "別のログインポップアップ処理が進行中です。";
    default:
      return "Google ログインに失敗しました。ブラウザコンソールを確認してください。";
  }
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  const hostWarning = useMemo(() => {
    if (typeof window === "undefined") return null;
    const host = window.location.hostname;
    if (host === "127.0.0.1") {
      return "127.0.0.1 は Firebase ポップアップ認証で失敗しやすいです。http://localhost:3000 を使うか、Firebase Authentication の Authorized domains に 127.0.0.1 を追加してください。";
    }
    return null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "development") return;

    if (window.location.hostname === "127.0.0.1") {
      const nextUrl = new URL(window.location.href);
      nextUrl.hostname = "localhost";
      window.location.replace(nextUrl.toString());
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(getLoginErrorMessage(error));
      console.error("Google sign-in failed:", error);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-10 h-10 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: MessageSquare,
      title: "AIとの対話学習",
      description: "自然な会話を通じて効率的に学習できます。",
    },
    {
      icon: BrainCircuit,
      title: "自動Q&A生成",
      description: "会話内容から復習問題を自動生成します。",
    },
    {
      icon: BookOpen,
      title: "用語辞書",
      description: "学習した用語を自動で整理・蓄積します。",
    },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            AI学習アシスタント
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            会話から学習素材を自動生成するAIアシスタント
          </p>
        </div>

        <Card className="shadow-xl shadow-gray-200/50 border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center text-gray-700">
              はじめましょう
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={signingIn}
              size="lg"
              variant="outline"
              className="w-full h-12 text-sm font-medium border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {signingIn ? "ログイン中..." : "Googleでログイン"}
            </Button>
            {hostWarning && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {hostWarning}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex items-start gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{feature.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
