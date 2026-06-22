import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const nunito = Nunito({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'CLB Cầu Lông',
  description: 'Hệ thống quản lý thành viên',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${nunito.className} bg-gray-50 min-h-screen`}>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        {children}
      </body>
    </html>
  );
}
