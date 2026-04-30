import React, { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api/axios.js'

const QUICK_QUESTIONS = [
  "What's our total order value?",
  "Which supplier has the most POs?",
  "Any overdue deliveries?",
  "USD vs GBP breakdown?",
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%', background: '#8B5CF6',
          display: 'inline-block',
          animation: `pulse-dot 1.4s ease-in-out ${i * 0.22}s infinite`,
        }} />
      ))}
    </div>
  )
}

function renderContent(text) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={i} style={{ height: '6px' }} />
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2)
      return (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
          <span style={{ color: '#8B5CF6', flexShrink: 0, marginTop: '1px' }}>•</span>
          <span>{boldify(content)}</span>
        </div>
      )
    }
    return <div key={i} style={{ marginBottom: '2px' }}>{boldify(trimmed)}</div>
  })
}

function boldify(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
}

function ChatMsg({ msg, onSpeak }) {
  const isUser = msg.role === 'user'
  const isVoice = msg.voice === true
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '12px', gap: '8px', alignItems: 'flex-end' }}>
      {!isUser && (
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '2px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2.5A1 1 0 012 1.5h8a1 1 0 011 1v4a1 1 0 01-1 1H4.5L2 9.5V2.5z" stroke="#fff" strokeWidth="1.1" strokeLinejoin="round"/></svg>
        </div>
      )}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : '#111827',
          color: '#F1F0FF', fontSize: '13px', lineHeight: '1.6',
          border: isUser ? 'none' : '1px solid rgba(139,92,246,0.18)',
          wordBreak: 'break-word',
        }}>
          {isUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isVoice && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="1" width="4" height="6" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/><path d="M1 6.5s0 3 4.5 3 4.5-3 4.5-3M5.5 9.5V11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              {msg.content}
            </div>
          ) : renderContent(msg.content)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', padding: '0 4px' }}>
          <span style={{ color: '#3D3D5C', fontSize: '10px' }}>{msg.time}</span>
          {!isUser && onSpeak && (
            <button onClick={() => onSpeak(msg.content)}
              style={{ background: 'none', border: 'none', color: '#3D3D5C', cursor: 'pointer', padding: '1px 4px', fontSize: '10px', borderRadius: '4px', transition: 'color 150ms' }}
              onMouseEnter={e => e.target.style.color = '#8B5CF6'}
              onMouseLeave={e => e.target.style.color = '#3D3D5C'}
              title="Read aloud">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 4h3l3-3v10L4 8H1V4z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M9 3c1.5 1 1.5 5 0 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1A1A2E', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '2px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="#A78BFA" strokeWidth="1.1"/><path d="M1 11c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="#A78BFA" strokeWidth="1.1" strokeLinecap="round"/></svg>
        </div>
      )}
    </div>
  )
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your PO Assistant. I have live access to your purchase order data — ask me about suppliers, spend, deliveries, brands, or anything else.",
      time: 'now'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuestions, setShowQuestions] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [voiceOutput, setVoiceOutput] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [interimText, setInterimText] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      setVoiceSupported(true)
      const rec = new SR()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) final += t
          else interim += t
        }
        setInterimText(interim)
        if (final) {
          setInput(final.trim())
          setInterimText('')
        }
      }

      rec.onend = () => {
        setIsListening(false)
        setInterimText('')
      }

      rec.onerror = (e) => {
        console.warn('Speech recognition error:', e.error)
        setIsListening(false)
        setInterimText('')
      }

      recognitionRef.current = rec
    }
  }, [])

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const timeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const clean = text.replace(/\*\*/g, '').replace(/•/g, '')
      const utt = new SpeechSynthesisUtterance(clean)
      utt.rate = 1.05
      utt.pitch = 1.0
      window.speechSynthesis.speak(utt)
    }
  }, [])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setInput('')
      setInterimText('')
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        console.warn('Could not start recognition:', e)
      }
    }
  }

  const sendMessage = useCallback(async (text, isVoice = false) => {
    const trimmed = (text !== undefined ? text : input).trim()
    if (!trimmed || loading) return

    if (isListening) { recognitionRef.current?.stop(); setIsListening(false) }
    setInput('')
    setInterimText('')

    const userMsg = { role: 'user', content: trimmed, time: timeStr(), voice: isVoice }
    setMessages(prev => [...prev, userMsg])
    setShowQuestions(false)
    setLoading(true)

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const { data } = await api.post('/ai/chat', { text: trimmed, history })
      const reply = data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply, time: timeStr() }])
      if (voiceOutput) speak(reply)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: msg, time: timeStr() }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, voiceOutput, speak, isListening])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    window.speechSynthesis?.cancel()
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. What would you like to know about your purchase orders?",
      time: timeStr()
    }])
    setShowQuestions(true)
  }

  const displayInput = interimText ? interimText : input

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: '20px', right: '16px', zIndex: 99999,
          width: '54px', height: '54px', borderRadius: '50%',
          background: open ? '#1A1A2E' : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
          border: open ? '1px solid rgba(139,92,246,0.4)' : 'none',
          cursor: 'pointer',
          boxShadow: open ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 24px rgba(124,58,237,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(124,58,237,0.7)' } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = open ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 24px rgba(124,58,237,0.5)' }}
        title={open ? 'Close assistant' : 'Open PO Assistant'}
      >
        {open
          ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/></svg>
          : <svg width="23" height="23" viewBox="0 0 23 23" fill="none"><path d="M3 5.5A2 2 0 015 3.5h13a2 2 0 012 2v8a2 2 0 01-2 2H8L3 19V5.5z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="8" cy="9.5" r="1" fill="#fff"/><circle cx="11.5" cy="9.5" r="1" fill="#fff"/><circle cx="15" cy="9.5" r="1" fill="#fff"/></svg>
        }
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          bottom: '86px',
          right: '16px',
          left: '16px',
          width: 'auto',
          maxWidth: '420px',
          marginLeft: 'auto',
          height: 'min(600px, calc(100dvh - 110px))',
          zIndex: 99998,
          background: '#070710',
          border: '1px solid rgba(139,92,246,0.22)',
          borderRadius: '18px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08)',
          display: 'flex', flexDirection: 'column',
          animation: 'fade-slide-up 220ms ease-out both',
          overflow: 'hidden',
        }}>

          <div style={{
            padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(139,92,246,0.05)',
          }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M2 3.5A1.5 1.5 0 013.5 2h10A1.5 1.5 0 0115 3.5v6A1.5 1.5 0 0113.5 11H7l-5 4V3.5z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#F1F0FF', fontSize: '14px', fontWeight: '600', letterSpacing: '-0.01em' }}>PO Assistant</div>
            </div>

            <button
              onClick={() => { setVoiceOutput(v => !v); window.speechSynthesis?.cancel() }}
              style={{ background: voiceOutput ? 'rgba(139,92,246,0.2)' : 'transparent', border: `1px solid ${voiceOutput ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: voiceOutput ? '#A78BFA' : '#5A5878', transition: 'all 150ms', display: 'flex', alignItems: 'center' }}
              title={voiceOutput ? 'Voice output on — click to mute' : 'Enable voice output'}
            >
              {voiceOutput
                ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5h3.5L7 2.5v9L4.5 9H1V5z" stroke="#A78BFA" strokeWidth="1.2" strokeLinejoin="round"/><path d="M10 3c2 1.5 2 6.5 0 8M8 5c1 1 1 3 0 4" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round"/></svg>
                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5h3.5L7 2.5v9L4.5 9H1V5z" stroke="#5A5878" strokeWidth="1.2" strokeLinejoin="round"/><path d="M10 3c2 1.5 2 6.5 0 8" stroke="#5A5878" strokeWidth="1.2" strokeLinecap="round"/><path d="M11 11L13 1" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round"/></svg>
              }
            </button>

            <button onClick={clearChat}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#5A5878', transition: 'all 150ms', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F1F0FF'}
              onMouseLeave={e => e.currentTarget.style.color = '#5A5878'}
              title="Clear conversation">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M5 3V2h3v1M3.5 3l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column' }}
            ref={el => { if (el) el.scrollTop = el.scrollHeight }}>
            {messages.map((msg, i) => (
              <ChatMsg key={i} msg={msg} onSpeak={voiceOutput ? speak : null} />
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2.5A1 1 0 012 1.5h8a1 1 0 011 1v4a1 1 0 01-1 1H4.5L2 9.5V2.5z" stroke="#fff" strokeWidth="1.1" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ background: '#111827', border: '1px solid rgba(139,92,246,0.18)', borderRadius: '16px 16px 16px 4px' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showQuestions && <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)} disabled={loading}
                style={{
                  padding: '7px 14px', textAlign: 'left', width: '100%',
                  background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)',
                  borderRadius: '9px', color: '#A78BFA', fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 150ms',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(139,92,246,0.16)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.07)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.18)' }}>
                {q}
              </button>
            ))}
          </div>}

          {(isListening || interimText) && (
            <div style={{
              margin: '0 14px 6px',
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FCA5A5',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse-dot 1s ease-in-out infinite' }} />
              {interimText ? `"${interimText}"` : 'Listening… speak now'}
            </div>
          )}

          <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={displayInput}
                onChange={e => { if (!interimText) setInput(e.target.value) }}
                onKeyDown={handleKey}
                placeholder={isListening ? 'Listening…' : 'Ask about your POs… (Enter to send)'}
                rows={1}
                style={{
                  width: '100%', padding: '10px 12px', resize: 'none', overflow: 'hidden',
                  background: '#111111', border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px', color: interimText ? '#9B99B8' : '#F1F0FF',
                  fontSize: '13px', outline: 'none', lineHeight: '1.4',
                  fontStyle: interimText ? 'italic' : 'normal',
                  transition: 'border-color 150ms', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { if (!isListening) e.target.style.borderColor = 'rgba(139,92,246,0.5)' }}
                onBlur={e => { if (!isListening) e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
              />
            </div>

            {voiceSupported && (
              <button
                onClick={toggleVoiceInput}
                style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms', color: isListening ? '#EF4444' : '#5A5878',
                  animation: isListening ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                }}
                onMouseEnter={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = '#A78BFA' } }}
                onMouseLeave={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#5A5878' } }}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening
                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="2" width="6" height="9" rx="3" fill="#EF4444"/><path d="M3 8s0 5 5 5 5-5 5-5M8 13v2" stroke="#EF4444" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="2" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.3"/><path d="M3 8s0 5 5 5 5-5 5-5M8 13v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                }
              </button>
            )}

            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !interimText) || loading}
              style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: (input.trim() || interimText) && !loading ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : 'rgba(255,255,255,0.05)',
                border: 'none', cursor: (input.trim() || interimText) && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms', opacity: (!input.trim() && !interimText) || loading ? 0.4 : 1,
                boxShadow: (input.trim() || interimText) && !loading ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
              }}>
              {loading
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 13L13 7.5 2 2v4.5l8 1-8 1V13z" fill="#fff"/></svg>
              }
            </button>
          </div>
        </div>
      )}
    </>
  )
}
