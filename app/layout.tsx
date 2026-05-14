import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'),
  title: {
    default: 'Best AI Tools for GTM, SEO & Growth | AstroGTM',
    template: '%s | AstroGTM',
  },
  description: 'Explore an expert-curated list of the latest AI tools to scale user acquisition — built for founders, marketers, and GTM teams.',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  if (
                    e.message && e.message.indexOf('Loading chunk') !== -1 ||
                    e.message && e.message.indexOf('ChunkLoadError') !== -1
                  ) {
                    if (!sessionStorage.getItem('chunk_reload')) {
                      sessionStorage.setItem('chunk_reload', '1');
                      window.location.reload();
                    }
                  }
                });
              }
            `,
          }}
        />
      </head>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-S7J68DJQKE" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-S7J68DJQKE');
      ` }} />
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
