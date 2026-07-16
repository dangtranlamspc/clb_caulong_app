import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BNB BADMINTON CLUB",
  description: "Hệ thống quản lý thành viên",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
          containerStyle={{ zIndex: 999999 }}
        />
        {children}
      </body>
    </html>
  );
}