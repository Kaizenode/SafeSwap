"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Home, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_ITEMS: BottomNavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/p2p/orders", label: "Orders", icon: ArrowLeftRight },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: Receipt },
];

export interface BottomNavProps extends React.ComponentProps<"nav"> {
  items?: BottomNavItem[];
}

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({
  items = DEFAULT_ITEMS,
  className,
  ...props
}: BottomNavProps) {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <nav
      data-slot="bottom-nav"
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = isItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-16 flex-col items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? "font-medium text-primary"
                  : "font-normal text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", isActive && "text-primary")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
