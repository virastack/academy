import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seller application",
  description: "A multi-step application form with masking and server-side validation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
