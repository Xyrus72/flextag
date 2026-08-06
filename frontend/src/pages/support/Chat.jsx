import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

const Chat = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    { id: 1, sender: 'support', name: 'Flextag Support', text: 'Hello! 👋 Welcome to Flextag support. How can I help you today?', time: '10:00 AM' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg = { id: Date.now(), sender: 'user', name: user?.name || 'You', text: input, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      setTyping(false)
      const replies = [
        'Thank you for reaching out! Let me look into that for you.',
        'I understand your concern. Let me check the details and get back to you shortly.',
        'That\'s a great question! Let me pull up the relevant information.',
        'I\'ve noted your issue. Our team will review it within 24 hours.',
        'Could you please provide your order ID so I can track it for you?',
      ]
      const reply = { id: Date.now() + 1, sender: 'support', name: 'Flextag Support', text: replies[Math.floor(Math.random() * replies.length)], time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
      setMessages(prev => [...prev, reply])
    }, 1500)
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen flex flex-col">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Live Chat</h1>
      <p className="text-zinc-500 mb-6">Real-time support with our team</p>

      <div className="flex-1 flex flex-col rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden max-h-[600px]">
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">S</div>
          <div>
            <p className="text-sm font-semibold text-white">Flextag Support</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.sender === 'user' ? 'order-1' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-br-md'
                    : 'bg-white/5 text-zinc-300 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[10px] text-zinc-600 mt-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>{msg.time}</p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/5 rounded-bl-md">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none placeholder:text-zinc-600" />
            <button onClick={sendMessage}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
