import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cogniviti Bridge — Enterprise Integration Accelerator',
  description: 'Accelerating enterprise integrations with speed, structure, and control.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
