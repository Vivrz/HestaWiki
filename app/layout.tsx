import type { Metadata } from "next";
import { Geist, Inter, Space_Grotesk } from "next/font/google";
import ThemeClassInitializer from "@/components/ThemeClassInitializer";
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var root = document.documentElement;
    var adminTheme = localStorage.getItem("admin-theme");
    if (adminTheme === "dark") {
      root.classList.add("admin-dark");
      root.classList.remove("admin-light");
    } else {
      root.classList.add("admin-light");
      root.classList.remove("admin-dark");
    }
    var chatTheme = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (chatTheme === "dark" || (!chatTheme && prefersDark)) {
      root.classList.add("chat-dark");
    } else {
      root.classList.remove("chat-dark");
    }
  } catch(e) {}
})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeClassInitializer />
        {children}
      </body>
    </html>
  );
}
