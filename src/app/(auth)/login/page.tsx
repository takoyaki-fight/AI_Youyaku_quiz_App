"use client";

import { useAuth } from "@/lib/firebase/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/common/BrandLogo";
import { MessageSquare, BrainCircuit, BookOpen } from "lucide-react";
import { toast } from "sonner";

function getLoginErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "このドメインは Firebase Authentication の許可ドメインに含まれていません。";
    case "auth/popup-closed-by-user":
      return "Google ログインのポップアップが閉じられました。";
    case "auth/popup-blocked":
      return "ブラウザのポップアップブロックを解除して再試行してください。";
    case "auth/cancelled-popup-request":
      return "別のログイン処理がすでに進行中です。";
    default:
      return "Google ログインに失敗しました。ブラウザ設定を確認して再試行してください。";
  }
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  const hostWarning = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (window.location.hostname === "127.0.0.1") {
      return "開発環境では、Firebase のポップアップ認証を安定させるため `http://localhost:3000` の利用を推奨します。";
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: MessageSquare,
      title: "対話で学ぶ",
      description: "答えを受け取るだけでなく、対話を通じて概念理解を深めます。",
    },
    {
      icon: BrainCircuit,
      title: "Daily Quiz 生成",
      description: "会話履歴から、内省を促す復習クイズを自動生成します。",
    },
    {
      icon: BookOpen,
      title: "用語の文脈確認",
      description: "重要語を文脈つきで確認し、理解のつながりを強化します。",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo size="lg" showTagline className="mx-auto mb-4" />
          <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
            ソクラテスの産婆術に着想を得た、対話と問いで理解を引き出す学習アシスタントです。
          </p>
        </div>

        <Card className="shadow-[var(--md-elevation-2)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-base text-foreground">
              Sign in
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={signingIn}
              size="lg"
              variant="outline"
              className="h-12 w-full text-sm font-medium"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
              {signingIn ? "Signing in..." : "Continue with Google"}
            </Button>

            {hostWarning && (
              <p className="rounded-[var(--md-shape-sm)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-3 py-2 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                {hostWarning}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-[var(--md-shape-md)] border border-border/70 bg-card p-3 shadow-[var(--md-elevation-1)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{feature.title}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                    {feature.description}
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
