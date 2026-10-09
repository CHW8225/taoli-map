import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "桃李满天下｜从杨凌出发",
  description: "导师退休纪念交互地图"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

