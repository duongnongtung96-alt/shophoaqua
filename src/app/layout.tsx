import type { Metadata } from 'next'
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google'
import './globals.css'

const vietnameseFont = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-vietnamese',
  display: 'swap',
})

const displayFont = Noto_Serif({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fruitica | Hoa quả tươi ngon',
  description: 'Fruitica - Cửa hàng hoa quả sạch, tươi ngon giao tận nơi.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${vietnameseFont.variable} ${displayFont.variable}`}>
      <body>{children}</body>
    </html>
  )
}