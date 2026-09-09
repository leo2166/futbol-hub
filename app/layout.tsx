import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { QueryProvider } from '@/components/query-provider'
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Mis Equipos · Barça, Real Madrid e Inter Miami',
  description:
    'Próximos partidos, resultados recientes y clasificación en vivo del FC Barcelona, Real Madrid e Inter Miami CF, con datos de ESPN.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`dark bg-background ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
        {/* Registers the Service Worker for background notifications */}
        <ServiceWorkerRegistrar />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
