import localFont from "next/font/local";
import { Suspense, type ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/client";
import { defaultLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const muller = localFont({
  src: [
    {
      path: "../public/fonts/muller/Muller-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-muller",
  display: "swap",
});

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: { default: "Punto Bianco", template: "%s | Punto Bianco" },
    description: t.common.appDescription,
  };
}

// Every page reads the language cookie, so all of it renders per request.
async function LocaleBoundary({ children }: { children: ReactNode }) {
  const { locale } = await getI18n();
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLocale} className={`${muller.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <LocaleBoundary>{children}</LocaleBoundary>
        </Suspense>
      </body>
    </html>
  );
}
