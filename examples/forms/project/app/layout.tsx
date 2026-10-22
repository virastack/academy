import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Satıcı başvurusu",
  description: "Çok adımlı, maskeli ve sunucuda doğrulanan bir başvuru formu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
