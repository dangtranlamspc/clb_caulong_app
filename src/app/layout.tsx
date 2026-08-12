import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GlobalNavLoading } from "@/components/common/GlobalNavLoading";
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
  themeColor: "#1d4ed8",
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
    <html lang="vi">
      <body className={`${nunito.className} bg-gray-50 min-h-screen`}>
        <Toaster
          position="top-center"
          toastOptions={{ duration: 3000 }}
          containerStyle={{
            top: "calc(env(safe-area-inset-top, 0px) + 60px)",
            zIndex: 999999,
          }}
        />
        <GlobalNavLoading />
        {children}
      </body>
    </html>
  );
}