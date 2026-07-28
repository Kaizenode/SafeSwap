"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/frontend/components/ui/bottom-nav";
import { ThemeToggle } from "@/frontend/components/ui/theme-toggle";
import { ConnectWalletButton } from "@/frontend/components/wallet/ConnectWalletButton";
import { SetupTestnetButton } from "@/frontend/components/wallet/SetupTestnetButton";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showNav = pathname !== "/";

  return (
    <>
      <div className="fixed right-4 top-4 z-50 flex flex-col items-end gap-2">
        <ConnectWalletButton />
        <SetupTestnetButton />
      </div>
      <div className={cn("flex flex-1 flex-col", showNav && "pb-16")}>
        {children}
      </div>
      <BottomNav />
      <ThemeToggle
        className={cn("fixed right-4 z-50", showNav ? "bottom-20" : "bottom-4")}
      />
    </>
  );
}
