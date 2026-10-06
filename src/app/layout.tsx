import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fruitica | Hoa quả tươi ngon',
  description: 'Fruitica - Cửa hàng hoa quả sạch, tươi ngon giao tận nơi.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>{children}</body>
    </html>
  )
}