import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reporte PV | PigVision™ — Asimetrix',
  description: 'Generador de reportes de peso vivo para producción porcina — Asimetrix',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: 'var(--ax-bg-alt)', minHeight: '100vh' }}>{children}</body>
    </html>
  )
}
