import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mağaza",
  description: "Klavye ve aksesuarlar",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
