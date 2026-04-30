import React, { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'
import MetricCard from '../components/MetricCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import SupplierChart from '../components/SupplierChart.jsx'
import BrandChart from '../components/BrandChart.jsx'
import DeliveryChart from '../components/DeliveryChart.jsx'
import Chatbot from '../components/Chatbot.jsx'

const REFRESH_MS = 30000
const PAGE_SIZE = 25

function Pagination({ current, total, onChange }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null

  const getPages = () => {
    const items = []
    const delta = 2
    const left = Math.max(1, current - delta)
    const right = Math.min(pages, current + delta)
    if (left > 1) { items.push(1); if (left > 2) items.push('...') }
    for (let i = left; i <= right; i++) items.push(i)
    if (right < pages) { if (right < pages - 1) items.push('...'); items.push(pages) }
    return items
  }

  const btnBase = { padding: '6px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: '1px solid #1A1A1A', transition: 'all 150ms ease', minWidth: '36px', textAlign: 'center' }
  const activeStyle = { ...btnBase, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff', border: 'none' }
  const inactiveStyle = { ...btnBase, background: 'transparent', color: '#9B99B8' }
  const navStyle = { ...btnBase, background: 'transparent', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }
  const disabledStyle = { ...navStyle, opacity: 0.35, cursor: 'not-allowed' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '10px' }}>
      <div style={{ color: '#5A5878', fontSize: '13px' }}>
        Showing {Math.min((current - 1) * PAGE_SIZE + 1, total)}–{Math.min(current * PAGE_SIZE, total)} of <span style={{ color: '#A78BFA', fontWeight: '600' }}>{total}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button style={current === 1 ? disabledStyle : navStyle} disabled={current === 1} onClick={() => onChange(current - 1)}>←</button>
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} style={{ color: '#5A5878', padding: '6px 4px', fontSize: '13px' }}>…</span>
            : <button key={p} onClick={() => onChange(p)} style={p === current ? activeStyle : inactiveStyle}
                onMouseEnter={e => { if (p !== current) e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
                onMouseLeave={e => { if (p !== current) e.currentTarget.style.background = 'transparent' }}>{p}</button>
        )}
        <button style={current === pages ? disabledStyle : navStyle} disabled={current === pages} onClick={() => onChange(current + 1)}>→</button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em', background: active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: active ? '#10B981' : '#EF4444', border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
      {status}
    </span>
  )
}

function CurrencyBadge({ currency }) {
  const isGBP = currency === 'GBP'
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: '700', background: isGBP ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: isGBP ? '#10B981' : '#3B82F6', border: `1px solid ${isGBP ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
      {currency || 'USD'}
    </span>
  )
}

function TH({ children }) {
  return <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#5A5878', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #1A1A1A', background: '#0A0A0A', whiteSpace: 'nowrap' }}>{children}</th>
}

function TR({ children }) {
  const [hovered, setHovered] = useState(false)
  return <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: hovered ? 'rgba(139,92,246,0.04)' : 'transparent', transition: 'background 150ms ease' }}>{children}</tr>
}

function TD({ children, muted }) {
  return <td style={{ padding: '11px 14px', fontSize: '13px', color: muted ? '#5A5878' : '#F1F0FF', borderBottom: '1px solid rgba(26,26,26,1)', whiteSpace: 'nowrap' }}>{children}</td>
}

const chartCard = { background: '#0A0A0A', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '12px', padding: '24px' }
const chartTitle = { fontSize: '11px', fontWeight: '600', color: '#5A5878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }

function DeleteBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ padding: '4px 12px', background: hovered ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)', border: `1px solid ${hovered ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '6px', color: hovered ? '#EF4444' : '#F87171', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 180ms ease' }}>
      Delete
    </button>
  )
}

function ExportBtn({ label, onClick, primary }) {
  return (
    <button onClick={onClick} className={primary ? 'btn-primary' : 'btn-ghost'}
      style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: '600' }}>
      {label}
    </button>
  )
}

export default function Dashboard() {
  const [insights, setInsights] = useState(null)
  const [orders, setOrders] = useState([])
  const [currency, setCurrency] = useState({ usd_to_gbp: 0.79, rate: 0.79 })
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const filtersRef = useRef({})

  const fetchAll = useCallback(async (filters = filtersRef.current, isBackground = false) => {
    filtersRef.current = filters
    if (!isBackground) { setLoading(true); setCurrentPage(1) }
    try {
      const [insRes, curRes] = await Promise.all([
        api.get('/insights'),
        api.get('/api/currency'),
      ])
      setInsights(insRes.data)
      setCurrency(curRes.data)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const ordRes = await api.get(`/orders?${params.toString()}`)
      setOrders(ordRes.data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll({}, false) }, [fetchAll])
  useEffect(() => {
    const id = setInterval(() => fetchAll(filtersRef.current, true), REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchAll])

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams()
      Object.entries(filtersRef.current).forEach(([k, v]) => { if (v) params.append(k, v) })
      params.append('format', format)
      const res = await api.get(`/export?${params.toString()}`, { responseType: 'blob' })
      const filename = format === 'csv' ? 'purchase_orders.csv' : 'purchase_orders.xlsx'
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.setAttribute('download', filename)
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) { console.error('Export failed:', err) }
  }

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this purchase order?')) return
    try { await api.delete(`/orders/${orderId}`); fetchAll() }
    catch (err) { console.error('Delete failed:', err) }
  }

  const fmtUSD = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtGBP = (n) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const liveRate = currency?.usd_to_gbp || currency?.rate || 0.79
  const isFallback = liveRate === 0.79 && !currency?.fetched_at
  const isStale = currency?.stale === true || isFallback
  const rateLabel = isFallback
    ? 'Fallback rate'
    : isStale
      ? 'Stale'
      : 'Live'
  const rateColor = isStale ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'
  const rateDotColor = isStale ? '#F59E0B' : '#10B981'
  const rateTextColor = isStale ? '#F59E0B' : '#10B981'

  return (
    <div className="page-wrapper dashboard" style={{ minHeight: '100vh', background: '#000000' }}>
      <Navbar />
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '400px', pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(139,92,246,0.1), transparent)' }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '36px 24px', position: 'relative', zIndex: 1 }}>

        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '12px', animation: 'fade-slide-up 350ms ease-out both' }}>
          <div className="dashboard-header-text">
            <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', color: '#F1F0FF', marginBottom: '6px' }}>Purchase Order Dashboard</h1>
            <p style={{ color: '#9B99B8', fontSize: '14px' }}>Manage and analyse all your purchase orders in one place</p>
          </div>

          <div className="dashboard-header-pills" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0A0A0A', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '9999px', fontSize: '13px', color: '#A78BFA', fontWeight: '500', whiteSpace: 'nowrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6', animation: 'pulse-dot 2s ease-in-out infinite', display: 'inline-block' }} />
              Auto-Refreshing
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0A0A0A', border: `1px solid ${rateColor}`, borderRadius: '9999px', fontSize: '13px', color: rateTextColor, fontWeight: '500', whiteSpace: 'nowrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: rateDotColor, animation: 'pulse-dot 2s ease-in-out infinite', display: 'inline-block' }} />
              1 USD = {liveRate.toFixed(4)} GBP · {rateLabel}
            </div>
          </div>
        </div>

        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <MetricCard label="Total Orders" value={insights?.total_orders ?? '—'} numericValue={insights?.total_orders} formatter={(n) => String(Math.round(n))} subtext="Active purchase orders" gradient="purple" delay={0} />
          <MetricCard label="Total Value USD" value={insights ? fmtUSD(insights.total_value_usd) : '—'} numericValue={insights?.total_value_usd} formatter={fmtUSD} subtext="Combined order value" gradient="blue" delay={80} />
          <MetricCard label="Total Value GBP" value={insights ? fmtGBP(insights.total_value_gbp) : '—'} numericValue={insights?.total_value_gbp} formatter={fmtGBP} subtext="At live exchange rate" gradient="green" delay={160} />
          <MetricCard label="Active Suppliers" value={insights?.active_suppliers ?? insights?.by_supplier?.length ?? '—'} numericValue={insights?.active_suppliers ?? insights?.by_supplier?.length} formatter={(n) => String(Math.round(n))} subtext="Unique vendors" gradient="amber" delay={240} />
          <MetricCard label="Total Quantity" value={insights?.total_quantity ? insights.total_quantity.toLocaleString() : '—'} numericValue={insights?.total_quantity} formatter={(n) => n.toLocaleString()} subtext="Units on order" gradient="purple" delay={280} />
        </div>

        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div style={chartCard}>
            <div style={chartTitle}>Value by Supplier</div>
            <SupplierChart data={insights?.by_supplier || []} />
          </div>
          <div style={chartCard}>
            <div style={chartTitle}>Orders by Brand</div>
            <BrandChart data={insights?.by_brand || []} />
          </div>
        </div>

        <div style={{ ...chartCard, marginBottom: '20px' }}>
          <div style={chartTitle}>Delivery Timeline</div>
          <DeliveryChart data={insights?.delivery_timeline || []} />
        </div>

        <FilterBar onFilter={fetchAll} />

        <div style={{ background: '#0A0A0A', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #1A1A1A', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F1F0FF' }}>
              All Purchase Orders
              {orders.length > 0 && <span style={{ marginLeft: '8px', padding: '2px 8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '9999px', fontSize: '12px', color: '#A78BFA' }}>{orders.length}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ExportBtn label="Export CSV" onClick={() => handleExport('csv')} primary={false} />
              <ExportBtn label="Export Excel" onClick={() => handleExport('excel')} primary={true} />
            </div>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '56px', textAlign: 'center', color: '#5A5878', fontSize: '14px' }}>
              {loading
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><span style={{ width: '16px', height: '16px', border: '2px solid rgba(139,92,246,0.2)', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 600ms linear infinite', display: 'inline-block' }} />Loading orders...</div>
                : 'No orders found. Upload a PDF or import Excel to get started.'}
            </div>
          ) : (
            <>
              <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <TH>PO #</TH>
                      <TH>Supplier</TH>
                      <TH>Brand</TH>
                      <TH>Buyer</TH>
                      <TH>Department</TH>
                      <TH>Category</TH>
                      <TH>Currency</TH>
                      <TH>Qty</TH>
                      <TH>Value USD</TH>
                      <TH>Value GBP</TH>
                      <TH>Confirmed Ex-Factory</TH>
                      <TH>Delivery Date</TH>
                      <TH>Mode</TH>
                      <TH>Status</TH>
                      <TH>Action</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((order) => (
                      <TR key={order.id}>
                        <TD><span style={{ color: '#A78BFA', fontWeight: '600' }}>{order.po_number}</span></TD>
                        <TD>{order.supplier}</TD>
                        <TD muted>{order.brand}</TD>
                        <TD muted>{order.buyer}</TD>
                        <TD muted>{order.department || '—'}</TD>
                        <TD muted>{order.category}</TD>
                        <TD><CurrencyBadge currency={order.po_currency || order.currency} /></TD>
                        <TD muted>{order.total_order_qty ? order.total_order_qty.toLocaleString() : '—'}</TD>
                        <TD>{fmtUSD(order.total_value_usd)}</TD>
                        <TD>{fmtGBP(order.total_value_gbp)}</TD>
                        <TD muted>{order.confirmed_ex_factory ? order.confirmed_ex_factory.split('T')[0] : order.delivery_date ? order.delivery_date.split('T')[0] : '—'}</TD>
                        <TD muted>{order.delivery_date ? order.delivery_date.split('T')[0] : '—'}</TD>
                        <TD muted>{order.mode || '—'}</TD>
                        <TD><StatusBadge status={order.status} /></TD>
                        <TD><DeleteBtn onClick={() => handleDelete(order.id)} /></TD>
                      </TR>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination current={currentPage} total={orders.length} onChange={setCurrentPage} />
            </>
          )}
        </div>
      </div>

      <Chatbot />
    </div>
  )
}
