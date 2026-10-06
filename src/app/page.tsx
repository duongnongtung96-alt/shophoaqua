'use client'
import { useEffect, useState } from 'react'

interface Product {
  id: number
  name: string
  price: number
  tag: string
  rating: number
  description: string
  image_key: string
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setProducts(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Fruitica - Hoa Quả Tươi Ngon</h1>
      
      {loading ? (
        <p>Đang tải danh sách hoa quả từ Cloudflare D1...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {products.map((p) => (
            <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '16px' }}>
              <img 
                src={`/api/images/${p.image_key}`} 
                alt={p.name} 
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <span style={{ background: '#e0f2fe', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{p.tag}</span>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#16a34a', fontSize: '18px' }}>{p.price.toLocaleString('vi-VN')} đ</strong>
                <button style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px' }}>
                  + Thêm
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}