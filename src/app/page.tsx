'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import FruiticaChat from './components/fruitica-chat'
import { AUTH_STORAGE_KEY, AuthSession } from './lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shophoaqua.duongnongtung96.workers.dev'

interface Product {
  id: number
  name: string
  price: number
  tag: string | null
  rating: number
  description: string | null
  image_key: string
}

const benefits = [
  { icon: '🌿', title: 'Từ vườn chọn lọc', text: 'Nguồn quả rõ ràng, thu hoạch đúng độ chín và giữ trọn vị tự nhiên.' },
  { icon: '🚚', title: 'Giao nhanh trong ngày', text: 'Đóng gói cẩn thận, đưa hoa quả tươi đến tận cửa nhà bạn.' },
  { icon: '✓', title: 'Tươi mới mỗi sáng', text: 'Từng lô hàng được kiểm tra kỹ trước khi lên kệ Fruitica.' },
  { icon: '♡', title: 'Lành cho cả nhà', text: 'Thêm vitamin và nguồn năng lượng ngon lành vào mỗi ngày.' },
]

const reviews = [
  { initial: 'N', name: 'Anh Nam', place: 'Hà Nội', text: 'Trái cây rất tươi, đóng gói cẩn thận và giao đúng hẹn. Tôi đã đặt hàng lặp lại nhiều lần.' },
  { initial: 'L', name: 'Lan Anh', place: 'Đà Nẵng', text: 'Vị ngọt tự nhiên, quả đẹp và giá hợp lý. Cả nhà tôi đều thích.' },
  { initial: 'T', name: 'Tuấn Minh', place: 'TP. Hồ Chí Minh', text: 'Giao hàng nhanh, tư vấn nhiệt tình. Mùa nào thức nấy, lúc nào cũng ngon.' },
]

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) setSession(JSON.parse(stored) as AuthSession)
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    fetch(`${API_URL}/api/products`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Product request failed')
        return response.json() as Promise<{ success: boolean; data: Product[] }>
      })
      .then((result) => {
        if (result.success) setProducts(result.data)
        else setLoadError(true)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setSession(null)
  }

  return (
    <>
      <header className="site-header">
        <div className="container nav-row">
          <Link href="/" className="brand" aria-label="Fruitica - Trang chủ"><span className="brand-mark">F</span><span>Fruitica</span></Link>
          <nav className="main-nav" aria-label="Điều hướng chính"><a href="#home">Trang chủ</a><a href="#about">Về Fruitica</a><a href="#products">Sản phẩm</a><a href="#reviews">Đánh giá</a></nav>
          <div className="nav-actions">
            <button className="cart-button" type="button" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}>Giỏ hàng <span className="cart-count">{cartCount}</span></button>
            {session ? <div className="account-actions"><span className="account-name">Chào, {session.user.full_name}</span>{session.user.role === 'admin' && <Link className="button button-outline button-small" href="/admin">Trang Admin</Link>}<button className="text-button" type="button" onClick={logout}>Đăng xuất</button></div> : <Link className="button button-green button-small" href="/login">Đăng nhập</Link>}
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home"><div className="container hero-grid">
          <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" /> Tươi ngon mỗi ngày</span><h1>Hoa quả sạch,<br /><em>niềm vui lành.</em></h1><p>Fruitica tuyển chọn trái cây theo mùa, tươi ngon từ vườn đến bàn ăn. Một lựa chọn nhỏ, chăm sóc cả nhà mỗi ngày.</p><div className="hero-actions"><a className="button button-green" href="#products">Khám phá mùa quả <span aria-hidden="true">↗</span></a><a className="quiet-link" href="#about">Điều làm nên Fruitica <span aria-hidden="true">↓</span></a></div><div className="hero-stats"><div><strong>2.4K+</strong><span>khách hàng thân thiết</span></div><div><strong>15+</strong><span>loại quả theo mùa</span></div><div><strong>4.9<span className="stat-star">★</span></strong><span>điểm hài lòng</span></div></div></div>
          <div className="hero-art"><img src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1100&q=85" alt="Giỏ hoa quả tươi nhiều màu sắc" /><div className="hero-note"><span className="note-fruit">🥭</span><span><strong>Mùa xoài đã về</strong><small>Ngọt thơm, chọn tại vườn</small></span></div><div className="hero-stamp">TƯƠI<br />MỖI NGÀY</div></div>
        </div></section>

        <section className="section benefits-section" id="about"><div className="container"><div className="section-heading heading-row"><div><span className="kicker">Vì sao chọn Fruitica</span><h2>Chăm chút từ vườn<br />đến tay bạn.</h2></div><p>Hoa quả ngon không chỉ bắt đầu từ hương vị, mà còn từ cách chúng được trồng, chọn và trao đến bạn.</p></div><div className="benefit-grid">{benefits.map((benefit) => <article className="benefit" key={benefit.title}><span className="benefit-icon">{benefit.icon}</span><h3>{benefit.title}</h3><p>{benefit.text}</p></article>)}</div></div></section>

        <section className="section product-section" id="products"><div className="container"><div className="section-heading heading-row"><div><span className="kicker">Tuyển chọn trong ngày</span><h2>Mùa quả ngon<br />đang chờ bạn.</h2></div><a className="quiet-link" href="#contact">Xem cách đặt hàng <span aria-hidden="true">↗</span></a></div>
          {loading ? <p className="catalog-state">Đang tải sản phẩm tươi ngon...</p> : loadError ? <p className="catalog-state">Chưa kết nối được danh sách sản phẩm. Vui lòng thử tải lại trang.</p> : products.length === 0 ? <p className="catalog-state">Sản phẩm mới sẽ sớm có mặt tại đây.</p> : <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}><div className="product-photo"><img src={`${API_URL}/api/images/${encodeURIComponent(product.image_key)}`} alt={product.name} loading="lazy" /><span className="product-tag">{product.tag || 'Fresh'}</span></div><div className="product-info"><div className="product-meta"><span>Hoa quả tươi</span><span className="rating">★ {product.rating?.toFixed(1) ?? '5.0'}</span></div><h3>{product.name}</h3><p>{product.description || 'Hoa quả tươi ngon được Fruitica tuyển chọn mỗi ngày.'}</p><div className="product-bottom"><strong>{product.price.toLocaleString('vi-VN')} <small>đ</small></strong><button className="add-button" type="button" onClick={() => setCartCount((count) => count + 1)} aria-label={`Thêm ${product.name} vào giỏ`}>+</button></div></div></article>)}</div>}
        </div></section>

        <section className="container offer-band"><div className="offer-mark">F</div><div><span className="kicker">Một chút ngọt lành</span><h2>Tuần này, thêm sắc quả vào bàn ăn.</h2><p>Ưu đãi 20% cho đơn hàng từ 500.000đ.</p></div><a className="button button-light" href="#products">Chọn hoa quả <span aria-hidden="true">↗</span></a></section>

        <section className="section review-section" id="reviews"><div className="container"><div className="section-heading"><span className="kicker">Lời thương gửi lại</span><h2>Ngon lành qua lời kể.</h2></div><div className="review-grid">{reviews.map((review) => <article className="review" key={review.name}><div className="review-stars" aria-label="5 trên 5 sao">★★★★★</div><p>“{review.text}”</p><div className="review-person"><span>{review.initial}</span><div><strong>{review.name}</strong><small>Khách hàng · {review.place}</small></div></div></article>)}</div></div></section>
      </main>

      <footer className="site-footer" id="contact"><div className="container footer-content"><div><Link href="/" className="brand footer-brand"><span className="brand-mark">F</span><span>Fruitica</span></Link><p>Hoa quả sạch cho những ngày thật lành.</p></div><div><strong>Ghé thăm</strong><a href="#products">Sản phẩm</a><a href="#about">Câu chuyện Fruitica</a></div><div><strong>Liên hệ</strong><a href="mailto:hello@fruitica.vn">hello@fruitica.vn</a><span>Thứ 2 – Chủ nhật · 8:00–20:00</span></div></div><div className="container footer-bottom">© 2026 Fruitica. Tươi ngon mỗi ngày.</div></footer>
      <FruiticaChat />
    </>
  )
}