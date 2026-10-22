import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CartLink } from "@/components/cart-link";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shop.example.com"),
  title: { default: "Mağaza", template: "%s | Mağaza" },
  description: "Next.js ile kurulmuş küçük bir ürün kataloğu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr">
      <body>
        <header>
          <nav>
            <Link href="/">Mağaza</Link>
            <Link href="/products">Ürünler</Link>
            <Suspense fallback={<span>Sepet</span>}>
              <CartLink />
            </Suspense>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
