import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'
import { ErrorToastProvider } from '@/components/error-toast'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'ScopeStack Content Engine',
  description: 'Research-driven content generation for professional services scoping',
  generator: 'ScopeStack',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ErrorToastProvider>
            {children}
            <Toaster 
              position="top-right"
              expand={true}
              richColors={true}
              closeButton={true}
              toastOptions={{
                duration: 5000,
                style: {
                  fontSize: '14px'
                }
              }}
            />
          </ErrorToastProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
