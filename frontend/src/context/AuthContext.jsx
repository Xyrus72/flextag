import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Mock user data for demonstration
const MOCK_USERS = {
  creator: {
    id: 'c001',
    name: 'Tasnim Rahman',
    email: 'tasnim@example.com',
    phone: '+880 1712-345678',
    role: 'creator',
    avatar: null,
    instagramHandle: '@tasnim.styles',
    followers: 12400,
    engagementRate: 4.7,
    tier: 'gold',
    isVerified: true,
    totalEarnings: 34500,
    completedCampaigns: 18,
  },
  brand: {
    id: 'b001',
    name: 'GlowUp Cosmetics',
    email: 'hello@glowup.com.bd',
    phone: '+880 1900-111222',
    role: 'brand',
    avatar: null,
    companyName: 'GlowUp Cosmetics Ltd.',
    website: 'https://glowup.com.bd',
    isVerified: true,
    totalCampaigns: 12,
    totalCreators: 156,
  },
  admin: {
    id: 'a001',
    name: 'Rafiq Ahmed',
    email: 'admin@flextag.com',
    role: 'admin',
    avatar: null,
    isSuper: true,
  },
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock login — in production, integrate Firebase
  const login = async (role = 'creator') => {
    setIsLoading(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    setUser(MOCK_USERS[role])
    setIsLoading(false)
    return MOCK_USERS[role]
  }

  const logout = () => {
    setUser(null)
  }

  const switchRole = (role) => {
    setUser(MOCK_USERS[role])
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      switchRole,
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
