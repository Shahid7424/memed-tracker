import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: "Meme'd Payouts",
  description: 'Milestone-based payouts for creator campaigns on Instagram and YouTube.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
