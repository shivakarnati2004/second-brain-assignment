import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className="noise" />
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111120',
            color: '#e8e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#4ecdc4', secondary: '#050508' },
          },
          error: {
            iconTheme: { primary: '#ff6b35', secondary: '#050508' },
          },
        }}
      />
    </>
  );
}
