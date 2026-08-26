"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/frontend/lib/wallet-context";

export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { publicKey } = useWallet();

  useEffect(() => {
    if (!publicKey) return;

    let isMounted = true;

    async function checkModeAndRedirect() {
      let preferredMode: string | null = null;

      // 1. Check client-side storage for fast lookup
      if (typeof window !== "undefined") {
        preferredMode = window.localStorage.getItem("safeswap.preferred_mode");
      }

      // 2. If not found in localStorage, fetch from API / users row
      if (!preferredMode) {
        try {
          const res = await fetch(`/api/users/me?address=${publicKey}`);
          if (res.ok) {
            const data = await res.json();
            if (data.preferred_mode) {
              preferredMode = data.preferred_mode;
              if (typeof window !== "undefined") {
                window.localStorage.setItem("safeswap.preferred_mode", data.preferred_mode);
              }
            }
          }
        } catch {
          // Ignore API network errors
        }
      }

      if (!isMounted) return;

      // 3. Enforce redirect rules
      if (!preferredMode) {
        // Connected wallet has no preferred_mode set -> route to /onboarding/mode
        if (pathname !== "/onboarding/mode") {
          router.replace("/onboarding/mode");
        }
      } else {
        // Connected wallet has preferred_mode set
        // If visiting home '/' or onboarding page '/onboarding/mode', land on /p2p/orders?mode=<preferred>
        if (pathname === "/" || pathname === "/onboarding/mode") {
          router.replace(`/p2p/orders?mode=${preferredMode}`);
        }
      }
    }

    void checkModeAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [publicKey, pathname, router]);
}
