import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [isLoading, setIsLoading] = useState(true)   // true while checking session on mount

  // ── On mount: restore session from server ──────────────────────────────────
  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  // ── Register (admin-only: creates an account for someone else) ──────────────
  // The server requires an admin session and does NOT log you in as the new
  // user, so we don't touch local auth state here. Public signup uses the OTP
  // flow below.
  const register = async (formData) => {
    const res = await api.post('/api/auth/register', formData)
    return res.data.user
  }

  // ── OTP Registration — Step 1: send OTP ────────────────────────────────────
  const sendOtp = async (email) => {
    const res = await api.post('/api/auth/send-otp', { email })
    return res.data
  }

  // ── OTP Registration — Step 2: verify OTP + create account ────────────────
  const verifyOtp = async (formData) => {
    const res = await api.post('/api/auth/verify-otp', formData)
    setUser(res.data.user)
    return res.data.user
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    setUser(res.data.user)
    return res.data.user
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = async (navigateFn) => {
    try { await api.post('/api/auth/logout') } catch (_) {}
    setUser(null)
    // Navigate to home immediately — works even if ProtectedRoute re-renders first
    if (navigateFn) navigateFn('/', { replace: true })
    else window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      register,
      sendOtp,
      verifyOtp,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
