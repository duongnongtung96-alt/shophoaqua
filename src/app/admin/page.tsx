'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { AUTH_STORAGE_KEY, AuthSession } from '../lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shophoaqua.duongnongtung96.workers.dev'

interface Product {
  id: number
  name: string
  price: number
  tag: string | null
  description: string | null
  image_key: string
  stock: number
  unit: string
  origin: string | null
  specifications: string | null
  is_active: number
}

interface Order {
  id: string
  customer_name: string
  phone: string
  delivery_address: string
  note: string | null
  total: number
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled'
  created_at: string
  items: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [ready, setReady] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [unit, setUnit] = useState('kg')
  const [tag, setTag] = useState('Hot')
  const [description, setDescription] = useState('')
  const [origin, setOrigin] = useState('')
  const [specifications, setSpecifications] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [passwordCurrent, setPasswordCurrent] = useState('')
  const [passwordNew, setPasswordNew] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) as AuthSession : null
      if (!parsed || parsed.user.role !== 'admin' || !parsed.token) {
        window.alert('Vui lòng đăng nhập bằng tài khoản quản trị.')
        router.replace('/login')
        return
      }
      setSession(parsed)
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      router.replace('/login')
    } finally {
      setReady(true)
    }
  }, [router])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  async function loadProducts() {
    const response = await fetch(`${API_URL}/api/admin/products`, { headers: { Authorization: `Bearer ${session?.token}` } })
    const result = await response.json() as { success: boolean; data: Product[] }
    if (!response.ok || !result.success) throw new Error('Không tải được danh sách sản phẩm.')
    setProducts(result.data)
  }

  async function loadOrders() {
    const response = await fetch(`${API_URL}/api/admin/orders`, { headers: { Authorization: `Bearer ${session?.token}` } })
    const result = await response.json() as { success: boolean; data: Order[] }
    if (!response.ok || !result.success) throw new Error('Không tải được danh sách đơn hàng.')
    setOrders(result.data)
  }

  useEffect(() => {
    if (session) Promise.all([loadProducts(), loadOrders()]).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Không tải được dữ liệu quản trị.'))
  }, [session])

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!session || (!editingId && !image)) {
      setMessage('Vui lòng chọn ảnh sản phẩm.')
      return
    }

    setLoading(true)
    setMessage('')
    const form = new FormData()
    form.set('name', name)
    form.set('price', price)
    form.set('stock', stock)
    form.set('unit', unit)
    form.set('tag', tag)
    form.set('description', description)
    form.set('origin', origin)
    form.set('specifications', specifications)
    if (image) form.set('image', image)

    try {
      const response = await fetch(editingId ? `${API_URL}/api/products/${editingId}` : `${API_URL}/api/products`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: form,
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể lưu sản phẩm.')

      const wasEditing = editingId !== null
      setEditingId(null)
      setName('')
      setPrice('')
      setStock('0')
      setUnit('kg')
      setTag('Hot')
      setDescription('')
      setOrigin('')
      setSpecifications('')
      setImage(null)
      setPreview('')
      formElement.reset()
      await loadProducts()
      setMessage(wasEditing ? 'Đã cập nhật sản phẩm.' : 'Sản phẩm đã được đăng lên cửa hàng.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đăng sản phẩm.')
    } finally {
      setLoading(false)
    }
  }

  function beginEdit(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setPrice(String(product.price))
    setStock(String(product.stock))
    setUnit(product.unit)
    setTag(product.tag || 'Fresh')
    setDescription(product.description || '')
    setOrigin(product.origin || '')
    setSpecifications(product.specifications || '')
    setImage(null)
    setPreview('')
    setActiveTab('products')
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setPrice('')
    setStock('0')
    setUnit('kg')
    setTag('Hot')
    setDescription('')
    setOrigin('')
    setSpecifications('')
    setImage(null)
    setPreview('')
    setMessage('')
  }

  async function setProductVisibility(product: Product, isActive: boolean) {
    if (!session || (product.is_active === 1 && !window.confirm(`Ẩn ${product.name} khỏi cửa hàng?`))) return
    try {
      const response = await fetch(`${API_URL}/api/products/${product.id}/visibility`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể đổi trạng thái sản phẩm.')
      await loadProducts()
      setMessage(isActive ? `Đã khôi phục ${product.name} lên cửa hàng.` : `Đã ẩn ${product.name} khỏi cửa hàng.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đổi trạng thái sản phẩm.')
    }
  }

  async function updateOrderStatus(order: Order, status: Order['status']) {
    if (!session) return
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể cập nhật đơn hàng.')
      await Promise.all([loadOrders(), loadProducts()])
      setMessage(`Đã cập nhật đơn ${order.id.slice(0, 8)}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật đơn hàng.')
    }
  }

  async function updateStock(product: Product, nextStock: number) {
    if (!session || !Number.isSafeInteger(nextStock) || nextStock < 0) return
    try {
      const response = await fetch(`${API_URL}/api/products/${product.id}/stock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: nextStock }),
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể cập nhật tồn kho.')
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: nextStock } : item))
      setMessage(`Đã cập nhật tồn kho ${product.name}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật tồn kho.')
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setPasswordMessage('')

    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: passwordCurrent, new_password: passwordNew }),
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể đổi mật khẩu.')

      const nextSession = { ...session, must_change_password: false }
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setPasswordCurrent('')
      setPasswordNew('')
      setShowPasswordForm(false)
      setPasswordMessage('Mật khẩu đã được cập nhật.')
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.')
    }
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    router.replace('/login')
  }

  if (!ready || !session) return <main className="admin-loading">Đang kiểm tra tài khoản...</main>

  return (
    <main className="admin-shell">
      <header className="admin-topbar"><div className="admin-topbar-inner"><Link href="/" className="brand"><span className="brand-mark">F</span><span>Fruitica <small>STUDIO</small></span></Link><div className="admin-user"><span>{session.user.full_name}<small>Quản trị viên</small></span><button type="button" onClick={() => { setShowPasswordForm((show) => !show); setPasswordMessage('') }}>Đổi mật khẩu</button><button type="button" onClick={logout}>Đăng xuất</button></div></div></header>
      <div className="admin-main container">
        <div className="admin-heading"><div><span className="kicker">Quản lý cửa hàng</span><h1>{activeTab === 'products' ? 'Sản phẩm' : 'Đơn hàng'}</h1><p>{activeTab === 'products' ? 'Quản lý danh mục, giá và số lượng tồn.' : 'Theo dõi trạng thái và thông tin giao hàng.'}</p></div><Link className="button button-outline" href="/">Xem cửa hàng <span aria-hidden="true">↗</span></Link></div>
        {!session.must_change_password && !showPasswordForm && <nav className="admin-tabs" aria-label="Khu vực quản trị"><button className={activeTab === 'products' ? 'active' : ''} type="button" onClick={() => setActiveTab('products')}>Sản phẩm <span>{products.filter((product) => product.is_active).length}</span></button><button className={activeTab === 'orders' ? 'active' : ''} type="button" onClick={() => setActiveTab('orders')}>Đơn hàng <span>{orders.filter((order) => order.status === 'pending').length}</span></button></nav>}
        {(session.must_change_password || showPasswordForm) ? <section className="admin-password-panel"><span className="kicker">Bảo mật tài khoản</span><h2>{session.must_change_password ? 'Đổi mật khẩu mặc định' : 'Cập nhật mật khẩu'}</h2><p>{session.must_change_password ? 'Hãy đặt mật khẩu mới trước khi quản lý sản phẩm.' : 'Chọn mật khẩu mới dài ít nhất 8 ký tự.'}</p><form className="product-form" onSubmit={changePassword}><label>Mật khẩu hiện tại<input type="password" value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} required autoComplete="current-password" /></label><label>Mật khẩu mới<input type="password" value={passwordNew} onChange={(event) => setPasswordNew(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></label>{passwordMessage && <p className={`form-message ${passwordMessage.startsWith('Mật khẩu đã') ? 'success' : ''}`} role="status">{passwordMessage}</p>}<button className="button button-green" type="submit">Cập nhật mật khẩu</button></form></section> : activeTab === 'products' ? <div className="admin-layout">
          <section className="admin-form-panel"><div className="panel-heading"><span className="panel-number">01</span><div><h2>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2><p>{editingId ? 'Cập nhật thông tin đang hiển thị trên cửa hàng.' : 'Thông tin sản phẩm sẽ hiển thị ngay trên cửa hàng.'}</p></div></div>
            <form className="product-form" onSubmit={addProduct}>
              <label>Tên hoa quả<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="Ví dụ: Xoài cát Hòa Lộc" /></label>
              <div className="form-row"><label>Giá bán (VNĐ)<input type="number" min="1" step="1000" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="79.000" /></label><label>Nhãn<select value={tag} onChange={(event) => setTag(event.target.value)}><option>Hot</option><option>New</option><option>Best</option><option>Fresh</option></select></label></div>
              <div className="form-row"><label>Tồn kho<input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required /></label><label>Đơn vị bán<input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} required placeholder="kg, hộp, quả..." /></label></div>
              <label>Xuất xứ<input value={origin} onChange={(event) => setOrigin(event.target.value)} maxLength={120} placeholder="Ví dụ: Cao Lãnh, Đồng Tháp" /></label>
              <label>Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={500} placeholder="Hương vị, nguồn gốc và cách thưởng thức..." /></label>
              <label>Thông số / đặc điểm<textarea value={specifications} onChange={(event) => setSpecifications(event.target.value)} rows={3} maxLength={1200} placeholder="Ví dụ: vị ngọt đậm; độ chín vừa; bảo quản mát..." /></label>
              <label className="upload-label">Ảnh sản phẩm <span>{editingId ? 'Chọn ảnh mới nếu muốn thay ảnh hiện tại' : 'JPG, PNG hoặc WebP · tối đa 5 MB'}</span><input type="file" accept="image/jpeg,image/png,image/webp" required={!editingId} onChange={(event) => { const selected = event.target.files?.[0] ?? null; setImage(selected); setPreview(selected ? URL.createObjectURL(selected) : '') }} />{preview ? <img className="upload-preview" src={preview} alt="Xem trước ảnh sản phẩm" /> : editingId ? <img className="upload-preview" src={`${API_URL}/api/images/${encodeURIComponent(products.find((product) => product.id === editingId)?.image_key ?? '')}`} alt="Ảnh hiện tại của sản phẩm" /> : <span className="upload-drop"><strong>＋</strong><span>Chọn ảnh từ thiết bị</span></span>}</label>
              {message && <p className="form-message" role="status">{message}</p>}
              <div className="product-form-actions"><button className="button button-green submit-product" type="submit" disabled={loading}>{loading ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Đăng sản phẩm'} <span aria-hidden="true">↗</span></button>{editingId && <button className="button button-outline" type="button" onClick={cancelEdit}>Hủy sửa</button>}</div>
            </form>
          </section>
          <section className="inventory-panel"><div className="inventory-heading"><div><span className="kicker">Danh mục</span><h2>Tất cả sản phẩm <span>{products.length}</span></h2></div><button className="refresh-button" type="button" onClick={() => void loadProducts()}>Làm mới</button></div>
            {products.length ? <div className="inventory-list">{products.map((product) => <article className={`inventory-item ${product.is_active ? '' : 'is-archived'}`} key={product.id}><img src={`${API_URL}/api/images/${encodeURIComponent(product.image_key)}`} alt="" /><div><span className="inventory-tag">{product.is_active ? product.tag || 'Fresh' : 'Đã ẩn'}</span><strong>{product.name}</strong><small>{product.price.toLocaleString('vi-VN')} đ · {product.stock} {product.unit} còn</small>{product.is_active ? <><form className="stock-edit" onSubmit={(event) => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get('stock')); void updateStock(product, value) }}><input aria-label={`Tồn kho ${product.name}`} name="stock" type="number" min="0" step="1" defaultValue={product.stock} /><button type="submit">Lưu tồn</button></form><div className="inventory-actions"><button type="button" onClick={() => beginEdit(product)}>Sửa</button><button type="button" onClick={() => void setProductVisibility(product, false)}>Ẩn khỏi shop</button></div></> : <div className="inventory-actions"><button type="button" onClick={() => void setProductVisibility(product, true)}>Khôi phục</button></div>}</div></article>)}</div> : <p className="inventory-empty">Chưa có sản phẩm trong danh mục.</p>}
          </section>
        </div> : <section className="orders-panel"><div className="inventory-heading"><div><span className="kicker">Bán hàng</span><h2>Đơn mới nhất <span>{orders.length}</span></h2></div><button className="refresh-button" type="button" onClick={() => void loadOrders()}>Làm mới</button></div>{message && <p className="form-message" role="status">{message}</p>}{orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-row" key={order.id}><div className="order-main"><div><strong>#{order.id.slice(0, 8).toUpperCase()} · {order.customer_name}</strong><small>{new Date(`${order.created_at.replace(' ', 'T')}Z`).toLocaleString('vi-VN')}</small></div><strong>{order.total.toLocaleString('vi-VN')} đ</strong></div><p>{order.items || 'Không có dòng hàng'}</p><div className="order-contact"><span>{order.phone}</span><span>{order.delivery_address}</span></div>{order.note && <small className="order-note">Ghi chú: {order.note}</small>}<label className="order-status">Trạng thái<select value={order.status} disabled={order.status === 'cancelled'} onChange={(event) => void updateOrderStatus(order, event.target.value as Order['status'])}><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã xác nhận</option><option value="shipping">Đang giao</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></label></article>)}</div> : <p className="inventory-empty">Chưa có đơn hàng.</p>}</section>}
      </div>
    </main>
  )
}