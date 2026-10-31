import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { AIOverlay } from "@/components/AIOverlay";
import { Toasts } from "@/components/Toasts";

export const metadata: Metadata = {
  title: "品牌沟通助手 · 医学问询协作",
  description: "提交 → 查证 → 医学部答复 → AI 对照审核 → 销售制作 → 反馈",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        {children}
        <AIOverlay />
        <Toasts />
      </body>
    </html>
  );
}
