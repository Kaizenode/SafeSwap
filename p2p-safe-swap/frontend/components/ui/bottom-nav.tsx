"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListOrdered,
  MessageCircle,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only (marketing/home). Nested routes use prefix match. */
  exact?: boolean;
  /** Optional path prefix for active state when href is a specific entry URL. */
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/p2p/orders", label: "Órdenes", icon: ListOrdered },
  { href: "/wallet", label: "Billetera", icon: Wallet },
  { href: "/transactions", label: "Transacciones", icon: Receipt },
  {
    href: "/chat/demo",
    label: "Chat",
    icon: MessageCircle,
    matchPrefix: "/chat",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  const base = item.matchPrefix ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      data-slot="bottom-nav"
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] transition-colors sm:text-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "bg-primary/15 font-medium text-primary"
                    : "font-normal text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
