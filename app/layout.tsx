import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mein App-Katalog",
  description: "Zentrale Übersicht aller Apps, Quellen und Projektspuren.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
