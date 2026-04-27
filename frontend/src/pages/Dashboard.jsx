import React, { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'
import MetricCard from '../components/MetricCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import SupplierChart from '../components/SupplierChart.jsx'
import BrandChart from '../components/BrandChart.jsx'
import DeliveryChart from '../components/DeliveryChart.jsx'

const REFRESH_MS = 15000

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.04em',
      background: active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      color: active ? '#10B981' : '#EF4444',
      border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      {status}
    </span>
  )
}

function TH({ children }) {
  return (
    <th style={{
      padding: '11px 16px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: '600',
      color: '#5A5878',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      borderBottom: '1px solid #1A1A1A',
      background: '#0A0A0A',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )
}

function TR({ children, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? 'rgba(139,92,246,0.04)' : 'transparent',
        transition: 'background 150ms ease',
      }}
    >
      {children}
    </tr>
  )
}

function TD({ children, muted }) {
  return (
    <td style={{
      padding: '13px 16px',
      fontSize: '13px',
      color: muted ? '#5A5878' : '#F1F0FF',
      borderBottom: '1px solid rgba(26,26,26,1)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  )
}

const chartCard = {
  background: '#0A0A0A',
  border: '1px solid rgba(139,92,246,0.12)',
  borderRadius: '12px',
  padding: '24px',
}

const chartTitle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#5A5878',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '20px',
}

function ExportBtn({ label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={primary ? "btn-primary" : "btn-ghost"}
      style={{
        padding: '8px 16px',
        borderRadius: '7px',
        fontSize: '12px',
        fontWeight: '600',
      }}
    >
      {label}
    </button>
  )
}

export default function Dashboard() {
  const [insights, setInsights] = useState(null)
  const [orders, setOrders] = useState([])
  const [currency, setCurrency] = useState({ rate: 0.79 })
  const [loading, setLoading] = useState(true)
  const filtersRef = useRef({})

  const fetchAll = useCallback(async (filters = filtersRef.current, isBackground = false) => {
    filtersRef.current = filters
    if (!isBackground) setLoading(true)
    try {
      const [insRes, curRes] = await Promise.all([
        api.get('/insights'),
        api.get('/currency'),
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
      const res = await api.get(`/export?format=${format}`, { responseType: 'blob' })
      const filename = format === 'csv' ? 'purchase_orders.csv' : 'purchase_orders.xlsx'
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.setAttribute('download', filename)
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) { console.error('Export failed:', err) }
  }

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this purchase order? This cannot be undone.')) return
    try {
      await api.delete(`/orders/${orderId}`)
      fetchAll()
    } catch (err) { console.error('Delete failed:', err) }
  }

  const fmtUSD = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtGBP = (n) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="page-wrapper dashboard" style={{ minHeight: '100vh', background: '#000000' }}>
      <Navbar />

      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', height: '400px', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(139,92,246,0.1), transparent)',
      }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '36px 24px', position: 'relative', zIndex: 1 }}>

        <div className="dashboard-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '12px',
          animation: 'fade-slide-up 350ms ease-out both',
        }}>
          <div className="dashboard-header-text">
            <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', color: '#F1F0FF', marginBottom: '6px' }}>
              Purchase Order Dashboard
            </h1>
            <p style={{ color: '#9B99B8', fontSize: '14px' }}>
              Manage and analyse all your purchase orders in one place
            </p>
          </div>

          <div className="dashboard-header-pills" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#0A0A0A',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '9999px',
              fontSize: '13px',
              color: '#A78BFA',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#8B5CF6',
                animation: 'pulse-dot 2s ease-in-out infinite',
                display: 'inline-block',
              }} />
              Auto-Refreshing
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#0A0A0A',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '9999px',
              fontSize: '13px',
              color: '#10B981',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#10B981',
                animation: 'pulse-dot 2s ease-in-out infinite',
                display: 'inline-block',
              }} />
              1 USD = {(currency?.rate || 0.79).toFixed(4)} GBP · Live
            </div>
          </div>
        </div>

        <div className="kpi-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          <MetricCard
            label="Total Orders"
            value={insights?.total_orders ?? '—'}
            numericValue={insights?.total_orders}
            formatter={(n) => String(Math.round(n))}
            subtext="Active purchase orders"
            gradient="purple"
            delay={0}
          />
          <MetricCard
            label="Total Value USD"
            value={insights ? fmtUSD(insights.total_value_usd) : '—'}
            numericValue={insights?.total_value_usd}
            formatter={(n) => fmtUSD(n)}
            subtext="Combined order value"
            gradient="blue"
            delay={80}
          />
          <MetricCard
            label="Total Value GBP"
            value={insights ? fmtGBP(insights.total_value_gbp) : '—'}
            numericValue={insights?.total_value_gbp}
            formatter={(n) => fmtGBP(n)}
            subtext="At live exchange rate"
            gradient="green"
            delay={160}
          />
          <MetricCard
            label="Avg Delivery Time"
            value={insights?.average_delivery_time_days !== undefined ? `${insights.average_delivery_time_days} days` : '—'}
            numericValue={insights?.average_delivery_time_days}
            formatter={(n) => `${n}d`}
            subtext="From order to delivery"
            gradient="purple"
            delay={200}
          />
          <MetricCard
            label="Active Suppliers"
            value={insights?.by_supplier?.length ?? '—'}
            numericValue={insights?.by_supplier?.length}
            formatter={(n) => String(Math.round(n))}
            subtext="Unique vendors in system"
            gradient="amber"
            delay={240}
          />
        </div>

        <FilterBar onFilter={fetchAll} />

        <div className="charts-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}>
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
          <div style={chartTitle}>Delivery Timeline — Days to Delivery</div>
          <DeliveryChart data={insights?.delivery_timeline || []} />
        </div>

        <div style={{
          background: '#0A0A0A',
          border: '1px solid rgba(139,92,246,0.12)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid #1A1A1A',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F1F0FF' }}>
              All Purchase Orders {orders.length > 0 && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  color: '#A78BFA',
                }}>
                  {orders.length}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ExportBtn label="Export CSV" onClick={() => handleExport('csv')} primary={false} />
              <ExportBtn label="Export Excel" onClick={() => handleExport('excel')} primary={true} />
            </div>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '56px', textAlign: 'center', color: '#5A5878', fontSize: '14px' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(139,92,246,0.2)',
                    borderTopColor: '#8B5CF6',
                    borderRadius: '50%',
                    animation: 'spin 600ms linear infinite',
                    display: 'inline-block',
                  }} />
                  Loading orders…
                </div>
              ) : 'No orders found. Upload a PDF to get started.'}
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <TH>PO #</TH>
                    <TH>Order Date</TH>
                    <TH>Delivery Date</TH>
                    <TH>Supplier</TH>
                    <TH>Buyer</TH>
                    <TH>Value USD</TH>
                    <TH>Value GBP</TH>
                    <TH>Status</TH>
                    <TH>Action</TH>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <TR key={order.id}>
                      <TD>{order.po_number}</TD>
                      <TD>{order.order_date ? order.order_date.split('T')[0] : '—'}</TD>
                      <TD>{order.delivery_date ? order.delivery_date.split('T')[0] : '—'}</TD>
                      <TD>{order.supplier}</TD>
                      <TD muted>{order.buyer}</TD>
                      <TD>{fmtUSD(order.total_value_usd)}</TD>
                      <TD>{fmtGBP(order.total_value_gbp)}</TD>
                      <TD><StatusBadge status={order.status} /></TD>
                      <TD>
                        <DeleteBtn onClick={() => handleDelete(order.id)} />
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '4px 12px',
        background: hovered ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${hovered ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: '6px',
        color: hovered ? '#EF4444' : '#F87171',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 180ms ease',
      }}
    >
      Delete
    </button>
  )
}
