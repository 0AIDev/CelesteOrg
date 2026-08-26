import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Celeste HQ",
    template: "%s - Celeste HQ",
  },
  description: "Internal operating system for the Celeste team.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Celeste HQ",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0F" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inter — served by Google Fonts, plain "Inter" family name */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* PWA icons for iOS Safari */}
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        {/* Dynamic favicon - light mode */}
        <link rel="icon" type="image/svg+xml" href="/Vector (2).svg" media="(prefers-color-scheme: light)" />
        {/* Dynamic favicon - dark mode */}
        <link rel="icon" type="image/svg+xml" href="/Vector (3).svg" media="(prefers-color-scheme: dark)" />
        {/* Status bar color - matches theme */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#ffffff" />
        {/* For PWA dark mode support */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="font-sans antialiased">
        {children}
        {/* Register service worker for PWA */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}