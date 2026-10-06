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
}

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [ready, setReady] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [tag, setTag] = useState('Hot')
  const [description, setDescription] = useState('')
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
    const response = await fetch(`${API_URL}/api/products`)
    const result = await response.json() as { success: boolean; data: Product[] }
    if (!response.ok || !result.success) throw new Error('Không tải được danh sách sản phẩm.')
    setProducts(result.data)
  }

  useEffect(() => {
    if (session) loadProducts().catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Không tải được sản phẩm.'))
  }, [session])

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!session || !image) {
      setMessage('Vui lòng chọn ảnh sản phẩm.')
      return
    }

    setLoading(true)
    setMessage('')
    const form = new FormData()
    form.set('name', name)
    form.set('price', price)
    form.set('tag', tag)
    form.set('description', description)
    form.set('image', image)

    try {
      const response = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: form,
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể thêm sản phẩm.')

      setName('')
      setPrice('')
      setTag('Hot')
      setDescription('')
      setImage(null)
      setPreview('')
      formElement.reset()
      await loadProducts()
      setMessage('Sản phẩm đã được đăng lên cửa hàng.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đăng sản phẩm.')
    } finally {
      setLoading(false)
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
        <div className="admin-heading"><div><span className="kicker">Quản lý cửa hàng</span><h1>Sản phẩm</h1><p>Thêm hoa quả mới vào kệ Fruitica.</p></div><Link className="button button-outline" href="/">Xem cửa hàng <span aria-hidden="true">↗</span></Link></div>
        {(session.must_change_password || showPasswordForm) ? <section className="admin-password-panel"><span className="kicker">Bảo mật tài khoản</span><h2>{session.must_change_password ? 'Đổi mật khẩu mặc định' : 'Cập nhật mật khẩu'}</h2><p>{session.must_change_password ? 'Hãy đặt mật khẩu mới trước khi quản lý sản phẩm.' : 'Chọn mật khẩu mới dài ít nhất 8 ký tự.'}</p><form className="product-form" onSubmit={changePassword}><label>Mật khẩu hiện tại<input type="password" value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} required autoComplete="current-password" /></label><label>Mật khẩu mới<input type="password" value={passwordNew} onChange={(event) => setPasswordNew(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></label>{passwordMessage && <p className={`form-message ${passwordMessage.startsWith('Mật khẩu đã') ? 'success' : ''}`} role="status">{passwordMessage}</p>}<button className="button button-green" type="submit">Cập nhật mật khẩu</button></form></section> : <div className="admin-layout">
          <section className="admin-form-panel"><div className="panel-heading"><span className="panel-number">01</span><div><h2>Thêm sản phẩm</h2><p>Thông tin sản phẩm sẽ hiển thị ngay trên cửa hàng.</p></div></div>
            <form className="product-form" onSubmit={addProduct}>
              <label>Tên hoa quả<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="Ví dụ: Xoài cát Hòa Lộc" /></label>
              <div className="form-row"><label>Giá bán (VNĐ)<input type="number" min="1" step="1000" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="79.000" /></label><label>Nhãn<select value={tag} onChange={(event) => setTag(event.target.value)}><option>Hot</option><option>New</option><option>Best</option><option>Fresh</option></select></label></div>
              <label>Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={500} placeholder="Hương vị, nguồn gốc và cách thưởng thức..." /></label>
              <label className="upload-label">Ảnh sản phẩm <span>JPG, PNG hoặc WebP · tối đa 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => { const selected = event.target.files?.[0] ?? null; setImage(selected); setPreview(selected ? URL.createObjectURL(selected) : '') }} />{preview ? <img className="upload-preview" src={preview} alt="Xem trước ảnh sản phẩm" /> : <span className="upload-drop"><strong>＋</strong><span>Chọn ảnh từ thiết bị</span></span>}</label>
              {message && <p className={`form-message ${message.startsWith('Sản phẩm') ? 'success' : ''}`} role="status">{message}</p>}
              <button className="button button-green submit-product" type="submit" disabled={loading}>{loading ? 'Đang đăng sản phẩm...' : 'Đăng sản phẩm'} <span aria-hidden="true">↗</span></button>
            </form>
          </section>
          <section className="inventory-panel"><div className="inventory-heading"><div><span className="kicker">Danh mục</span><h2>Đang bán <span>{products.length}</span></h2></div><span className="inventory-dot">Đang cập nhật</span></div>
            {products.length ? <div className="inventory-list">{products.map((product) => <article className="inventory-item" key={product.id}><img src={`${API_URL}/api/images/${encodeURIComponent(product.image_key)}`} alt="" /><div><span className="inventory-tag">{product.tag || 'Fresh'}</span><strong>{product.name}</strong><small>{product.price.toLocaleString('vi-VN')} đ</small></div></article>)}</div> : <p className="inventory-empty">Chưa có sản phẩm trong danh mục.</p>}
          </section>
        </div>}
      </div>
    </main>
  )
}