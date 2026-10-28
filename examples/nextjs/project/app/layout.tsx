import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CartLink } from "@/components/cart-link";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shop.example.com"),
  title: { default: "Store", template: "%s | Store" },
  description: "A small product catalogue built with Next.js.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link href="/">Store</Link>
            <Link href="/products">Products</Link>
            <Suspense fallback={<span>Cart</span>}>
              <CartLink />
            </Suspense>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
