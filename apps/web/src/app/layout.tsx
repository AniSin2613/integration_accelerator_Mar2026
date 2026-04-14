import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cogniviti Bridge — Enterprise Integration Accelerator',
  description: 'Accelerating enterprise integrations with speed, structure, and control.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton duration={5000} />
      </body>
    </html>
  );
}
