import type { Metadata } from "next";
import Link from "next/link";

import { CartProvider, CartSummary } from "../components";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mağaza",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <CartProvider>
          <header>
            <Link href="/">Mağaza</Link>
            <CartSummary />
          </header>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
