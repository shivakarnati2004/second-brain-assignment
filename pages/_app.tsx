import type { AppProps } from 'next/app';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="glass" style={{ borderRadius: 16, padding: 24, maxWidth: 520, width: '100%' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10 }}>Something went wrong</h1>
            <p style={{ color: 'var(--color-muted)', marginBottom: 14 }}>
              The app hit an unexpected error. Please refresh and try again.
            </p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className="noise" />
      <AppErrorBoundary>
        <Component {...pageProps} />
      </AppErrorBoundary>
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
