import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Alessio Bellan Meet', template: '%s | Alessio Bellan Meet' },
  description: 'Riunioni di lavoro private, chiare e protette.',
  twitter: {
    creator: '@alessiobellan',
    site: '@alessiobellan',
    card: 'summary_large_image',
  },
  openGraph: {
    url: 'https://www.alessiobellan.it/',
    images: [
      {
        url: '/images/livekit-meet-open-graph.png',
        width: 2000,
        height: 1000,
        type: 'image/png',
      },
    ],
    siteName: 'Alessio Bellan Meet',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/favicon.ico',
    },
    apple: [
      {
        rel: 'apple-touch-icon',
        url: '/images/livekit-apple-touch.png',
        sizes: '180x180',
      },
      { rel: 'mask-icon', url: '/images/livekit-safari-pinned-tab.svg', color: '#070707' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#FCCF03',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
