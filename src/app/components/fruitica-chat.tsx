'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shophoaqua.duongnongtung96.workers.dev'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const initialMessage: ChatMessage = {
  role: 'assistant',
  content: 'Xin chào! Mình có thể tư vấn về hoa quả, cách chọn và bảo quản, đồng thời tra cứu giá và tồn kho của Fruitica. Nếu cần nhân viên hỗ trợ, bạn có thể gọi 0987890123.',
}

const suggestions = ['Giá và tồn kho', 'So sánh sản phẩm', 'Chính sách cửa hàng']

export default function FruiticaChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
  const [pending, setPending] = useState(false)
  const [contactQuestion, setContactQuestion] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactPending, setContactPending] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending, open])

  async function sendMessage(content: string) {
    const question = content.trim()
    if (!question || pending || question.length > 600) return

    const history = messages.slice(-6)
    setMessages((current) => [...current, { role: 'user', content: question }])
    setContactQuestion('')
    setContactMessage('')
    setInput('')
    setPending(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history }),
      })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        if (response.status === 404) {
          throw new Error('Chatbot API chưa được cập nhật trên Cloudflare Worker. Đang chờ triển khai phiên bản mới.')
        }
        throw new Error(`Chatbot API trả về HTTP ${response.status}. Vui lòng thử lại sau.`)
      }
      const result = await response.json() as { success: boolean; data?: { answer: string; needs_contact?: boolean }; error?: string }
      if (!response.ok || !result.success || !result.data?.answer) {
        throw new Error(result.error || 'Trợ lý chưa trả lời được, vui lòng thử lại.')
      }
      setMessages((current) => [...current, { role: 'assistant', content: result.data!.answer }])
      if (result.data.needs_contact) setContactQuestion(question)
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Không kết nối được với trợ lý. Vui lòng thử lại sau.',
      }])
    } finally {
      setPending(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  async function submitConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (contactPending || !contactQuestion) return

    setContactPending(true)
    setContactMessage('')
    try {
      const response = await fetch(`${API_URL}/api/chat/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactPhone, question: contactQuestion }),
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Chưa gửi được yêu cầu. Vui lòng gọi hotline 0987890123.')
      setContactMessage('Đã gửi số điện thoại. Nhân viên Fruitica sẽ liên hệ tư vấn.')
      setContactPhone('')
    } catch (error) {
      setContactMessage(error instanceof Error ? error.message : 'Chưa gửi được yêu cầu. Vui lòng gọi hotline 0987890123.')
    } finally {
      setContactPending(false)
    }
  }

  return (
    <div className="fruitica-chat">
      {open && <section className="chat-panel" aria-label="Trợ lý Fruitica">
        <header className="chat-header">
          <span className="chat-avatar">F</span>
          <div><strong>Trợ lý Fruitica</strong><small><span /> Tư vấn sản phẩm</small><a className="chat-hotline" href="tel:0987890123">Hotline: 0987890123</a></div>
          <button className="chat-close" type="button" onClick={() => setOpen(false)} aria-label="Đóng trò chuyện">×</button>
        </header>
        <div className="chat-messages" aria-live="polite">
          {messages.map((message, index) => <p className={`chat-message ${message.role}`} key={`${index}-${message.role}`}>{message.content}</p>)}
          {messages.length === 1 && <div className="chat-suggestions">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)}>{suggestion}</button>)}</div>}
          {contactQuestion && <form className="chat-contact-form" onSubmit={submitConsultation}>
            <label htmlFor="chat-contact-phone">Để lại số điện thoại để nhân viên tư vấn</label>
            <div><input id="chat-contact-phone" type="tel" inputMode="tel" autoComplete="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} required maxLength={24} placeholder="Số điện thoại của bạn" /><button type="submit" disabled={contactPending}>{contactPending ? 'Đang gửi...' : 'Gửi'}</button></div>
            {contactMessage && <p role="status">{contactMessage}</p>}
          </form>}
          {pending && <p className="chat-message assistant chat-typing">Đang tìm thông tin...</p>}
          <div ref={bottomRef} />
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={600} placeholder="Hỏi về hoa quả..." aria-label="Tin nhắn cho trợ lý" />
          <button type="submit" disabled={pending || !input.trim()} aria-label="Gửi tin nhắn">↑</button>
        </form>
        <p className="chat-disclaimer">Giá và tồn kho được tra từ cửa hàng. <a href="tel:0987890123">Gọi hotline</a></p>
      </section>}
      <button className={`chat-launcher ${open ? 'is-open' : ''}`} type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Đóng trợ lý Fruitica' : 'Mở trợ lý Fruitica'}>
        {open ? '×' : <><span className="chat-launch-icon">✳</span><span>Hỏi Fruitica</span></>}
      </button>
    </div>
  )
}