import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { BrandingStyle } from "@/components/BrandingStyle";
import { getBrandingFromDb } from "@/data/queries";
import "./globals.css";

/** CMS content (sidebar, nav, homepage) — refresh on Vercel without full redeploy. */
export const revalidate = 60;

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingFromDb();
  return {
    title: "Trang Chủ - Thế Giới Thuốc Mới",
    description:
      "Thế Giới Thuốc Mới - Cập nhật thông tin thuốc, liệu pháp gene, vaccine và y học",
    icons: {
      icon: branding.faviconSrc,
      apple: branding.faviconSrc,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBrandingFromDb();

  return (
    <html lang="vi" className={`${openSans.variable} h-full antialiased`} id="top">
      <body className="min-h-full bg-white text-[#0a0a0a]">
        <BrandingStyle branding={branding} />
        {children}
      </body>
    </html>
  );
}
