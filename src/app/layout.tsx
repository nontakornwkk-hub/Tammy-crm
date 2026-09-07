import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { StoreBrandProvider } from "@/components/store-brand-provider";

export const metadata: Metadata = {
  title: "แทมมี่อาหารสัตว์ | ระบบสมาชิก",
  description: "ระบบสมาชิกและสะสมแต้มสำหรับร้านแทมมี่อาหารสัตว์",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body><AppProvider><StoreBrandProvider>{children}</StoreBrandProvider></AppProvider></body>
    </html>
  );
}
