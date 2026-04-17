import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { FeedbackProvider } from '@/components/providers/FeedbackProvider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta'
});

export const metadata: Metadata = {
  title: 'OS Assistência',
  description: 'Sistema completo de ordem de serviço para assistência técnica.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={plusJakarta.variable}>
        <AuthProvider><FeedbackProvider>{children}</FeedbackProvider></AuthProvider>
      </body>
    </html>
  );
}
