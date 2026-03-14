import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "start.gg VOD Splitter",
  description:
    "Split tournament VODs into per-set clips using start.gg set times.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
