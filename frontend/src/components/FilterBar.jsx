import React, { useState } from 'react'

const inputStyle = {
  padding: '9px 13px',
  background: '#111111',
  border: '1px solid #1A1A1A',
  borderRadius: '8px',
  color: '#F1F0FF',
  fontSize: '13px',
  outline: 'none',
  minWidth: '148px',
  transition: 'border-color 200ms ease, box-shadow 200ms ease',
  colorScheme: 'dark',
}

const labelStyle = {
  fontSize: '11px',
  color: '#5A5878',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '6px',
  display: 'block',
}

function FocusInput({ type, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        borderColor: focused ? 'rgba(139,92,246,0.6)' : '#1A1A1A',
        boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.12)' : 'none',
      }}
    />
  )
}

export default function FilterBar({ onFilter }) {
  const [supplier, setSupplier] = useState('')
  const [buyer, setBuyer] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [applyHover, setApplyHover] = useState(false)
  const [clearHover, setClearHover] = useState(false)

  const handleApply = () => {
    const filters = {}
    if (supplier) filters.supplier = supplier
    if (buyer) filters.buyer = buyer
    if (category) filters.category = category
    if (brand) filters.brand = brand
    if (fromDate) filters.from_date = fromDate
    if (toDate) filters.to_date = toDate
    onFilter(filters)
  }

  const handleClear = () => {
    setSupplier(''); setBuyer(''); setCategory(''); setBrand('')
    setFromDate(''); setToDate('')
    onFilter({})
  }

  const fields = [
    { label: 'Supplier',   value: supplier,  set: setSupplier,  type: 'text' },
    { label: 'Buyer',      value: buyer,     set: setBuyer,     type: 'text' },
    { label: 'Brand',      value: brand,     set: setBrand,     type: 'text' },
    { label: 'Category',   value: category,  set: setCategory,  type: 'text' },
    { label: 'From Date',  value: fromDate,  set: setFromDate,  type: 'date' },
    { label: 'To Date',    value: toDate,    set: setToDate,    type: 'date' },
  ]

  return (
    <div className="filter-bar" style={{
      background: '#0A0A0A',
      border: '1px solid rgba(139,92,246,0.12)',
      borderRadius: '12px',
      padding: '18px 20px',
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      alignItems: 'flex-end',
    }}>
      {fields.map(({ label, value, set, type }) => (
        <div key={label} className={type === 'date' ? 'date-fields' : ''}>
          <label style={labelStyle}>{label}</label>
          <FocusInput
            type={type}
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder={type === 'text' ? `Filter by ${label.toLowerCase()}` : ''}
          />
        </div>
      ))}

      <div className="filter-actions" style={{ display: 'flex', gap: '8px', paddingBottom: '0' }}>
        <button
          onClick={handleApply}
          className="btn-primary"
          style={{
            padding: '9px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          Apply
        </button>

        <button
          onClick={handleClear}
          className="btn-ghost"
          style={{
            padding: '9px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
