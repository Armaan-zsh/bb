import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'The Feed — Curated Tech Blogs',
  description: 'The best engineering and security blogs. No AI slop. Updated constantly.',
  openGraph: {
    title: 'The Feed',
    description: 'The best engineering and security blogs. No AI slop.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
