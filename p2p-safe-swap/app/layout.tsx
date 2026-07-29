import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/frontend/components/theme-provider";
import { AppShell } from "@/frontend/components/app-shell";
import { WalletProvider } from "@/frontend/lib/wallet-context";

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
          <WalletProvider>
            <AppShell>{children}</AppShell>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
