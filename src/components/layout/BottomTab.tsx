"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "홈", emoji: "🏠", activeEmoji: "🍞" },
  { href: "/checkin", label: "체크인", emoji: "➕", activeEmoji: "✅" },
  { href: "/course", label: "코스", emoji: "🗺️", activeEmoji: "🗺️" },
  { href: "/profile", label: "마이", emoji: "👤", activeEmoji: "😊" },
];

export function BottomTab() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <span className={cn("text-xl", isActive && "scale-110 transition-transform")}>
                {isActive ? tab.activeEmoji : tab.emoji}
              </span>
              <span className={cn(
                "text-[10px]",
                isActive ? "font-bold" : "font-medium"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
