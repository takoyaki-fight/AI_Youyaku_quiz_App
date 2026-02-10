"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = [
    { href: "/chat", label: "チャット" },
    { href: "/daily-quiz", label: "日次Q&A" },
    { href: "/settings", label: "設定" },
  ];

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="font-bold text-lg">
            AI学習アシスタント
          </Link>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  pathname.startsWith(item.href)
                    ? "text-gray-900 font-medium"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.displayName}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  );
}
