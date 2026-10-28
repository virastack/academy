import type { Metadata } from "next";
import { connection } from "next/server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Store Administration",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonce her istekte üretildiği için tüm sayfalar dinamik render edilir
  await connection();

  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
