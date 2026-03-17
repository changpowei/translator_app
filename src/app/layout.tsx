import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 中英學習平台",
  description:
    "以翻譯帶動複習的現代化英語學習工具，自動紀錄生字並融入新例句，實現高效間隔記憶學習。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
