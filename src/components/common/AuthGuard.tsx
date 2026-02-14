"use client";

import { useAuth } from "@/lib/firebase/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || user) return;

    router.replace("/login");

    const timerId = window.setTimeout(() => {
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }, 800);

    return () => window.clearTimeout(timerId);
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md space-y-3 rounded-[var(--md-shape-lg)] border border-border/70 bg-card p-5 text-center shadow-[var(--md-elevation-1)]">
          <p className="text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
            ログインページへ移動しています...
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full border border-border/80 px-4 py-2 text-sm transition-colors hover:bg-[color:var(--md-sys-color-surface-container)]"
          >
            ログインページを開く
          </Link>
          {authError ? (
            <p className="break-all text-xs text-destructive">{authError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
