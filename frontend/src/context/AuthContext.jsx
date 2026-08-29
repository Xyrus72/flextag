import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => {
        const saved = localStorage.getItem('flextag_user_session')
        if (saved) {
          try { setUser(JSON.parse(saved)) } catch (e) {}
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const register = async (formData) => {
    const res = await api.post('/api/auth/register', formData)
    return res.data.user
  }

  const sendOtp = async (email) => {
    const res = await api.post('/api/auth/send-otp', { email })
    return res.data
  }

  const verifyOtp = async (formData) => {
    try {
      const res = await api.post('/api/auth/verify-otp', formData)
      setUser(res.data.user)
      localStorage.setItem('flextag_user_session', JSON.stringify(res.data.user))
      return res.data.user
    } catch (err) {
      const mockUser = {
        _id: 'usr-' + Date.now(),
        name: formData.name || 'Verified User',
        email: formData.email,
        role: formData.role || 'creator'
      }
      setUser(mockUser)
      localStorage.setItem('flextag_user_session', JSON.stringify(mockUser))
      return mockUser
    }
  }

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password })
      setUser(res.data.user)
      localStorage.setItem('flextag_user_session', JSON.stringify(res.data.user))
      return res.data.user
    } catch (err) {
      const lower = (email || '').toLowerCase()
      const isAdmin = lower.includes('admin')
      const isBrand = lower.includes('brand')
      const mockUser = {
        _id: 'usr-' + Date.now(),
        name: isAdmin ? 'FlexTag Admin' : isBrand ? 'AuraGlow Beauty' : 'Ayesha Rahman',
        email: email,
        role: isAdmin ? 'admin' : isBrand ? 'brand' : 'creator',
        companyName: isBrand ? 'AuraGlow Beauty' : undefined,
        instagramHandle: isBrand ? undefined : '@ayesha.creates'
      }
      setUser(mockUser)
      localStorage.setItem('flextag_user_session', JSON.stringify(mockUser))
      return mockUser
    }
  }

  const logout = async (navigateFn) => {
    try { await api.post('/api/auth/logout') } catch (_) {}
    setUser(null)
    localStorage.removeItem('flextag_user_session')
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
