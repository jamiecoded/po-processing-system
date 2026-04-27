import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'
import Toast from '../components/Toast.jsx'

const UploadIcon = () => (
  <svg
    width="52" height="52" viewBox="0 0 52 52" fill="none"
    style={{ animation: 'float-icon 2.4s ease-in-out infinite' }}
  >
    <defs>
      <linearGradient id="uploadGrad" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8B5CF6"/>
        <stop offset="100%" stopColor="#4F46E5"/>
      </linearGradient>
    </defs>
    <rect x="8" y="4" width="28" height="36" rx="4" fill="url(#uploadGrad)" opacity="0.15"/>
    <rect x="8" y="4" width="28" height="36" rx="4" stroke="url(#uploadGrad)" strokeWidth="1.5"/>
    <path d="M26 4v8h8" stroke="url(#uploadGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="38" cy="38" r="12" fill="#000000" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
    <path d="M38 33v8M35 36l3-3 3 3" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="1" width="10" height="14" rx="2" stroke="#8B5CF6" strokeWidth="1.3"/>
    <path d="M9 1v4h3" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M5 8h6M5 11h4" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

function BackLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        color: '#A78BFA',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        padding: 0,
        marginTop: '28px',
      }}
    >
      <span style={{ display: 'inline-block' }}>←</span>
      Back to Dashboard
    </button>
  )
}

export default function Upload() {
  const navigate  = useNavigate()
  const [file,       setFile]     = useState(null)
  const [uploading,  setUploading]= useState(false)
  const [progress,   setProgress] = useState(0)
  const [result,     setResult]   = useState(null)
  const [toast,      setToast]    = useState({ visible: false, message: '', type: 'success' })
  const [btnHovered, setBtnHovered] = useState(false)

  const dismissToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), [])

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0])
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post('/orders/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / (e.total || 1)))
        },
      })
      setResult(data)
      setFile(null)
      setToast({ visible: true, message: 'Purchase order processed successfully!', type: 'success' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please check the file and try again.'
      setToast({ visible: true, message: msg, type: 'error' })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const canUpload = !!file && !uploading

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: '#000000' }}>
      <Navbar />

      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', height: '400px', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(139,92,246,0.1), transparent)',
      }} />

      <div className="upload-container" style={{
        maxWidth: '680px', margin: '0 auto', padding: '44px 24px',
        position: 'relative', zIndex: 1,
        animation: 'fade-slide-up 350ms ease-out both',
      }}>
        <h1 className="page-title" style={{
          fontSize: '26px', fontWeight: '700',
          letterSpacing: '-0.02em', color: '#F1F0FF', marginBottom: '8px',
        }}>
          Upload Purchase Order
        </h1>
        <p style={{ color: '#9B99B8', fontSize: '14px', marginBottom: '36px' }}>
          Upload a PDF purchase order to extract and store its data automatically.
        </p>

        <div
          {...getRootProps()}
          className="dropzone"
          style={{
            border: `2px dashed ${isDragActive ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.25)'}`,
            borderRadius: '14px',
            padding: '56px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragActive
              ? 'rgba(139,92,246,0.05)'
              : '#0A0A0A',
            boxShadow: isDragActive
              ? 'inset 0 0 30px rgba(139,92,246,0.12)'
              : 'none',
            transition: 'all 250ms ease',
          }}
        >
          <input {...getInputProps()} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <UploadIcon />
          </div>
          <div style={{ color: '#F1F0FF', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PO PDF here'}
          </div>
          <div style={{ color: '#5A5878', fontSize: '13px' }}>
            or click to browse — PDF files only
          </div>
        </div>

        {file && (
          <div style={{
            marginTop: '16px',
            background: '#0A0A0A',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fade-slide-up 250ms ease-out both',
          }}>
            <FileIcon />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#F1F0FF', fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ color: '#5A5878', fontSize: '12px', marginTop: '2px' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              style={{
                background: 'none', border: 'none',
                color: '#5A5878', cursor: 'pointer',
                fontSize: '18px', padding: '4px',
                lineHeight: 1, transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#EF4444' }}
              onMouseLeave={(e) => { e.target.style.color = '#5A5878' }}
            >
              ×
            </button>
          </div>
        )}

        {uploading && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              width: '100%', height: '4px', background: '#1E1E2E',
              borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ color: '#5A5878', fontSize: '12px', marginTop: '6px', textAlign: 'right' }}>
              {progress}%
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className={canUpload ? "btn-primary" : "btn-disabled"}
          style={{
            width: '100%',
            height: '50px',
            marginTop: '20px',
            borderRadius: '10px',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {uploading ? (
            <>
              <span style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 600ms linear infinite',
              }} />
              Processing…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v9M5 4l3-3 3 3M2 12v2h12v-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload & Process PDF
            </>
          )}
        </button>

        {result && (
          <div style={{
            marginTop: '28px',
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '12px',
            padding: '22px',
            animation: 'fade-slide-up 350ms ease-out both',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#10B981',
              fontWeight: '600',
              fontSize: '15px',
              marginBottom: '18px',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="8" stroke="#10B981" strokeWidth="1.5"/>
                <path d="M5.5 9l2.5 2.5L12.5 6.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Purchase Order Processed
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
              {[
                ['PO Number',        result.po_number],
                ['Supplier',         result.supplier],
                ['Order Date',       result.order_date ? result.order_date.split('T')[0] : '—'],
                ['Delivery Date',    result.delivery_date ? result.delivery_date.split('T')[0] : '—'],
                ['Brand',            result.brand],
                ['Buyer',            result.buyer],
                ['Category',         result.category],
                ['Line Items',       result.line_items?.length ?? 0],
                ['Total (USD)',       `$${(result.total_value_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                ['Total (GBP)',       `£${(result.total_value_gbp || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: '#5A5878', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
                  <div style={{ color: '#F1F0FF', fontSize: '13px', fontWeight: '500' }}>{value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '11px',
                borderRadius: '8px',
              }}
            >
              View Dashboard →
            </button>
          </div>
        )}

        <BackLink onClick={() => navigate('/dashboard')} />
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={dismissToast}
      />
    </div>
  )
}
