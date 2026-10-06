'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AUTH_STORAGE_KEY, AuthSession, UserRole } from '../lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shophoaqua.duongnongtung96.workers.dev'
type Mode = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [adminCode, setAdminCode] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    const registering = mode === 'register'
    const payload = registering
      ? { email, password, full_name: fullName, role, admin_code: adminCode }
      : { email, password }

    try {
      const response = await fetch(`${API_URL}/api/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        if (response.status === 404) {
          throw new Error('API đăng nhập chưa được cập nhật trên Cloudflare Worker. Hãy deploy Worker rồi thử lại.')
        }
        throw new Error(`API trả về phản hồi không hợp lệ (HTTP ${response.status}). Hãy kiểm tra trạng thái Cloudflare Worker.`)
      }

      const result = await response.json() as { success: boolean; data?: AuthSession; error?: string }
      if (!response.ok || !result.success || !result.data) throw new Error(result.error || 'Không thể đăng nhập lúc này.')

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.data))
      router.replace(result.data.user.role === 'admin' ? '/admin' : '/')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi kết nối, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link href="/" className="brand auth-brand"><span className="brand-mark">F</span><span>Fruitica</span></Link>
        <div className="auth-visual-copy"><span className="kicker">Tươi ngon mỗi ngày</span><h1>Một chút lành<br />cho ngày thêm vui.</h1><p>Hoa quả được tuyển chọn kỹ lưỡng, mang vị tươi ngon từ vườn đến nhà bạn.</p></div>
        <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1100&q=85" alt="Quầy hoa quả tươi theo mùa" />
        <span className="visual-caption">Từ vườn chọn lọc · Gửi trao bằng sự tử tế</span>
      </section>

      <section className="auth-panel">
        <Link href="/" className="back-link">← Về cửa hàng</Link>
        <div className="auth-form-wrap">
          <span className="kicker">Chào mừng bạn</span>
          <h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
          <p className="auth-intro">{mode === 'login' ? 'Đăng nhập để tiếp tục cùng Fruitica.' : 'Tạo tài khoản để lưu lại những lựa chọn tươi ngon.'}</p>

          <div className="auth-tabs" role="tablist" aria-label="Chọn hình thức">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }}>Đăng nhập</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage('') }}>Đăng ký</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label>Họ và tên<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required maxLength={80} /></label>}
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} /></label>
            {mode === 'register' && <>
              <label>Loại tài khoản<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="customer">Khách hàng</option><option value="admin">Quản trị viên</option></select></label>
              {role === 'admin' && <label>Mã mời quản trị<input type="password" value={adminCode} onChange={(event) => setAdminCode(event.target.value)} autoComplete="off" required /></label>}
            </>}
            {message && <p className="form-message" role="alert">{message}</p>}
            <button className="button button-green auth-submit" type="submit" disabled={submitting}>{submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <span aria-hidden="true">↗</span></button>
          </form>
          <p className="auth-switch">{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage('') }}>{mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}</button></p>
        </div>
        <p className="auth-footnote">Tươi ngon, minh bạch và an toàn.</p>
      </section>
    </main>
  )
}