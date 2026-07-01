import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './layouts/MainLayout'
import CreatorLayout from './layouts/CreatorLayout'
import BrandLayout from './layouts/BrandLayout'
import AdminLayout from './layouts/AdminLayout'

// Public Pages
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Creator Pages
import CreatorDashboard from './pages/creator/CreatorDashboard'
import Profile from './pages/creator/Profile'
import Catalog from './pages/creator/Catalog'
import ProductDetail from './pages/creator/ProductDetail'
import Cart from './pages/creator/Cart'
import MyOrders from './pages/creator/MyOrders'
import PostSubmission from './pages/creator/PostSubmission'
import CaptionValidator from './pages/creator/CaptionValidator'
import CampaignTracker from './pages/creator/CampaignTracker'
import Wallet from './pages/creator/Wallet'
import Leaderboard from './pages/creator/Leaderboard'
import Portfolio from './pages/creator/Portfolio'

// Brand Pages
import BrandDashboard from './pages/brand/BrandDashboard'
import BrandProfile from './pages/brand/BrandProfile'
import CampaignBuilder from './pages/brand/CampaignBuilder'
import OrderFulfillment from './pages/brand/OrderFulfillment'
import Analytics from './pages/brand/Analytics'
import InviteCampaign from './pages/brand/InviteCampaign'
import BrandRatings from './pages/brand/BrandRatings'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import BrandVerification from './pages/admin/BrandVerification'
import Categories from './pages/admin/Categories'
import DisputePortal from './pages/admin/DisputePortal'
import CommissionSettings from './pages/admin/CommissionSettings'
import FinancialDashboard from './pages/admin/FinancialDashboard'
import PlatformAnalytics from './pages/admin/PlatformAnalytics'

// Support Pages
import FAQ from './pages/support/FAQ'
import Tickets from './pages/support/Tickets'
import Chat from './pages/support/Chat'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

const AppRoutes = () => (
  <Routes>
    {/* ── Public Routes ───────────────────────── */}
    <Route element={<MainLayout />}>
      <Route path="/" element={<Landing />} />
    </Route>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* ── Creator Routes ──────────────────────── */}
    <Route element={<ProtectedRoute allowedRoles={['creator']}><CreatorLayout /></ProtectedRoute>}>
      <Route path="/creator" element={<CreatorDashboard />} />
      <Route path="/creator/catalog" element={<Catalog />} />
      <Route path="/creator/product/:id" element={<ProductDetail />} />
      <Route path="/creator/cart" element={<Cart />} />
      <Route path="/creator/orders" element={<MyOrders />} />
      <Route path="/creator/submit-post" element={<PostSubmission />} />
      <Route path="/creator/caption-validator" element={<CaptionValidator />} />
      <Route path="/creator/campaign-tracker" element={<CampaignTracker />} />
      <Route path="/creator/wallet" element={<Wallet />} />
      <Route path="/creator/leaderboard" element={<Leaderboard />} />
      <Route path="/creator/portfolio" element={<Portfolio />} />
      <Route path="/creator/profile" element={<Profile />} />
      <Route path="/support/faq" element={<FAQ />} />
      <Route path="/support/tickets" element={<Tickets />} />
      <Route path="/support/chat" element={<Chat />} />
    </Route>

    {/* ── Brand Routes ────────────────────────── */}
    <Route element={<ProtectedRoute allowedRoles={['brand']}><BrandLayout /></ProtectedRoute>}>
      <Route path="/brand" element={<BrandDashboard />} />
      <Route path="/brand/campaign-builder" element={<CampaignBuilder />} />
      <Route path="/brand/orders" element={<OrderFulfillment />} />
      <Route path="/brand/analytics" element={<Analytics />} />
      <Route path="/brand/invite" element={<InviteCampaign />} />
      <Route path="/brand/ratings" element={<BrandRatings />} />
      <Route path="/brand/profile" element={<BrandProfile />} />
    </Route>

    {/* ── Admin Routes ────────────────────────── */}
    <Route element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/brand-verification" element={<BrandVerification />} />
      <Route path="/admin/categories" element={<Categories />} />
      <Route path="/admin/disputes" element={<DisputePortal />} />
      <Route path="/admin/commission" element={<CommissionSettings />} />
      <Route path="/admin/financial" element={<FinancialDashboard />} />
      <Route path="/admin/analytics" element={<PlatformAnalytics />} />
    </Route>

    {/* ── Catch-all ───────────────────────────── */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)

export default App
