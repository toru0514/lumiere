import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "lumiere — 撮影プラン＆投稿文生成",
  description: "Cloud9 のInstagram運用支援：撮影プランと投稿文・ハッシュタグを生成。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="border-b border-stone-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 px-5 py-5">
              <Link href="/planner" className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tracking-tight text-amber-700">
                  lumiere
                </span>
                <span className="text-[10px] text-stone-400">by Cloud9</span>
              </Link>
            </div>
            <div className="px-3 pb-4">
              <Nav />
            </div>
          </aside>
          <main className="flex-1 px-5 py-6 md:px-10 md:py-8">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
