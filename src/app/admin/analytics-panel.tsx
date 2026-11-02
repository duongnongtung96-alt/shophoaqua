'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shophoaqua.duongnongtung96.workers.dev'
const countryNames: Record<string, string> = {
  AU: 'Úc',
  CA: 'Canada',
  CN: 'Trung Quốc',
  DE: 'Đức',
  FR: 'Pháp',
  GB: 'Vương quốc Anh',
  JP: 'Nhật Bản',
  KR: 'Hàn Quốc',
  SG: 'Singapore',
  TH: 'Thái Lan',
  US: 'Hoa Kỳ',
  VN: 'Việt Nam',
  ZZ: 'Không rõ',
}

interface AnalyticsRow {
  label: string
  views: number
}

interface AnalyticsData {
  source: string
  days: number
  generated_at: number
  overview: {
    total_views: number
    unique_visitors: number
    total_countries: number
    total_pages: number
  }
  timeline: AnalyticsRow[]
  countries: Array<{ country: string; views: number }>
  devices: Array<{ device: string; views: number }>
  pages: Array<{ path: string; views: number }>
  recent: Array<{ created_at: number; path: string; country: string | null; device: string | null }>
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN')
}

function countryName(code: string) {
  return countryNames[code.toUpperCase()] ?? code
}

export default function AnalyticsPanel({ token }: { token: string }) {
  const [days, setDays] = useState(1)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const loadStats = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal,
      })
      const result = await response.json() as { success: boolean; data?: AnalyticsData; error?: string }
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Không thể tải dữ liệu thống kê.')
      }
      setData(result.data)
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu thống kê.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [days, token])

  useEffect(() => {
    const controller = new AbortController()
    void loadStats(controller.signal)
    return () => controller.abort()
  }, [loadStats, refreshVersion])

  const timeline = useMemo(() => {
    if (!data) return { labels: [] as string[], values: [] as number[] }
    return {
      labels: data.timeline.map(({ label }) => days === 1 ? label.slice(11, 16) : label.slice(5)),
      values: data.timeline.map(({ views }) => views),
    }
  }, [data, days])

  const lineData = useMemo(() => ({
    labels: timeline.labels,
    datasets: [{
      label: 'Lượt xem',
      data: timeline.values,
      borderColor: '#16885a',
      backgroundColor: 'rgba(22, 136, 90, 0.12)',
      fill: true,
      tension: 0.28,
      pointRadius: 2,
    }],
  }), [timeline])

  function barData(labels: string[], values: number[], color = '#25845c') {
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: color,
        borderRadius: 4,
        maxBarThickness: 42,
      }],
    }
  }

  const countryData = useMemo(() => data
    ? barData(data.countries.map(({ country }) => countryName(country)), data.countries.map(({ views }) => views))
    : barData([], []), [data])
  const deviceData = useMemo(() => data
    ? barData(data.devices.map(({ device }) => device), data.devices.map(({ views }) => views), '#709476')
    : barData([], []), [data])
  const pageData = useMemo(() => data
    ? barData(data.pages.map(({ path }) => path), data.pages.map(({ views }) => views), '#82a77e')
    : barData([], []), [data])
  const barOptions = useMemo(() => ({
    ...chartOptions,
    indexAxis: 'y' as const,
  }), [])

  return (
    <section className="analytics-panel" aria-label="Thống kê truy cập">
      <div className="analytics-toolbar">
        <div>
          <span className="kicker">Dữ liệu truy cập · Nhóm 06</span>
          <p>Nguồn D1 · Múi giờ Asia/Ho_Chi_Minh</p>
        </div>
        <div className="analytics-controls">
          <label>
            Khoảng thời gian
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={1}>24 giờ qua</option>
              <option value={7}>7 ngày qua</option>
              <option value={30}>30 ngày qua</option>
            </select>
          </label>
          <button className="refresh-button" type="button" onClick={() => setRefreshVersion((version) => version + 1)} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới số liệu'}
          </button>
        </div>
      </div>

      {error && <p className="analytics-error" role="alert">{error}</p>}

      <div className="analytics-metrics">
        <article><span>Lượt xem</span><strong>{formatNumber(data?.overview.total_views ?? 0)}</strong></article>
        <article><span>Khách truy cập duy nhất</span><strong>{formatNumber(data?.overview.unique_visitors ?? 0)}</strong></article>
        <article><span>Số quốc gia</span><strong>{formatNumber(data?.overview.total_countries ?? 0)}</strong></article>
        <article><span>Số trang được xem</span><strong>{formatNumber(data?.overview.total_pages ?? 0)}</strong></article>
      </div>

      <section className="analytics-chart-card analytics-trend">
        <h2>{days === 1 ? 'Lượt truy cập theo giờ' : 'Lượt truy cập theo ngày'}</h2>
        {loading && !data ? <p className="analytics-empty">Đang tải dữ liệu...</p> : data?.overview.total_views ? (
          <div className="analytics-line-chart"><Line data={lineData} options={chartOptions} /></div>
        ) : <p className="analytics-empty">Chưa có sự kiện truy cập trong khoảng thời gian này.</p>}
      </section>

      <div className="analytics-chart-grid">
        <section className="analytics-chart-card">
          <h2>Lượt truy cập theo quốc gia</h2>
          {data?.countries.length ? <div className="analytics-bar-chart"><Bar data={countryData} options={barOptions} /></div> : <p className="analytics-empty">Chưa có dữ liệu.</p>}
        </section>
        <section className="analytics-chart-card">
          <h2>Lượt truy cập theo thiết bị</h2>
          {data?.devices.length ? <div className="analytics-bar-chart"><Bar data={deviceData} options={barOptions} /></div> : <p className="analytics-empty">Chưa có dữ liệu.</p>}
        </section>
      </div>

      <div className="analytics-chart-grid">
        <section className="analytics-chart-card">
          <h2>Trang được truy cập nhiều</h2>
          {data?.pages.length ? <div className="analytics-bar-chart"><Bar data={pageData} options={barOptions} /></div> : <p className="analytics-empty">Chưa có dữ liệu.</p>}
        </section>
        <section className="analytics-chart-card analytics-history">
          <h2>Lịch sử truy cập gần đây</h2>
          <div className="analytics-table-wrap">
            <table>
              <thead><tr><th>Thời gian</th><th>Trang truy cập</th><th>Quốc gia</th><th>Thiết bị</th></tr></thead>
              <tbody>
                {data?.recent.map((event, index) => (
                  <tr key={`${event.created_at}-${event.path}-${index}`}>
                    <td>{new Date(event.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
                    <td>{event.path || '/'}</td>
                    <td>{countryName(event.country || 'ZZ')}</td>
                    <td>{event.device || 'Không rõ'}</td>
                  </tr>
                ))}
                {!data?.recent.length && <tr><td colSpan={4}>Chưa có dữ liệu truy cập.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {data && <p className="analytics-updated">Cập nhật lúc {new Date(data.generated_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Tối đa 100 lượt truy cập gần nhất</p>}
    </section>
  )
}
