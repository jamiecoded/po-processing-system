import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
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
      <div style={{ color: '#F1F0FF', fontWeight: '600', marginBottom: '8px' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: '600' }}>${Number(p.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  )
}

export default function SupplierChart({ data }) {
  const safeData = Array.isArray(data) ? data.slice(0, 12) : []

  if (safeData.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#5A5878', fontSize: '13px', padding: '48px 0' }}>
        No supplier data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={safeData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1}/>
            <stop offset="100%" stopColor="#5B21B6" stopOpacity={1}/>
          </linearGradient>
          <linearGradient id="colorGbp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
            <stop offset="100%" stopColor="#047857" stopOpacity={1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="supplier"
          tick={{ fill: '#9B99B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
          dy={10}
        />
        <YAxis
          tick={{ fill: '#9B99B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: '13px', color: '#9B99B8', paddingTop: '10px' }} />
        <Bar dataKey="total_value_usd" name="USD" fill="url(#colorUsd)" radius={[6, 6, 0, 0]} maxBarSize={50} />
        <Bar dataKey="total_value_gbp" name="GBP" fill="url(#colorGbp)" radius={[6, 6, 0, 0]} maxBarSize={50} />
      </BarChart>
    </ResponsiveContainer>
  )
}
