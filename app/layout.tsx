import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pressly — Magazine & Photobook Studio",
  description:
    "A spread-based studio for composing print-ready magazines and photobooks.",
  applicationName: "Pressly",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f24" },
  ],
};

const themeScript = `(function(){try{var stored=localStorage.getItem("pressly-theme");var system=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=stored==="dark"||((!stored||stored==="system")&&system);var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
