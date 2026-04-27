import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(10,10,10,0.85)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      pointerEvents: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: '#F1F0FF', fontWeight: '600', marginBottom: '8px' }}>PO: {label}</div>
      <div style={{ color: '#9B99B8', marginBottom: '8px' }}>{d.supplier}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
        <span style={{ color: '#F59E0B' }}>Order Date:</span>
        <span style={{ color: '#F1F0FF' }}>{d.order_date ? d.order_date.split('T')[0] : '—'}</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: '#10B981' }}>Delivery Date:</span>
        <span style={{ color: '#F1F0FF' }}>{d.delivery_date ? d.delivery_date.split('T')[0] : '—'}</span>
      </div>
      <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '6px', color: '#8B5CF6', fontWeight: '600' }}>
        Gap: {d.time_gap_days} Days
      </div>
    </div>
  )
}

export default function DeliveryChart({ data }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return []
    return data
      .filter((d) => d?.time_gap_days !== undefined && d?.time_gap_days !== null)
      .map((d) => ({
        name: d.po_number || '',
        time_gap_days: d.time_gap_days,
        supplier: d.supplier,
        order_date: d.order_date,
        delivery_date: d.delivery_date,
      }))
      .slice(0, 30)
  }, [data])

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#5A5878', fontSize: '13px', padding: '48px 0' }}>
        No clear order/delivery dates to form timeline
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorGap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1}/>
            <stop offset="100%" stopColor="#5B21B6" stopOpacity={1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#9B99B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
          dy={10}
        />
        <YAxis
          tick={{ fill: '#9B99B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}d`}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="time_gap_days" name="Days" fill="url(#colorGap)" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
