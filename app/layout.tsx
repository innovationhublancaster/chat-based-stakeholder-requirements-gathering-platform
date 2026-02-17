import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat-based Stakeholder Requirements Gathering Platform",
  description:
    "Guided stakeholder chat interviews with AI-assisted requirement extraction, traceability, and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
