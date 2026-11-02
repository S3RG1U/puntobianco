import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const muller = localFont({
  src: [
    { path: "../public/fonts/muller/Muller-Thin-DEMO.otf", weight: "100", style: "normal" },
    { path: "../public/fonts/muller/Muller-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/muller/Muller-ExtraBold-DEMO.otf", weight: "800", style: "normal" },
  ],
  variable: "--font-muller",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Punto Bianco", template: "%s | Punto Bianco" },
  description: "Punto Bianco clinic management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${muller.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
