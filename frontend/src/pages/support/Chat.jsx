import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import {
  getConversations,
  getMessages,
  startConversation,
  getContacts,
  markConversationAsRead,
} from '../../services/messages'
import api from '../../services/api'

/* ── Icons ──────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 18, cls = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
    strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)
const SendIcon     = () => <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
const SearchIcon   = () => <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
const MessageIcon  = () => <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 0 2-2h14a2 2 0 0 1 2 2z" />
const ShieldIcon   = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
const BuildingIcon = () => <Icon d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12h12M6 17h12M9 6h6" />
const UserIcon     = () => <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
const XIcon        = () => <Icon d="M18 6L6 18M6 6l12 12" />
const AlertIcon    = () => <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />

const ROLE_BADGE = {
  admin:   { label: 'Admin Support', bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  brand:   { label: 'Brand Partner', bg: 'rgba(16,185,129,0.15)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  creator: { label: 'Creator',       bg: 'rgba(124,58,237,0.15)',  text: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
}

const Avatar = ({ user, size = 40 }) => {
  const src  = user?.logoUrl || user?.avatar
  const name = user?.companyName || user?.name || 'U'
  const role = user?.role || 'creator'
  const gradient = role === 'brand' ? 'linear-gradient(135deg,#10b981,#0d9488)'
    : role === 'admin' ? 'linear-gradient(135deg,#ef4444,#dc2626)'
    : 'linear-gradient(135deg,#7c3aed,#06b6d4)'
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
      {src ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const { socket, isConnected, isConnecting, connectionError } = useSocket()

  const [conversations, setConversations] = useState([])
  const [activeConv,    setActiveConv]    = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [typingUser,    setTypingUser]    = useState(null)
  const [errorMessage,  setErrorMessage]  = useState(null)

  // Contacts modal
  const [showContacts,  setShowContacts]  = useState(false)
  const [contactRole,   setContactRole]   = useState('brand')
  const [contacts,      setContacts]      = useState([])
  const [searchContact, setSearchContact] = useState('')
  const [loadingCtcts,  setLoadingCtcts]  = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimer    = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const isCreator = user?.role === 'creator'
  const isBrand   = user?.role === 'brand'

  /* ── Load conversations ─────────────────────────────────────────────── */
  const loadConversations = useCallback(async (autoSelect = false) => {
    try {
      const data = await getConversations()
      const list = data.conversations || []
      setConversations(list)
      if (autoSelect && list.length > 0 && !activeConv) {
        setActiveConv(list[0])
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }, [activeConv])

  useEffect(() => {
    loadConversations(true)
  }, [loadConversations])

  /* ── Socket.IO Real-Time Listeners ──────────────────────────────────── */
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = ({ message }) => {
      const msgConvId = message.conversationId?._id?.toString?.() || message.conversationId?.toString?.() || message.conversationId
      const activeId = activeConv?._id?.toString()

      if (msgConvId === activeId) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id)
          return exists ? prev : [...prev, message]
        })
        setTimeout(scrollToBottom, 80)

        // Mark as read in real-time if active
        if (socket.connected) {
          socket.emit('mark_read', { conversationId: activeId })
        }
      }

      setConversations(prev => prev.map(c => {
        const cId = c._id?.toString()
        if (cId === msgConvId) {
          return {
            ...c,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: activeId === msgConvId ? 0 : (c.unreadCount || 0) + 1,
          }
        }
        return c
      }))
    }

    const handleConvUpdated = ({ conversationId, lastMessage, lastMessageAt }) => {
      setConversations(prev => prev.map(c =>
        c._id?.toString() === conversationId?.toString()
          ? { ...c, lastMessage, lastMessageAt }
          : c
      ))
    }

    const handleTyping = ({ conversationId, userName }) => {
      if (conversationId === activeConv?._id?.toString()) {
        setTypingUser(userName)
      }
    }

    const handleStopTyping = () => {
      setTypingUser(null)
    }

    const handleSocketError = ({ message }) => {
      setErrorMessage(message || 'A chat error occurred.')
      setTimeout(() => setErrorMessage(null), 5000)
    }

    const handleMessagesRead = ({ conversationId }) => {
      if (conversationId === activeConv?._id?.toString()) {
        setMessages(prev => prev.map(m => ({ ...m, read: true })))
      }
    }

    socket.on('new_message',          handleNewMessage)
    socket.on('support:message',      handleNewMessage)
    socket.on('conversation_updated', handleConvUpdated)
    socket.on('user_typing',          handleTyping)
    socket.on('support:typing',       handleTyping)
    socket.on('user_stop_typing',     handleStopTyping)
    socket.on('support:stopTyping',    handleStopTyping)
    socket.on('support:error',        handleSocketError)
    socket.on('messages_read',        handleMessagesRead)
    socket.on('support:read',         handleMessagesRead)

    return () => {
      socket.off('new_message',          handleNewMessage)
      socket.off('support:message',      handleNewMessage)
      socket.off('conversation_updated', handleConvUpdated)
      socket.off('user_typing',          handleTyping)
      socket.off('support:typing',       handleTyping)
      socket.off('user_stop_typing',     handleStopTyping)
      socket.off('support:stopTyping',    handleStopTyping)
      socket.off('support:error',        handleSocketError)
      socket.off('messages_read',        handleMessagesRead)
      socket.off('support:read',         handleMessagesRead)
    }
  }, [socket, activeConv?._id])

  /* ── Join room when conversation selected ────────────────────────────── */
  useEffect(() => {
    if (!socket || !activeConv?._id) return
    socket.emit('join_room', { conversationId: activeConv._id })
    socket.emit('mark_read', { conversationId: activeConv._id })
    setTypingUser(null)
  }, [socket, activeConv?._id])

  /* ── Load messages ───────────────────────────────────────────────────── */
  const fetchMessages = useCallback(async () => {
    if (!activeConv?._id) return
    setLoadingMsgs(true)
    setErrorMessage(null)
    try {
      const data = await getMessages(activeConv._id)
      setMessages(data.messages || [])
      setConversations(prev => prev.map(c => c._id === activeConv._id ? { ...c, unreadCount: 0 } : c))
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      setErrorMessage('Failed to load messages.')
    } finally {
      setLoadingMsgs(false)
      setTimeout(scrollToBottom, 100)
    }
  }, [activeConv?._id])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  /* ── Send message ────────────────────────────────────────────────────── */
  const handleSend = async () => {
    if (!input.trim() || !activeConv?._id || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    setErrorMessage(null)

    // Stop typing indicator immediately
    if (socket && activeConv?._id) {
      socket.emit('stop_typing', { conversationId: activeConv._id })
    }

    const tempMsg = {
      _id: 'temp-' + Date.now(),
      conversationId: activeConv._id,
      senderId: { _id: user._id, name: user.name, role: user.role, avatar: user.avatar },
      text,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setMessages(prev => [...prev, tempMsg])
    setTimeout(scrollToBottom, 80)

    try {
      if (socket?.connected) {
        socket.emit('send_message', { conversationId: activeConv._id, text })
        // real message comes back via 'new_message' event
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m._id !== tempMsg._id))
        }, 300)
      } else {
        // Fallback to REST API if socket is temporarily offline
        const res = await api.post('/api/messages', { conversationId: activeConv._id, text })
        setMessages(prev => prev.map(m => m._id === tempMsg._id ? res.data.message : m))
        loadConversations(false)
      }
    } catch (err) {
      console.error('Send error:', err)
      setErrorMessage(err.response?.data?.message || 'Could not send message. Please check connection.')
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
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: activeConv._id })
      }, 1500)
    }
  }

  /* ── Start admin support ─────────────────────────────────────────────── */
  const handleStartAdminSupport = async () => {
    try {
      setErrorMessage(null)
      const res = await startConversation({ type: 'support' })
      if (res.conversation) {
        setActiveConv(res.conversation)
        loadConversations()
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not start admin support chat.')
    }
  }

  /* ── Open contact directory ──────────────────────────────────────────── */
  const openContacts = (role) => {
    setContactRole(role)
    setShowContacts(true)
    fetchContactList(role)
  }

  const fetchContactList = async (role) => {
    setLoadingCtcts(true)
    try {
      const params = role === 'all' ? {} : { role }
      const res = await getContacts(params)
      setContacts(res.contacts || [])
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally {
      setLoadingCtcts(false)
    }
  }

  const handleSelectContact = async (contact) => {
    try {
      setErrorMessage(null)
      const res = await startConversation({ targetUserId: contact._id, type: 'direct' })
      if (res.conversation) {
        setActiveConv(res.conversation)
        setShowContacts(false)
        loadConversations()
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not start conversation.')
    }
  }

  const getPartner = (conv) => {
    if (!conv?.participants) return null
    return conv.participants.find(p => p._id !== user._id) || conv.participants[0]
  }

  const partner = activeConv ? getPartner(activeConv) : null
  const filteredContacts = contacts.filter(c => {
    const q = searchContact.toLowerCase()
    return c.name?.toLowerCase().includes(q)
      || c.companyName?.toLowerCase().includes(q)
      || c.productCategory?.toLowerCase().includes(q)
  })

  // Header action buttons — role-aware
  const HeaderButtons = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Live Socket Connection Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: isConnected ? 'rgba(16,185,129,0.1)' : isConnecting ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : isConnecting ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
        fontSize: 12,
        fontWeight: 600,
        color: isConnected ? '#34d399' : isConnecting ? '#facc15' : '#f87171',
      }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isConnected ? '#34d399' : isConnecting ? '#facc15' : '#f87171',
          boxShadow: isConnected ? '0 0 8px #34d399' : 'none',
        }} />
        <span>{isConnected ? 'Real-Time Live' : isConnecting ? 'Connecting...' : 'Offline'}</span>
      </div>

      <button onClick={handleStartAdminSupport}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(239,68,68,0.25)', fontFamily: 'inherit' }}>
        <ShieldIcon /> Admin Support
      </button>
      {isCreator && (
        <button onClick={() => openContacts('brand')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#0d9488)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.25)', fontFamily: 'inherit' }}>
          <BuildingIcon /> Chat with Brands
        </button>
      )}
      {isBrand && (
        <button onClick={() => openContacts('creator')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.25)', fontFamily: 'inherit' }}>
          <UserIcon /> Chat with Creators
        </button>
      )}
    </div>
  )

  return (
    <div className="page-root" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: '24px 24px 0 24px' }}>

      {/* ── Error Toast ─────────────────────────────────────────────────── */}
      {errorMessage && (
        <div style={{
          marginBottom: 12,
          padding: '10px 16px',
          borderRadius: 12,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 600,
        }}>
          <AlertIcon />
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
            <XIcon />
          </button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-label"><span>Live Messaging & Support</span></div>
          <h1 className="page-title" style={{ fontSize: 24, margin: 0 }}>
            {isCreator ? 'Support Desk & Live Chat' : isBrand ? 'Creator & Admin Support' : 'Live Chat'}
          </h1>
        </div>
        <HeaderButtons />
      </div>

      {/* ── Chat Layout ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, minHeight: 0, marginBottom: 20 }} className="chat-layout">

        {/* Sidebar */}
        <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Conversations</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
              {conversations.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                <MessageIcon />
                <p style={{ marginTop: 10, fontWeight: 600, color: '#fff' }}>No messages yet</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>Choose an option below to get live help:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={handleStartAdminSupport}
                    style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🛡️ Talk to Admin Support
                  </button>
                  {isCreator && (
                    <button onClick={() => openContacts('brand')}
                      style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      🏢 Chat with a Brand
                    </button>
                  )}
                  {isBrand && (
                    <button onClick={() => openContacts('creator')}
                      style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      👤 Chat with a Creator
                    </button>
                  )}
                </div>
              </div>
            ) : (
              conversations.map(conv => {
                const other = getPartner(conv)
                const isSelected = activeConv?._id === conv._id
                const badge = ROLE_BADGE[other?.role] || ROLE_BADGE.creator

                return (
                  <div key={conv._id} onClick={() => setActiveConv(conv)}
                    style={{
                      padding: '12px 14px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      background: isSelected ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.04)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={other} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {other?.companyName || other?.name || 'User'}
                          </span>
                          <span style={{ padding: '1px 6px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                            {badge.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.lastMessage || 'No messages yet'}
                        </p>
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

        {/* Main Chat Room */}
        <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.01)' }}>
                <Avatar user={partner} size={44} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                      {partner?.companyName || partner?.name}
                    </h2>
                    {partner && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: ROLE_BADGE[partner.role]?.bg, color: ROLE_BADGE[partner.role]?.text, border: `1px solid ${ROLE_BADGE[partner.role]?.border}` }}>
                        {partner.role === 'admin' ? 'ADMIN SUPPORT' : partner.role === 'brand' ? 'BRAND PARTNER' : 'CREATOR'}
                      </span>
                    )}
                    {partner?.isVerified && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Verified</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                    <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>
                      {typingUser ? `${typingUser} is typing…` : isConnected ? 'Live Real-Time Socket Connection' : 'Connecting to live chat...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loadingMsgs ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                    <MessageIcon />
                    <p style={{ marginTop: 12, fontWeight: 600, color: '#fff' }}>Start of conversation with {partner?.companyName || partner?.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Type a message below to begin chatting in real-time!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const senderObj = msg.senderId
                    const senderIdStr = senderObj?._id?.toString?.() || senderObj?.toString?.()
                    const isMe = senderIdStr === user?._id?.toString()
                    const senderName = senderObj?.name || (isMe ? 'You' : partner?.companyName || partner?.name || 'User')

                    return (
                      <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%' }}>
                          <div style={{
                            padding: '12px 16px', borderRadius: 18, fontSize: 14, lineHeight: 1.5,
                            ...(isMe
                              ? { background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', borderBottomRightRadius: 4 }
                              : { background: 'rgba(255,255,255,0.06)', color: '#e4e4e7', borderBottomLeftRadius: 4, border: '1px solid rgba(255,255,255,0.08)' }
                            )
                          }}>
                            {!isMe && <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', margin: '0 0 4px' }}>{senderName}</p>}
                            {msg.text}
                          </div>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                <form onSubmit={e => { e.preventDefault(); handleSend() }} style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder={`Write a message to ${partner?.companyName || partner?.name || 'support'}…`}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                    onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button type="submit" disabled={!input.trim() || sending}
                    style={{ padding: '12px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', border: 'none', cursor: 'pointer', opacity: (!input.trim() || sending) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontFamily: 'inherit' }}>
                    <SendIcon /> Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 20, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', marginBottom: 16 }}>
                <MessageIcon />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Select or Start a Chat</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: 'center', maxWidth: 360 }}>
                {isCreator
                  ? <>Click <strong>"Admin Support"</strong> for help or <strong>"Chat with Brands"</strong> to message brand partners.</>
                  : isBrand
                  ? <>Click <strong>"Admin Support"</strong> for platform help or <strong>"Chat with Creators"</strong> to message creators.</>
                  : 'Select a conversation from the sidebar.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Contacts Modal ───────────────────────────────────────────────── */}
      {showContacts && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ width: 500, maxWidth: '100%', borderRadius: 22, background: '#0b0f24', border: '1px solid rgba(255,255,255,0.1)', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
                  {contactRole === 'brand' ? '🏢 Registered Brand Partners' : '👤 Registered Creators'}
                </h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                  {contactRole === 'brand'
                    ? 'Select a brand to start a live message thread'
                    : 'Select a creator to start a live message thread'}
                </p>
              </div>
              <button onClick={() => setShowContacts(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}>
                <XIcon />
              </button>
            </div>

            {/* Role toggle inside modal */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {isCreator && ['brand'].map(r => (
                <button key={r} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#10b981,#0d9488)', color: '#fff', border: 'none', cursor: 'default', fontFamily: 'inherit' }}>
                  Brand Partners
                </button>
              ))}
              {isBrand && ['creator'].map(r => (
                <button key={r} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', border: 'none', cursor: 'default', fontFamily: 'inherit' }}>
                  Creators
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 14 }}>
              <SearchIcon />
              <input
                placeholder={`Search ${contactRole === 'brand' ? 'brands' : 'creators'}…`}
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1 }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingCtcts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No {contactRole === 'brand' ? 'brand partners' : 'creators'} found in the database.
                </div>
              ) : (
                filteredContacts.map(c => {
                  const displayName = c.companyName || c.name
                  const accentColor = contactRole === 'brand' ? '#10b981' : '#7c3aed'
                  return (
                    <div key={c._id} onClick={() => handleSelectContact(c)}
                      style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = `rgba(${contactRole === 'brand' ? '16,185,129' : '124,58,237'},0.1)`}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar user={c} size={42} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{displayName}</p>
                            {c.isVerified && (
                              <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '1px 6px', borderRadius: 4 }}>✓ Verified</span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>
                            {c.productCategory || c.instagramHandle ? `@${c.instagramHandle}` : c.email}
                          </p>
                        </div>
                      </div>

                      <span style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg,${accentColor},${contactRole === 'brand' ? '#0d9488' : '#06b6d4'})`, color: '#fff', boxShadow: `0 4px 12px rgba(${contactRole === 'brand' ? '16,185,129' : '124,58,237'},0.2)` }}>
                        Chat
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .chat-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
