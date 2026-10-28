import type { Metadata } from "next";
import Link from "next/link";

import { CartProvider, CartSummary } from "../components";

import "./globals.css";

export const metadata: Metadata = {
  title: "Store",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <CartProvider>
          <header>
            <Link href="/">Store</Link>
            <CartSummary />
          </header>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
