import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata = {
  title: 'Quotation Manager',
  description: 'Create, manage and download client quotations.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a5f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
