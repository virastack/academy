import type { Metadata } from "next";
import { connection } from "next/server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Store Administration",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Because the nonce is generated per request, every page renders dynamically
  await connection();

  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
