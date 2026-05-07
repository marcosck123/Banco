import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Banco do Casal',
  description: 'Controle de despesas compartilhadas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-emerald-50 min-h-screen`}>
        <div className="max-w-2xl mx-auto px-4 pb-24">
          {children}
        </div>
        <Navigation />
      </body>
    </html>
  )
}
