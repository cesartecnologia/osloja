import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OS Assistência',
  description: 'Sistema de ordem de serviço',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}