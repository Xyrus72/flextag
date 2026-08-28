/**
 * SocketContext.jsx
 *
 * Provides a singleton Socket.IO connection for the entire FlexTag app.
 * Connects once the user is authenticated and disconnects on logout.
 *
 * Usage:
 *   const { socket, isConnected, isConnecting, connectionError } = useSocket()
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const socketRef = useRef(null)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    // Wait until initial session check finishes
    if (isLoading) return

    if (isAuthenticated) {
      setIsConnecting(true)
      setConnectionError(null)

      // Connect with cookie session credentials
      const s = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      })

      s.on('connect', () => {
        console.log('[Socket.IO] Connected successfully. Socket ID:', s.id)
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
      })

      s.on('connect_error', (err) => {
        console.warn('[Socket.IO] Connection error:', err.message)
        setIsConnected(false)
        setIsConnecting(false)
        setConnectionError(err.message || 'Connection error')
      })

      s.on('disconnect', (reason) => {
        console.log('[Socket.IO] Disconnected:', reason)
        setIsConnected(false)
        setIsConnecting(false)
      })

      s.on('reconnect_attempt', () => {
        setIsConnecting(true)
      })

      s.on('reconnect', () => {
        console.log('[Socket.IO] Reconnected.')
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
      })

      socketRef.current = s
      setSocket(s)

      return () => {
        s.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
        setIsConnecting(false)
      }
    } else {
      // Disconnect on logout
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
        setIsConnecting(false)
        setConnectionError(null)
      }
    }
  }, [isAuthenticated, isLoading])

  return (
    <SocketContext.Provider value={{ socket, isConnected, isConnecting, connectionError }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
