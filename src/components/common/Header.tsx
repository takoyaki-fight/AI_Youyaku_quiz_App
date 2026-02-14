"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  BrainCircuit,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    { href: "/chat", label: "チャット", icon: MessageSquare },
    { href: "/daily-quiz", label: "日次Q&A", icon: BrainCircuit },
    { href: "/settings", label: "設定", icon: Settings },
  ];

  return (
    <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="flex items-center gap-2 font-bold text-lg group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              AI学習アシスタント
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-gray-900 text-white font-medium shadow-sm"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                {user.displayName?.charAt(0) || "U"}
              </div>
              <span className="text-sm text-gray-600 pr-1">{user.displayName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col p-2 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    isActive
                      ? "bg-gray-900 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                {user.displayName?.charAt(0) || "U"}
              </div>
              <span className="text-sm text-gray-600">{user.displayName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-gray-400"
            >
              <LogOut className="w-4 h-4 mr-1" />
              ログアウト
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
