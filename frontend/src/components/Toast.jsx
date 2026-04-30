import React, { useEffect } from 'react'

export default function Toast({ message, type = 'success', visible, onClose }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [visible, onClose])

  const colors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', icon: '#10B981', text: '#10B981' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', icon: '#EF4444', text: '#EF4444' },
  }
  const c = colors[type] || colors.success

  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={c.icon} strokeWidth="1.5" />
        <path d="M5 8l2.5 2.5L11 5.5" stroke={c.icon} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={c.icon} strokeWidth="1.5" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={c.icon} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '28px',
      right: '28px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: '#0F0F1A',
      border: `1px solid ${c.border}`,
      borderRadius: '12px',
      padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      maxWidth: '360px',
      animation: visible
        ? 'toast-in 320ms cubic-bezier(0.16,1,0.3,1) forwards'
        : 'toast-out 220ms ease-in forwards',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {icons[type]}
      <span style={{ color: '#F1F0FF', fontSize: '13px', fontWeight: '500', lineHeight: 1.4 }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          color: '#5A5878',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px',
        }}
      >
        ×
      </button>
    </div>
  )
}
