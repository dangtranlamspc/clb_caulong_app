import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GlobalNavLoading } from "@/components/common/GlobalNavLoading";
import { THEME_CSS, THEME_INIT_SCRIPT, ThemeProvider } from "@/lib/theme";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CLB Cầu Lông BNB",
  description: "Ứng dụng quản lý CLB Cầu Lông BNB",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CLB Cầu Lông BNB",
  },
  icons: {
    icon: "/icons/icon-512x512.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#183153",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${nunito.className} min-h-screen`}>
        <ThemeProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              },
            }}
            containerStyle={{
              top: "calc(env(safe-area-inset-top, 0px) + 60px)",
              zIndex: 999999,
            }}
          />
          <GlobalNavLoading />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}