import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/frontend/components/theme-provider";
import { ThemeToggle } from "@/frontend/components/ui/theme-toggle";

// SafeSwap brand typeface (self-hosted variable font).
const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SafeSwap — P2P USDC on Stellar",
    template: "%s · SafeSwap",
  },
  description:
    "Peer-to-peer USDC transfers between Stellar wallets, secured by escrow via the Trustless Work API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${satoshi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Sit above the fixed BottomNav (h-16 + safe area) on app routes */}
          <ThemeToggle className="fixed bottom-20 right-4 z-50" />
        </ThemeProvider>
      </body>
    </html>
  );
}
