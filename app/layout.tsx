import type { Metadata } from 'next';
import './globals.css';
import { TopBar } from '@/components/TopBar';
import { en } from '@/lib/i18n/en';

export const metadata: Metadata = {
  title: en.APP_NAME,
  description: en.META_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <TopBar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {children}
        </main>
      </body>
    </html>
  );
}
