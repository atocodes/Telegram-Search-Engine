import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/TopBar";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "TUGS",
  description:
    "A search engine for Telegram that helps you discover public channels, explore creators, and uncover high-quality communities beyond the most popular results.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {/* <DemoBanner /> */}
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
          <TopBar />
          <main className="flex-1 py-8">{children}</main>
          <footer className="border-t border-border py-6">
            <p className="font-mono text-[11px] text-muted">
              The Under-grounders · read-only · ranked by quality ×
              activity × influence × freshness
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
