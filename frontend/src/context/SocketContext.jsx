/**
 * SocketContext.jsx
 *
 * Provides a singleton Socket.IO connection for the entire app.
 * The socket connects once the user is authenticated and disconnects on logout.
 *
 * Usage:
 *   const { socket } = useSocket()
 *   socket.on('new_message', handler)
 *   socket.emit('send_message', { conversationId, text })
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const socketRef = useRef(null)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Wait until auth check is complete
    if (isLoading) return

    if (isAuthenticated) {
      // Connect — cookie session is sent automatically via withCredentials
      const s = io('http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      s.on('connect', () => {
        console.log('[socket] connected:', s.id)
      })

      s.on('connect_error', (err) => {
        console.warn('[socket] connection error:', err.message)
      })

      s.on('disconnect', (reason) => {
        console.log('[socket] disconnected:', reason)
      })

      socketRef.current = s
      setSocket(s)

      return () => {
        s.disconnect()
        socketRef.current = null
        setSocket(null)
      }
    } else {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
    }
  }, [isAuthenticated, isLoading])

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
