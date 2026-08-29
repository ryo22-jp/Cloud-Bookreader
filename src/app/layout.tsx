import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'CloudReader - Google Drive 直結 Webリーダー',
  description: 'Googleドライブ内の自炊マンガ・書籍（PDF/ZIP/CBZ/EPUB）をマルチデバイスで快適に読めるPWAリーダー',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CloudReader',
  },
  verification: {
    google: 'jdKTSCWn7-7SvMgYeoYdos0KDWAoiDh5OxkPyLLnByQ',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#171513',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
