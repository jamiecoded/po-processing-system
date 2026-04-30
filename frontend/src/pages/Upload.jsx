import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'
import Toast from '../components/Toast.jsx'

const UploadIcon = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ animation: 'float-icon 2.4s ease-in-out infinite' }}>
    <defs><linearGradient id="uploadGrad" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#4F46E5"/></linearGradient></defs>
    <rect x="8" y="4" width="28" height="36" rx="4" fill="url(#uploadGrad)" opacity="0.15"/>
    <rect x="8" y="4" width="28" height="36" rx="4" stroke="url(#uploadGrad)" strokeWidth="1.5"/>
    <circle cx="38" cy="38" r="12" fill="#000000" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
    <path d="M38 33v8M35 36l3-3 3 3" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ExcelIcon = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ animation: 'float-icon 2.4s ease-in-out infinite' }}>
    <rect x="8" y="4" width="28" height="36" rx="4" fill="rgba(16,185,129,0.1)"/>
    <rect x="8" y="4" width="28" height="36" rx="4" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5"/>
    <path d="M14 16l5 7-5 7M24 30h8" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="1" width="10" height="14" rx="2" stroke="#8B5CF6" strokeWidth="1.3"/>
    <path d="M9 1v4h3" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M5 8h6M5 11h4" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

function SectionCard({ children, color }) {
  return (
    <div style={{ background: '#0A0A0A', border: `1px solid ${color || 'rgba(139,92,246,0.15)'}`, borderRadius: '14px', padding: '28px', marginBottom: '24px' }}>
      {children}
    </div>
  )
}

function FileRow({ file, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#111111', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '8px', marginTop: '8px' }}>
      <FileIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#F1F0FF', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ color: '#5A5878', fontSize: '11px' }}>{(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button onClick={() => onRemove(file.name)} style={{ background: 'none', border: 'none', color: '#5A5878', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
        onMouseEnter={e => e.target.style.color = '#EF4444'} onMouseLeave={e => e.target.style.color = '#5A5878'}>x</button>
    </div>
  )
}

function ResultRow({ r }) {
  const ok = r.status === 'ok'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: ok ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', marginTop: '8px', fontSize: '13px' }}>
      <span style={{ color: ok ? '#10B981' : '#EF4444', fontWeight: '600' }}>{ok ? 'OK' : 'ERR'}</span>
      <span style={{ color: '#9B99B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</span>
      {ok ? <span style={{ color: '#A78BFA', whiteSpace: 'nowrap' }}>{r.po_number} · {r.po_currency || 'USD'} · {r.total_order_qty || 0} pcs</span>
           : <span style={{ color: '#EF4444', fontSize: '12px' }}>{r.error}</span>}
    </div>
  )
}

export default function Upload() {
  const navigate = useNavigate()
  const [pdfFiles, setPdfFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pdfResults, setPdfResults] = useState(null)
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const dismissToast = useCallback(() => setToast(t => ({ ...t, visible: false })), [])

  const onPdfDrop = useCallback((accepted) => {
    setPdfFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...accepted.filter(f => !existing.has(f.name))]
    })
    setPdfResults(null)
  }, [])

  const { getRootProps: getPdfRoot, getInputProps: getPdfInput, isDragActive: isPdfDrag } = useDropzone({
    onDrop: onPdfDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true,
  })

  const removePdf = (name) => setPdfFiles(prev => prev.filter(f => f.name !== name))

  const handlePdfUpload = async () => {
    if (!pdfFiles.length) return
    setUploading(true); setProgress(0)
    const fd = new FormData()
    pdfFiles.forEach(f => fd.append('files', f))
    try {
      const { data } = await api.post('/orders/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
      })
      setPdfResults(data); setPdfFiles([])
      const ok = data.results?.length || 0, err = data.errors?.length || 0
      setToast({ visible: true, message: err === 0 ? `${ok} PDF${ok !== 1 ? 's' : ''} processed!` : `${ok} ok, ${err} failed.`, type: err === 0 ? 'success' : 'error' })
    } catch (e) {
      setToast({ visible: true, message: e.response?.data?.detail || 'Upload failed.', type: 'error' })
    } finally { setUploading(false); setProgress(0) }
  }

  const onExcelDrop = useCallback((accepted) => {
    if (accepted.length) { setExcelFile(accepted[0]); setImportResult(null) }
  }, [])

  const { getRootProps: getExcelRoot, getInputProps: getExcelInput, isDragActive: isExcelDrag } = useDropzone({
    onDrop: onExcelDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false,
  })

  const handleExcelImport = async () => {
    if (!excelFile) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', excelFile)
    try {
      const { data } = await api.post('/api/import/excel', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(data); setExcelFile(null)
      setToast({ visible: true, message: `Imported ${data.imported}, updated ${data.updated}.`, type: 'success' })
    } catch (e) {
      setToast({ visible: true, message: e.response?.data?.detail || 'Import failed.', type: 'error' })
    } finally { setImporting(false) }
  }

  const dz = (active, base) => ({
    border: `2px dashed ${active ? base.replace('0.25', '0.7') : base}`,
    borderRadius: '12px', padding: '40px 32px', textAlign: 'center', cursor: 'pointer',
    background: active ? base.replace('0.25', '0.05') : 'transparent', transition: 'all 250ms ease',
  })

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: '#000000' }}>
      <Navbar />
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '400px', pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(139,92,246,0.1), transparent)' }} />
      <div className="upload-container" style={{ maxWidth: '720px', margin: '0 auto', padding: '44px 24px', position: 'relative', zIndex: 1, animation: 'fade-slide-up 350ms ease-out both' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em', color: '#F1F0FF', marginBottom: '8px' }}>Upload Purchase Orders</h1>
        <p style={{ color: '#9B99B8', fontSize: '14px', marginBottom: '36px' }}>Upload PDFs to extract automatically, or import your tracking Excel sheet in bulk.</p>

        <SectionCard>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>PDF Upload</div>
          <div {...getPdfRoot()} className="dropzone" style={dz(isPdfDrag, 'rgba(139,92,246,0.25)')}>
            <input {...getPdfInput()} />
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}><UploadIcon /></div>
            <div style={{ color: '#F1F0FF', fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>{isPdfDrag ? 'Drop PDFs here' : 'Drag and drop one or more PO PDFs'}</div>
            <div style={{ color: '#5A5878', fontSize: '13px' }}>or click to browse - PDF files only</div>
          </div>
          {pdfFiles.map(f => <FileRow key={f.name} file={f} onRemove={removePdf} />)}
          {uploading && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ width: '100%', height: '4px', background: '#1E1E2E', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)', transition: 'width 0.3s ease', borderRadius: '2px' }} />
              </div>
              <div style={{ color: '#5A5878', fontSize: '12px', marginTop: '4px', textAlign: 'right' }}>{progress}%</div>
            </div>
          )}
          <button onClick={handlePdfUpload} disabled={!pdfFiles.length || uploading}
            className={pdfFiles.length && !uploading ? 'btn-primary' : 'btn-disabled'}
            style={{ width: '100%', height: '48px', marginTop: '16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {uploading ? <><span style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />Processing</> : pdfFiles.length > 0 ? `Upload ${pdfFiles.length} PDF${pdfFiles.length > 1 ? 's' : ''}` : 'Upload PDFs'}
          </button>
          {pdfResults && (
            <div style={{ marginTop: '14px', animation: 'fade-slide-up 300ms ease-out both' }}>
              <div style={{ color: '#9B99B8', fontSize: '12px', marginBottom: '6px' }}>{pdfResults.processed} processed · {pdfResults.errors?.length || 0} errors</div>
              {pdfResults.results?.map(r => <ResultRow key={r.filename} r={r} />)}
              {pdfResults.errors?.map(r => <ResultRow key={r.filename} r={{ ...r, status: 'error' }} />)}
              <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: '100%', marginTop: '12px', padding: '11px', borderRadius: '8px', fontSize: '14px' }}>View Dashboard</button>
            </div>
          )}
        </SectionCard>

        <SectionCard color="rgba(16,185,129,0.15)">
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Excel Import</div>
          <div {...getExcelRoot()} style={dz(isExcelDrag, 'rgba(16,185,129,0.25)')}>
            <input {...getExcelInput()} />
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}><ExcelIcon /></div>
            <div style={{ color: '#F1F0FF', fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>{isExcelDrag ? 'Drop Excel file here' : 'Drag and drop your PO tracking sheet'}</div>
            <div style={{ color: '#5A5878', fontSize: '13px' }}>.xlsx or .xls - imports all rows at once</div>
          </div>
          {excelFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px 14px', background: '#111111', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
              <span style={{ color: '#10B981', fontSize: '18px' }}>*</span>
              <span style={{ flex: 1, color: '#F1F0FF', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{excelFile.name}</span>
              <span style={{ color: '#5A5878', fontSize: '12px' }}>{(excelFile.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => setExcelFile(null)} style={{ background: 'none', border: 'none', color: '#5A5878', cursor: 'pointer', fontSize: '18px' }}
                onMouseEnter={e => e.target.style.color = '#EF4444'} onMouseLeave={e => e.target.style.color = '#5A5878'}>x</button>
            </div>
          )}
          <button onClick={handleExcelImport} disabled={!excelFile || importing}
            className={excelFile && !importing ? 'btn-primary' : 'btn-disabled'}
            style={{ width: '100%', height: '48px', marginTop: '16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', ...(excelFile && !importing ? { background: 'linear-gradient(135deg, #059669, #0d9488)', border: 'none' } : {}) }}>
            {importing ? <><span style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />Importing</> : 'Import Excel Sheet'}
          </button>
          {importResult && (
            <div style={{ marginTop: '14px', padding: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px' }}>
              <div style={{ color: '#10B981', fontWeight: '600', fontSize: '14px', marginBottom: '10px' }}>Import Complete</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[['New records', importResult.imported], ['Updated', importResult.updated], ['Skipped', importResult.skipped], ['Errors', importResult.errors?.length || 0]].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ color: '#5A5878', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ color: '#F1F0FF', fontSize: '20px', fontWeight: '700' }}>{val}</div>
                  </div>
                ))}
              </div>
              {importResult.errors?.length > 0 && (
                <div style={{ marginTop: '10px', color: '#EF4444', fontSize: '12px' }}>
                  {importResult.errors.slice(0, 3).map((e, i) => <div key={i}>Row {e.row}: {e.error}</div>)}
                  {importResult.errors.length > 3 && <div>and {importResult.errors.length - 3} more</div>}
                </div>
              )}
              <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: '100%', marginTop: '12px', padding: '11px', borderRadius: '8px', fontSize: '14px' }}>View Dashboard</button>
            </div>
          )}
        </SectionCard>

        <button onClick={() => navigate('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#A78BFA', fontSize: '14px', cursor: 'pointer', padding: 0 }}>Back to Dashboard</button>
      </div>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={dismissToast} />
    </div>
  )
}
