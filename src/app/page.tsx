'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
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
  stock: number
  unit: string
}

interface CartLine {
  product_id: number
  quantity: number
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
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartReady, setCartReady] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [orderName, setOrderName] = useState('')
  const [orderPhone, setOrderPhone] = useState('')
  const [orderAddress, setOrderAddress] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [orderError, setOrderError] = useState('')
  const [orderPlacedId, setOrderPlacedId] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) setSession(JSON.parse(stored) as AuthSession)
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    try {
      const savedCart = window.localStorage.getItem('fruitica-cart-v1')
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart)
        if (Array.isArray(parsed)) {
          setCart(parsed.filter((line): line is CartLine => Number.isSafeInteger(line?.product_id) && Number.isSafeInteger(line?.quantity) && line.quantity > 0))
        }
      }
    } catch {
      window.localStorage.removeItem('fruitica-cart-v1')
    } finally {
      setCartReady(true)
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

  useEffect(() => {
    if (cartReady) window.localStorage.setItem('fruitica-cart-v1', JSON.stringify(cart))
  }, [cart, cartReady])

  useEffect(() => {
    if (!loading) {
      const availableIds = new Set(products.filter((product) => product.stock > 0).map((product) => product.id))
      setCart((current) => current.filter((line) => availableIds.has(line.product_id)))
    }
  }, [loading, products])

  const cartItems = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.product_id)
    return product ? [{ product, quantity: line.quantity }] : []
  })
  const cartCount = cart.reduce((count, line) => count + line.quantity, 0)
  const cartTotal = cartItems.reduce((total, line) => total + line.product.price * line.quantity, 0)

  function addToCart(product: Product) {
    if (product.stock < 1) return
    setCart((current) => {
      const existing = current.find((line) => line.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return current
        return current.map((line) => line.product_id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      }
      return [...current, { product_id: product.id, quantity: 1 }]
    })
    setOrderPlacedId('')
  }

  function adjustQuantity(product: Product, delta: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product_id !== product.id) return [line]
      const quantity = Math.min(product.stock, line.quantity + delta)
      return quantity > 0 ? [{ ...line, quantity }] : []
    }))
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingOrder(true)
    setOrderError('')
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: orderName,
          phone: orderPhone,
          delivery_address: orderAddress,
          note: orderNote,
          items: cart.map(({ product_id, quantity }) => ({ product_id, quantity })),
        }),
      })
      const result = await response.json() as { success: boolean; data?: { id: string }; error?: string }
      if (!response.ok || !result.success || !result.data) throw new Error(result.error || 'Không thể tạo đơn hàng.')

      setProducts((current) => current.map((product) => {
        const line = cart.find((item) => item.product_id === product.id)
        return line ? { ...product, stock: product.stock - line.quantity } : product
      }))
      setCart([])
      setCheckingOut(false)
      setOrderPlacedId(result.data.id)
      setOrderNote('')
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Không thể kết nối để tạo đơn hàng.')
    } finally {
      setSubmittingOrder(false)
    }
  }

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
            <button className="cart-button" type="button" onClick={() => { setCartOpen(true); setOrderPlacedId('') }} aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}>Giỏ hàng <span className="cart-count">{cartCount}</span></button>
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
          {loading ? <p className="catalog-state">Đang tải sản phẩm tươi ngon...</p> : loadError ? <p className="catalog-state">Chưa kết nối được danh sách sản phẩm. Vui lòng thử tải lại trang.</p> : products.length === 0 ? <p className="catalog-state">Sản phẩm mới sẽ sớm có mặt tại đây.</p> : <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}><div className="product-photo"><img src={`${API_URL}/api/images/${encodeURIComponent(product.image_key)}`} alt={product.name} loading="lazy" /><span className="product-tag">{product.tag || 'Fresh'}</span>{product.stock <= 0 && <span className="sold-out-tag">Hết hàng</span>}</div><div className="product-info"><div className="product-meta"><span>{product.stock > 0 ? `Còn ${product.stock} ${product.unit}` : 'Tạm hết hàng'}</span><span className="rating">★ {product.rating?.toFixed(1) ?? '5.0'}</span></div><h3>{product.name}</h3><p>{product.description || 'Hoa quả tươi ngon được Fruitica tuyển chọn mỗi ngày.'}</p><div className="product-bottom"><strong>{product.price.toLocaleString('vi-VN')} <small>đ</small></strong><button className="add-button" type="button" disabled={product.stock <= 0} onClick={() => addToCart(product)} aria-label={`Thêm ${product.name} vào giỏ`}>+</button></div></div></article>)}</div>}
        </div></section>

        <section className="container offer-band"><div className="offer-mark">F</div><div><span className="kicker">Một chút ngọt lành</span><h2>Tuần này, thêm sắc quả vào bàn ăn.</h2><p>Ưu đãi 20% cho đơn hàng từ 500.000đ.</p></div><a className="button button-light" href="#products">Chọn hoa quả <span aria-hidden="true">↗</span></a></section>

        <section className="section review-section" id="reviews"><div className="container"><div className="section-heading"><span className="kicker">Lời thương gửi lại</span><h2>Ngon lành qua lời kể.</h2></div><div className="review-grid">{reviews.map((review) => <article className="review" key={review.name}><div className="review-stars" aria-label="5 trên 5 sao">★★★★★</div><p>“{review.text}”</p><div className="review-person"><span>{review.initial}</span><div><strong>{review.name}</strong><small>Khách hàng · {review.place}</small></div></div></article>)}</div></div></section>
      </main>

      <footer className="site-footer" id="contact"><div className="container footer-content"><div><Link href="/" className="brand footer-brand"><span className="brand-mark">F</span><span>Fruitica</span></Link><p>Hoa quả sạch cho những ngày thật lành.</p></div><div><strong>Ghé thăm</strong><a href="#products">Sản phẩm</a><a href="#about">Câu chuyện Fruitica</a></div><div><strong>Liên hệ</strong><a href="mailto:hello@fruitica.vn">hello@fruitica.vn</a><span>Thứ 2 – Chủ nhật · 8:00–20:00</span></div></div><div className="container footer-bottom">© 2026 Fruitica. Tươi ngon mỗi ngày.</div></footer>
      {cartOpen && <div className="cart-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}>
        <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <header className="cart-drawer-header"><div><span className="kicker">Fruitica</span><h2 id="cart-title">{orderPlacedId ? 'Đặt hàng thành công' : checkingOut ? 'Thông tin giao hàng' : 'Giỏ hàng'}</h2></div><button type="button" className="chat-close" onClick={() => setCartOpen(false)} aria-label="Đóng giỏ hàng">×</button></header>
          {orderPlacedId ? <div className="order-complete"><span>✓</span><h3>Cảm ơn bạn đã đặt hàng!</h3><p>Mã đơn: <strong>{orderPlacedId.slice(0, 8).toUpperCase()}</strong></p><p>Fruitica sẽ liên hệ xác nhận đơn qua số điện thoại của bạn.</p><button className="button button-green" type="button" onClick={() => setCartOpen(false)}>Tiếp tục mua sắm</button></div> : checkingOut ? <form className="checkout-form" onSubmit={placeOrder}>
            <label>Họ và tên<input value={orderName} onChange={(event) => setOrderName(event.target.value)} required maxLength={100} autoComplete="name" /></label>
            <label>Số điện thoại<input type="tel" value={orderPhone} onChange={(event) => setOrderPhone(event.target.value)} required maxLength={24} autoComplete="tel" /></label>
            <label>Địa chỉ giao hàng<textarea value={orderAddress} onChange={(event) => setOrderAddress(event.target.value)} required maxLength={300} rows={3} autoComplete="street-address" /></label>
            <label>Ghi chú<textarea value={orderNote} onChange={(event) => setOrderNote(event.target.value)} maxLength={500} rows={2} placeholder="Không bắt buộc" /></label>
            {orderError && <p className="form-message" role="alert">{orderError}</p>}
            <div className="cart-total"><span>Tổng đơn</span><strong>{cartTotal.toLocaleString('vi-VN')} đ</strong></div>
            <button className="button button-green checkout-submit" type="submit" disabled={submittingOrder || cartItems.length === 0}>{submittingOrder ? 'Đang tạo đơn...' : 'Xác nhận đặt hàng'}</button>
            <button className="cart-back" type="button" onClick={() => { setCheckingOut(false); setOrderError('') }}>Quay lại giỏ hàng</button>
          </form> : <>
            <div className="cart-lines">{cartItems.map(({ product, quantity }) => <article className="cart-line" key={product.id}><img src={`${API_URL}/api/images/${encodeURIComponent(product.image_key)}`} alt="" /><div className="cart-line-info"><strong>{product.name}</strong><small>{product.price.toLocaleString('vi-VN')} đ / {product.unit}</small><div className="quantity-control"><button type="button" onClick={() => adjustQuantity(product, -1)} aria-label={`Giảm ${product.name}`}>−</button><span>{quantity}</span><button type="button" disabled={quantity >= product.stock} onClick={() => adjustQuantity(product, 1)} aria-label={`Tăng ${product.name}`}>+</button></div></div><strong className="cart-line-total">{(product.price * quantity).toLocaleString('vi-VN')} đ</strong></article>)}{cartItems.length === 0 && <p className="cart-empty">Giỏ hàng đang trống. Hãy chọn hoa quả bạn yêu thích.</p>}</div>
            {cartItems.length > 0 && <div className="cart-footer"><div className="cart-total"><span>Tạm tính</span><strong>{cartTotal.toLocaleString('vi-VN')} đ</strong></div><button className="button button-green checkout-submit" type="button" onClick={() => { setCheckingOut(true); setOrderError('') }}>Tiến hành đặt hàng <span aria-hidden="true">↗</span></button><small>Phí giao hàng sẽ được cửa hàng xác nhận.</small></div>}
          </>}
        </section>
      </div>}
      <FruiticaChat />
    </>
  )
}