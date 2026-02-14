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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-gray-600">ログインページへ移動しています...</p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 rounded border text-sm hover:bg-gray-100"
          >
            ログインページを開く
          </Link>
          {authError ? (
            <p className="text-xs text-red-600 break-all">{authError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
