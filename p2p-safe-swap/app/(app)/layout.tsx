import { BottomNav } from "@/frontend/components/ui/bottom-nav";

/**
 * App chrome for authenticated/product screens.
 * Marketing home (`app/page.tsx` at `/`) stays outside this group so it
 * never mounts the bottom navigation bar.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
