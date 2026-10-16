import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.layout.metaTitle, description: t.layout.metaDescription };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <html lang={t.layout.htmlLang} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="site-header">
          <nav className="site-nav">
            <Link href="/">{t.layout.homeLink}</Link>
            <Link href="/decks">{t.layout.decksLink}</Link>
            <LanguageSwitcher locale={locale} labels={t.languageSwitcher} />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
