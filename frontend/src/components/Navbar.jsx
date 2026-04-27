import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import inlineLogo from '../assets/Purchase Order System inline 2.png'

export default function Navbar() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [uploadHover, setUploadHover] = useState(false)
  const [logoutHover, setLogoutHover] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('po_token')
    navigate('/login')
  }

  return (
    <>
      <nav className="navbar" style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'box-shadow 300ms ease',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
      }}>
        <Link to="/dashboard" className="navbar-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src={inlineLogo} alt="PO System Logo" style={{ height: '32px', objectFit: 'contain' }} />
        </Link>

        <div className="navbar-actions">
          <Link
            to="/upload"
            className="btn-primary btn-upload-po"
            style={{
              padding: '0 16px',
              height: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 4l3-3 3 3M1 10h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Upload PO
          </Link>

          <button
            onClick={handleLogout}
            className="btn-ghost btn-logout"
            style={{
              padding: '0 14px',
              height: '38px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}
