"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  MessageSquare,
  BrainCircuit,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/summary-sheets", label: "要約シート", icon: FileText },
    { href: "/daily-quiz", label: "Daily Quiz", icon: BrainCircuit },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const displayName = user.displayName || "User";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/chat" className="group flex items-center">
            <BrandLogo
              size="sm"
              hideWordmarkOnMobile
              className="transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]"
                      : "text-[color:var(--md-sys-color-on-surface-variant)] hover:bg-[color:var(--md-sys-color-surface-container)] hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card px-2 py-1 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--md-sys-color-primary-container)] text-xs font-semibold text-[color:var(--md-sys-color-on-primary-container)]">
              {displayName.charAt(0)}
            </div>
            <span className="max-w-40 truncate pr-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              {displayName}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={signOut}
            className="hidden text-[color:var(--md-sys-color-on-surface-variant)] hover:text-foreground sm:inline-flex"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--md-sys-color-on-surface-variant)] transition-colors hover:bg-[color:var(--md-sys-color-surface-container)] md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`inline-flex items-center gap-3 rounded-[var(--md-shape-md)] px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]"
                      : "text-[color:var(--md-sys-color-on-surface-variant)] hover:bg-[color:var(--md-sys-color-surface-container)]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 flex items-center justify-between rounded-[var(--md-shape-md)] border border-border/70 bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--md-sys-color-primary-container)] text-xs font-semibold text-[color:var(--md-sys-color-on-primary-container)]">
                {displayName.charAt(0)}
              </div>
              <span className="text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
                {displayName}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
