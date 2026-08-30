import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import {
  getAllConversations,
  getMessages,
} from '../../services/messages'
import api from '../../services/api'

/* ── Icons ───────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 18, cls = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
    strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)
const SendIcon    = () => <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
const SearchIcon  = () => <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
const MessageIcon = () => <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 0 2-2h14a2 2 0 0 1 2 2z" />
const RefreshIcon = () => <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
const UsersIcon   = () => <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />

const ROLE_BADGE = {
  admin:   { label: 'Admin',   bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  brand:   { label: 'Brand',   bg: 'rgba(16,185,129,0.15)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  creator: { label: 'Creator', bg: 'rgba(124,58,237,0.15)',  text: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
}

const Avatar = ({ user, size = 40 }) => {
  const src  = user?.logoUrl || user?.avatar
  const name = user?.companyName || user?.name || 'U'
  const role = user?.role || 'creator'
  const gradient = role === 'brand'
    ? 'linear-gradient(135deg,#10b981,#0d9488)'
    : role === 'admin'
    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
    : 'linear-gradient(135deg,#7c3aed,#06b6d4)'
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
      {src ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0].toUpperCase()}
    </div>
  )
}

export default function AdminChat() {
  const { user }   = useAuth()
  const { socket } = useSocket()

  const [conversations, setConversations] = useState([])
  const [activeConv,    setActiveConv]    = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [search,        setSearch]        = useState('')
  const [filterRole,    setFilterRole]    = useState('all')
  // { convId, name } — keyed by conversation, so switching threads clears the
  // indicator by derivation instead of a setState inside an effect.
  const [typingIn,      setTypingIn]      = useState(null)
  const [totalUnread,   setTotalUnread]   = useState(0)

  const messagesEndRef  = useRef(null)
  const typingTimerRef  = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Someone typing in another thread must not show up in this one.
  const typingUser = typingIn && String(typingIn.convId) === String(activeConv?._id) ? typingIn.name : null

  /* ── Load ALL conversations (admin-only) ─────────────────────────────── */
  // Promise chain rather than async/await so every setState lands in a callback
  // instead of running during the effect that kicked it off.
  const loadConversations = useCallback(() => (
    getAllConversations()
      .then(data => {
        const list = data.conversations || []
        setConversations(list)
        setTotalUnread(list.reduce((sum, c) => sum + (c.unreadCount || 0), 0))
      })
      .catch(err => console.error('Failed to load all conversations:', err))
  ), [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  /* ── Socket.IO real-time events ──────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = ({ message }) => {
      const msgConvId = message.conversationId?.toString?.() || message.conversationId
      if (msgConvId === activeConv?._id?.toString()) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id)
          return exists ? prev : [...prev, message]
        })
        setTimeout(scrollToBottom, 80)
      }
      // Update sidebar preview
      setConversations(prev => prev.map(c =>
        c._id?.toString() === msgConvId
          ? { ...c, lastMessage: message.text, lastMessageAt: message.createdAt, unreadCount: activeConv?._id?.toString() === msgConvId ? 0 : (c.unreadCount || 0) + 1 }
          : c
      ))
      setTotalUnread(prev => activeConv?._id?.toString() === msgConvId ? prev : prev + 1)
    }

    const handleConvUpdated = ({ conversationId, lastMessage, lastMessageAt }) => {
      setConversations(prev => prev.map(c =>
        c._id?.toString() === conversationId?.toString()
          ? { ...c, lastMessage, lastMessageAt }
          : c
      ))
    }

    const handleTyping = ({ conversationId, userName }) => {
      setTypingIn({ convId: String(conversationId), name: userName })
    }
    const handleStopTyping = () => setTypingIn(null)

    socket.on('new_message',         handleNewMessage)
    socket.on('conversation_updated', handleConvUpdated)
    socket.on('user_typing',          handleTyping)
    socket.on('user_stop_typing',     handleStopTyping)

    return () => {
      socket.off('new_message',          handleNewMessage)
      socket.off('conversation_updated', handleConvUpdated)
      socket.off('user_typing',          handleTyping)
      socket.off('user_stop_typing',     handleStopTyping)
    }
  }, [socket, activeConv?._id])

  /* ── Join room when conversation selected ────────────────────────────── */
  useEffect(() => {
    if (!socket || !activeConv?._id) return
    socket.emit('join_room', { conversationId: activeConv._id })
  }, [socket, activeConv?._id])

  /* ── Load messages for selected conversation ─────────────────────────── */
  const activeConvId = activeConv?._id
  const activeConvUnread = activeConv?.unreadCount || 0
  const fetchMessages = useCallback(() => {
    if (!activeConvId) return undefined
    return getMessages(activeConvId)
      .then(data => {
        setMessages(data.messages || [])
        // Reset unread for this conv in sidebar
        setConversations(prev => prev.map(c => (c._id === activeConvId ? { ...c, unreadCount: 0 } : c)))
        setTotalUnread(prev => Math.max(0, prev - activeConvUnread))
      })
      .catch(err => console.error('Failed to fetch messages:', err))
      .finally(() => {
        setLoadingMsgs(false)
        setTimeout(scrollToBottom, 120)
      })
  }, [activeConvId, activeConvUnread])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  /* ── Send Message via socket ─────────────────────────────────────────── */
  const handleSend = async () => {
    if (!input.trim() || !activeConv?._id || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    // Optimistic insert
    const tempMsg = {
      _id: 'temp-' + Date.now(),
      conversationId: activeConv._id,
      senderId: { _id: user._id, name: user.name, role: 'admin', avatar: user.avatar },
      text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    setTimeout(scrollToBottom, 80)

    try {
      // Use socket to send (backend will save to DB and broadcast)
      if (socket?.connected) {
        socket.emit('send_message', { conversationId: activeConv._id, text })
        // Remove temp (real message comes back via socket event)
        setMessages(prev => prev.filter(m => m._id !== tempMsg._id))
      } else {
        // Fallback to REST if socket unavailable
        const res = await api.post('/api/messages', { conversationId: activeConv._id, text })
        setMessages(prev => prev.map(m => m._id === tempMsg._id ? res.data.message : m))
      }
    } catch (err) {
      console.error('Send error:', err)
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id))
    } finally {
      setSending(false)
    }
  }

  /* ── Typing indicator ────────────────────────────────────────────────── */
  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (socket && activeConv?._id) {
      socket.emit('typing', { conversationId: activeConv._id })
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: activeConv._id })
      }, 1500)
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const getPartner = (conv) => {
    if (!conv?.participants) return null
    return conv.participants.find(p => p._id !== user._id) || conv.participants[0]
  }

  const getPartners = (conv) => {
    if (!conv?.participants) return []
    return conv.participants.filter(p => p._id !== user._id)
  }

  const filteredConvs = conversations.filter(conv => {
    const partners = getPartners(conv)
    const q = search.toLowerCase()
    const matchesSearch = !q || partners.some(p =>
      p.name?.toLowerCase().includes(q) ||
      p.companyName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
    const matchesRole = filterRole === 'all' || partners.some(p => p.role === filterRole)
    return matchesSearch && matchesRole
  })

  const partner = activeConv ? getPartner(activeConv) : null

  const roleCounts = {
    all:     conversations.length,
    creator: conversations.filter(c => getPartners(c).some(p => p.role === 'creator')).length,
    brand:   conversations.filter(c => getPartners(c).some(p => p.role === 'brand')).length,
  }

  return (
    <div className="page-root" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: '20px 24px 0' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-label"><span>Admin Panel</span></div>
          <h1 className="page-title" style={{ fontSize: 24, margin: 0 }}>
            Platform Messaging Hub
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(var(--ink-rgb),0.45)' }}>
            View & reply to all user conversations across the platform
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {totalUnread > 0 && (
            <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)', fontSize: 12, fontWeight: 700 }}>
              {totalUnread} unread
            </span>
          )}
          <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)', fontSize: 12, fontWeight: 700 }}>
            <UsersIcon /> {conversations.length} conversations
          </span>
          <button onClick={loadConversations}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)', color: 'rgba(var(--ink-rgb),0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* ── Role filter tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['all', 'All Chats'], ['creator', 'Creators'], ['brand', 'Brands']].map(([key, label]) => (
          <button key={key} onClick={() => setFilterRole(key)} style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            background: filterRole === key ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: filterRole === key ? '#fff' : 'rgba(var(--ink-rgb),0.4)',
            border: filterRole === key ? 'none' : '1px solid rgba(var(--ink-rgb),0.07)',
          }}>
            {label} ({roleCounts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* ── Main Panel ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14, minHeight: 0, marginBottom: 20 }} className="admin-chat-layout">

        {/* ── Left: All Conversations Sidebar ─────────────────────────── */}
        <div style={{ borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(var(--ink-rgb),0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.08)' }}>
              <SearchIcon />
              <input
                placeholder="Search users…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, flex: 1 }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredConvs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(var(--ink-rgb),0.25)', fontSize: 13 }}>
                <MessageIcon />
                <p style={{ marginTop: 10, fontWeight: 600, color: 'var(--text)' }}>No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const other = getPartner(conv)
                const isSelected = activeConv?._id === conv._id
                const badge = ROLE_BADGE[other?.role] || ROLE_BADGE.creator
                const timeAgo = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''

                return (
                  <div key={conv._id} onClick={() => { setLoadingMsgs(true); setActiveConv(conv) }} style={{
                    padding: '11px 13px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                    background: isSelected ? 'rgba(124,58,237,0.12)' : 'rgba(var(--ink-rgb),0.02)',
                    border: isSelected ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(var(--ink-rgb),0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={other} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                            {other?.companyName || other?.name || 'User'}
                          </span>
                          <span style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.3)', flexShrink: 0 }}>{timeAgo}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ padding: '1px 6px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                            {badge.label}
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.lastMessage || 'No messages yet'}
                          </span>
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ec4899', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: Chat Panel ─────────────────────────────────────────── */}
        <div style={{ borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(var(--ink-rgb),0.06)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.15)' }}>
                <Avatar user={partner} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {partner?.companyName || partner?.name}
                    </h2>
                    {partner && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: ROLE_BADGE[partner.role]?.bg, color: ROLE_BADGE[partner.role]?.text, border: `1px solid ${ROLE_BADGE[partner.role]?.border}` }}>
                        {partner.role?.toUpperCase()}
                      </span>
                    )}
                    {partner?.isVerified && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Verified</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                    <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>
                      {typingUser ? `${typingUser} is typing…` : 'Live – Real-Time Database Chat'}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)' }}>{partner?.email}</p>
                  {partner?.instagramHandle && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#a78bfa' }}>@{partner.instagramHandle}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loadingMsgs ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(var(--ink-rgb),0.25)' }}>
                    <MessageIcon />
                    <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text)' }}>
                      Start of conversation with {partner?.companyName || partner?.name}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.2)', marginTop: 4 }}>
                      Reply as FlexTag Admin to help this user
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = (msg.senderId?._id || msg.senderId) === user._id
                    const senderName = msg.senderId?.name || (isMe ? 'You (Admin)' : partner?.companyName || partner?.name || 'User')

                    return (
                      <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '72%' }}>
                          <div style={{
                            padding: '11px 16px', borderRadius: 14, fontSize: 14, lineHeight: 1.55,
                            ...(isMe
                              ? { background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', borderBottomRightRadius: 4 }
                              : { background: 'rgba(var(--ink-rgb),0.06)', color: '#e4e4e7', borderBottomLeftRadius: 4, border: '1px solid rgba(var(--ink-rgb),0.08)' }
                            )
                          }}>
                            {!isMe && <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', margin: '0 0 4px' }}>{senderName}</p>}
                            {msg.text}
                          </div>
                          <p style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.3)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Input Bar */}
              <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(var(--ink-rgb),0.06)', background: 'rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                  <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.4)', fontWeight: 600 }}>
                    Replying as FlexTag Admin
                  </span>
                </div>
                <form onSubmit={e => { e.preventDefault(); handleSend() }} style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder={`Reply to ${partner?.companyName || partner?.name || 'user'}…`}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(var(--ink-rgb),0.1)'}
                  />
                  <button type="submit" disabled={!input.trim() || sending}
                    style={{ padding: '12px 22px', borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', cursor: 'pointer', opacity: (!input.trim() || sending) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                    <SendIcon /> Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'rgba(var(--ink-rgb),0.3)' }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', marginBottom: 20 }}>
                <MessageIcon />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Admin Messaging Hub</h3>
              <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', marginTop: 8, textAlign: 'center', maxWidth: 380, lineHeight: 1.6 }}>
                Select a conversation from the left panel to view messages and reply to users as <strong style={{ color: '#f87171' }}>FlexTag Admin</strong>.
              </p>
              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 380 }}>
                {[
                  { icon: '👤', label: 'Creator Conversations', count: roleCounts.creator, color: '#a78bfa' },
                  { icon: '🏢', label: 'Brand Conversations',   count: roleCounts.brand,   color: '#34d399' },
                ].map(card => (
                  <div key={card.label} style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{card.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.count}</div>
                    <div style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.4)', marginTop: 2 }}>{card.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .admin-chat-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
