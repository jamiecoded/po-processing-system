import React, { useState, useEffect, useRef } from 'react'

function useCountUp(target, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(null)
  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return
    let start = null
    const from = 0
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * ease)
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])
  return display
}

const GRADIENTS = {
  purple:  'linear-gradient(135deg,#8B5CF6,#4F46E5)',
  blue:    'linear-gradient(135deg,#8B5CF6,#06B6D4)',
  green:   'linear-gradient(135deg,#10B981,#06B6D4)',
  amber:   'linear-gradient(135deg,#F59E0B,#EF4444)',
}

export default function MetricCard({
  label, value, subtext,
  gradient = 'purple',
  numericValue,
  formatter,
  delay = 0,
}) {
  const [hovered, setHovered] = useState(false)
  const counted = useCountUp(typeof numericValue === 'number' ? numericValue : NaN)

  const displayValue = typeof numericValue === 'number' && formatter
    ? formatter(counted)
    : value ?? '—'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0A0A0A',
        border: `1px solid ${hovered ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.12)'}`,
        borderRadius: '14px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 0 0 1px rgba(139,92,246,0.15), 0 16px 40px rgba(0,0,0,0.5)'
          : '0 0 0 1px rgba(139,92,246,0.06), 0 8px 24px rgba(0,0,0,0.3)',
        transition: 'all 250ms ease',
        animation: `stagger-in 500ms ${delay}ms cubic-bezier(0.16,1,0.3,1) both`,
        cursor: 'default',
      }}
    >
      {/* Colored top accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: GRADIENTS[gradient] || GRADIENTS.purple,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Subtle gradient glow behind content */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '60px',
        background: 'linear-gradient(180deg, rgba(139,92,246,0.06), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#5A5878',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '12px',
        position: 'relative',
      }}>
        {label}
      </div>

      <div
        key={String(displayValue)}
        style={{
          fontSize: '32px',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          color: '#F1F0FF',
          lineHeight: 1.1,
          marginBottom: '8px',
          wordBreak: 'break-all',
          position: 'relative',
          animation: 'fade-slide-up 400ms ease-out both',
        }}
      >
        {displayValue}
      </div>

      {subtext && (
        <div style={{ fontSize: '12px', color: '#5A5878', position: 'relative' }}>
          {subtext}
        </div>
      )}
    </div>
  )
}
