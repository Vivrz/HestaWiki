import type { Metadata } from "next";
import { Geist, Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hestabit Chatbot",
  description: "Internal enterprise knowledge assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-class-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('chat-dark');
                } else {
                  document.documentElement.classList.remove('chat-dark');
                }
                if (localStorage.getItem('admin-theme') === 'dark') {
                  document.documentElement.classList.add('admin-dark');
                  document.documentElement.classList.remove('admin-light');
                } else {
                  document.documentElement.classList.add('admin-light');
                  document.documentElement.classList.remove('admin-dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
