import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import logoImage from '../assets/Purchase Order System 2.png'

const LogoIcon = () => (
  <img src={logoImage} alt="PO System Logo" width="200" style={{ objectFit: 'contain' }} />
)

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="#5A5878" strokeWidth="1.3" />
    <circle cx="8" cy="8" r="2.5" stroke="#5A5878" strokeWidth="1.3" />
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2l12 12M6.5 6.7A2.5 2.5 0 0010.3 10.5M4.3 4.5C2.6 5.7 1.3 7.5 1.3 8s2.4 5 6.7 5c1.4 0 2.6-.4 3.6-1M6.3 3.2C6.8 3.1 7.4 3 8 3c4.2 0 6.7 5 6.7 5-.4.8-1 1.7-1.7 2.4" stroke="#5A5878" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

function FocusInput({ type, value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '12px 14px',
        background: '#111111',
        border: `1px solid ${focused ? 'rgba(139,92,246,0.6)' : '#1A1A1A'}`,
        borderRadius: '8px',
        color: '#F1F0FF',
        fontSize: '14px',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.12)' : 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
      }}
    />
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
  const [shimmer, setShimmer] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const { data } = await api.post(endpoint, { email, password })
      localStorage.setItem('po_token', data.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBtnEnter = () => {
    setBtnHovered(true)
    setShimmer(true)
    setTimeout(() => setShimmer(false), 700)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial spotlight */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        height: '60%',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.15), transparent)',
        pointerEvents: 'none',
      }} />

      <div className="login-card" style={{
        background: '#0A0A0A',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '20px',
        padding: '44px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 32px 64px rgba(0,0,0,0.5)',
        animation: 'fade-slide-up 400ms ease-out both',
        position: 'relative',
      }}>
        {/* Card top glow */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)',
          borderRadius: '20px 20px 0 0',
        }} />

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <LogoIcon />
          </div>
          <div style={{
            fontSize: '26px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}>
          </div>
          <div style={{ color: '#9B99B8', fontSize: '14px' }}>
            {isRegister ? 'Create your account to get started' : 'Sign in to access your dashboard'}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px',
            padding: '11px 14px',
            color: '#EF4444',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#EF4444" strokeWidth="1.3" />
              <path d="M7 4v4M7 9.5v.5" stroke="#EF4444" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              color: '#9B99B8',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}>
              Email Address
            </label>
            <FocusInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              color: '#9B99B8',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <FocusInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {/* Shimmer sweep */}
            {shimmer && !loading && (
              <span style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                animation: 'shimmer 600ms ease-in-out forwards',
                pointerEvents: 'none',
              }} />
            )}
            {loading ? (
              <>
                <span style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 600ms linear infinite',
                }} />
                Please wait…
              </>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', color: '#9B99B8', fontSize: '13px', marginTop: '24px' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span
            onClick={() => { setIsRegister((v) => !v); setError('') }}
            style={{
              color: '#8B5CF6',
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
              transition: 'text-decoration-color 200ms ease',
            }}
            onMouseEnter={(e) => { e.target.style.textDecorationColor = '#8B5CF6' }}
            onMouseLeave={(e) => { e.target.style.textDecorationColor = 'transparent' }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </span>
        </div>
      </div>
    </div>
  )
}
