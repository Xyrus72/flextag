import { useState, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import PageLoader from './components/PageLoader'

// Layouts + public pages stay eager — they're the entry surface every visitor hits.
import MainLayout from './layouts/MainLayout'
import CreatorLayout from './layouts/CreatorLayout'
import BrandLayout from './layouts/BrandLayout'
import AdminLayout from './layouts/AdminLayout'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
const CreatorPortfolio = lazy(() => import('./pages/public/CreatorPortfolio'))

// Dashboard pages are lazy-loaded per route so a landing visitor doesn't download
// the entire creator/brand/admin app up front.
const CreatorDashboard  = lazy(() => import('./pages/creator/CreatorDashboard'))
const Profile           = lazy(() => import('./pages/creator/Profile'))
const Catalog           = lazy(() => import('./pages/creator/Catalog'))
const ProductDetail     = lazy(() => import('./pages/creator/ProductDetail'))
const Cart              = lazy(() => import('./pages/creator/Cart'))
const MyOrders          = lazy(() => import('./pages/creator/MyOrders'))
const PostSubmission    = lazy(() => import('./pages/creator/PostSubmission'))
const CaptionValidator  = lazy(() => import('./pages/creator/CaptionValidator'))
const CampaignTracker   = lazy(() => import('./pages/creator/CampaignTracker'))
const Wallet            = lazy(() => import('./pages/creator/Wallet'))
const Leaderboard       = lazy(() => import('./pages/creator/Leaderboard'))
const Portfolio         = lazy(() => import('./pages/creator/Portfolio'))
const InstagramAnalyzer = lazy(() => import('./pages/creator/InstagramAnalyzer'))
const CheckoutSuccess   = lazy(() => import('./pages/creator/CheckoutSuccess'))
const CheckoutFail      = lazy(() => import('./pages/creator/CheckoutFail'))
const Disputes          = lazy(() => import('./pages/shared/Disputes'))
const Wishlist          = lazy(() => import('./pages/creator/Wishlist'))

const BrandDashboard    = lazy(() => import('./pages/brand/BrandDashboard'))
const BrandProfile      = lazy(() => import('./pages/brand/BrandProfile'))
const CampaignBuilder   = lazy(() => import('./pages/brand/CampaignBuilder'))
const OrderFulfillment  = lazy(() => import('./pages/brand/OrderFulfillment'))
const Analytics         = lazy(() => import('./pages/brand/Analytics'))
const InviteCampaign    = lazy(() => import('./pages/brand/InviteCampaign'))
const CreatorAudit      = lazy(() => import('./pages/brand/CreatorAudit'))
const BrandRatings      = lazy(() => import('./pages/brand/BrandRatings'))
const PostProduct       = lazy(() => import('./pages/brand/PostProduct'))
const MyProducts        = lazy(() => import('./pages/brand/MyProducts'))

const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'))
const BrandVerification = lazy(() => import('./pages/admin/BrandVerification'))
const Categories        = lazy(() => import('./pages/admin/Categories'))
const DisputePortal     = lazy(() => import('./pages/admin/DisputePortal'))
const CommissionSettings = lazy(() => import('./pages/admin/CommissionSettings'))
const FinancialDashboard = lazy(() => import('./pages/admin/FinancialDashboard'))
const Payouts           = lazy(() => import('./pages/admin/Payouts'))
const FraudReview       = lazy(() => import('./pages/admin/FraudReview'))
const PlatformAnalytics = lazy(() => import('./pages/admin/PlatformAnalytics'))
const PostReview        = lazy(() => import('./pages/admin/PostReview'))
const ProductApproval   = lazy(() => import('./pages/admin/ProductApproval'))
const CreatorVerification = lazy(() => import('./pages/admin/CreatorVerification'))
const AdminChat         = lazy(() => import('./pages/admin/AdminChat'))

const FAQ     = lazy(() => import('./pages/support/FAQ'))
const Tickets = lazy(() => import('./pages/support/Tickets'))
const Chat    = lazy(() => import('./pages/support/Chat'))

const RouteFallback = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
)

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  // While checking session on mount, render nothing (avoids flash redirect)
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* ── Public Routes ───────────────────────── */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/u/:handle" element={<CreatorPortfolio />} />{/* public creator portfolio */}

      {/* ── Creator Routes ──────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['creator']}><CreatorLayout /></ProtectedRoute>}>
        <Route path="/creator" element={<CreatorDashboard />} />
        <Route path="/creator/catalog" element={<Catalog />} />
        <Route path="/creator/product/:id" element={<ProductDetail />} />
        <Route path="/creator/cart" element={<Cart />} />
        <Route path="/creator/wishlist" element={<Wishlist />} />
        <Route path="/creator/orders" element={<MyOrders />} />
        <Route path="/creator/submit-post" element={<PostSubmission />} />
        <Route path="/creator/caption-validator" element={<CaptionValidator />} />
        <Route path="/creator/campaign-tracker" element={<CampaignTracker />} />
        <Route path="/creator/wallet" element={<Wallet />} />
        <Route path="/creator/leaderboard" element={<Leaderboard />} />
        <Route path="/creator/portfolio" element={<Portfolio />} />
        <Route path="/creator/profile" element={<Profile />} />
        <Route path="/creator/instagram-analyzer" element={<InstagramAnalyzer />} />
        <Route path="/creator/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/creator/checkout/fail" element={<CheckoutFail />} />
        <Route path="/creator/disputes" element={<Disputes />} />
        <Route path="/support/faq" element={<FAQ />} />
        <Route path="/support/tickets" element={<Tickets />} />
        <Route path="/support/chat" element={<Chat />} />
      </Route>

      {/* ── Brand Routes ────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['brand']}><BrandLayout /></ProtectedRoute>}>
        <Route path="/brand" element={<BrandDashboard />} />
        <Route path="/brand/post-product" element={<PostProduct />} />
        <Route path="/brand/my-products" element={<MyProducts />} />
        <Route path="/brand/campaign-builder" element={<CampaignBuilder />} />
        <Route path="/brand/orders" element={<OrderFulfillment />} />
        <Route path="/brand/analytics" element={<Analytics />} />
        <Route path="/brand/invite" element={<InviteCampaign />} />
        <Route path="/brand/creator-audit" element={<CreatorAudit />} />
        <Route path="/brand/ratings" element={<BrandRatings />} />
        <Route path="/brand/disputes" element={<Disputes />} />
        <Route path="/brand/profile" element={<BrandProfile />} />
        <Route path="/brand/chat" element={<Chat />} />
      </Route>

      {/* ── Admin Routes ────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/product-approval" element={<ProductApproval />} />
        <Route path="/admin/brand-verification" element={<BrandVerification />} />
        <Route path="/admin/creator-verification" element={<CreatorVerification />} />
        <Route path="/admin/post-review" element={<PostReview />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/disputes" element={<DisputePortal />} />
        <Route path="/admin/commission" element={<CommissionSettings />} />
        <Route path="/admin/financial" element={<FinancialDashboard />} />
        <Route path="/admin/payouts" element={<Payouts />} />
        <Route path="/admin/fraud" element={<FraudReview />} />
        <Route path="/admin/analytics" element={<PlatformAnalytics />} />
        <Route path="/admin/chat" element={<AdminChat />} />
      </Route>

      {/* ── Catch-all ───────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
)

const App = () => {
  const alreadyLoaded = sessionStorage.getItem('ft_loaded')
  const [loaded, setLoaded] = useState(!!alreadyLoaded)

  const handleLoaderDone = useCallback(() => {
    sessionStorage.setItem('ft_loaded', '1')
    setLoaded(true)
  }, [])

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            {!loaded && <PageLoader onDone={handleLoaderDone} />}
            <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease 0.1s' }}>
              <AppRoutes />
            </div>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
