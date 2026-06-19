import React, { useState, useEffect } from 'react'
import {
  Building2, LogOut, Package, TrendingUp, ShoppingCart, Bell,
  CheckCircle2, Clock, AlertCircle, ChevronRight, BarChart3,
  Menu, Home, Settings, Users, Boxes, Search, Sun, Moon
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'

const defaultOrders = [
  { id: 'ORD-4421', patient: 'Adnan Rahman', med: 'Metformin 500mg × 60', time: '10 min ago', status: 'new', amount: '৳240', pharmacy: 'Lazz Pharma — Uttara' },
  { id: 'ORD-4418', patient: 'Fatema Begum', med: 'Amlodipine 5mg × 30', time: '32 min ago', status: 'processing', amount: '৳180', pharmacy: 'Lazz Pharma — Uttara' },
  { id: 'ORD-4415', patient: 'Rahim Uddin', med: 'Atorvastatin 20mg × 30', time: '1h ago', status: 'fulfilled', amount: '৳390', pharmacy: 'Mediplex — Gulshan' },
  { id: 'ORD-4412', patient: 'Nusrat Islam', med: 'Metformin 500mg × 60', time: '2h ago', status: 'fulfilled', amount: '৳240', pharmacy: 'Lazz Pharma — Uttara' },
  { id: 'ORD-4408', patient: 'Karim Hossain', med: 'Napa 500mg × 20', time: '3h ago', status: 'fulfilled', amount: '৳60', pharmacy: 'DND Pharmacy — Mirpur' },
]

const inventory = [
  { name: 'Metformin 500mg', stock: 240, unit: 'tabs', low: false },
  { name: 'Amlodipine 5mg', stock: 48, unit: 'tabs', low: true },
  { name: 'Atorvastatin 20mg', stock: 120, unit: 'tabs', low: false },
  { name: 'Napa 500mg', stock: 18, unit: 'tabs', low: true },
  { name: 'Omeprazole 20mg', stock: 200, unit: 'caps', low: false },
]

const NAV = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const statusConfig = {
  new: { label: 'New', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  processing: { label: 'Processing', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  fulfilled: { label: 'Fulfilled', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
}

export default function PharmacyDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Load / Save from shared localStorage
  const [orderList, setOrderList] = useState(() => {
    const saved = localStorage.getItem('mtrack-orders')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return defaultOrders
  })

  useEffect(() => {
    localStorage.setItem('mtrack-orders', JSON.stringify(orderList))
  }, [orderList])

  const fulfillOrder = (id, nextStatus = 'fulfilled') => {
    setOrderList(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o))
  }

  const newOrders = orderList.filter(o => o.status === 'new').length
  const revenue = orderList.filter(o => o.status === 'fulfilled').reduce((s, o) => s + parseInt(o.amount.replace('৳', '')), 0)

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      <div className="fixed top-0 right-0 w-[40vw] h-[40vh] bg-emerald-600/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[30vw] h-[30vh] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 border-r border-white/5 bg-zinc-950/80 backdrop-blur-md flex flex-col relative z-20 flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {sidebarOpen && <span className="text-sm font-semibold text-white italic tracking-tight">MediTrack BD</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ml-auto">
            <Menu className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <div className={`px-4 py-5 border-b border-white/5 flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-xs font-semibold text-white">Lazz Pharma</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Pharmacy</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${activeTab === id ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'} ${!sidebarOpen && 'justify-center'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-2 pb-4">
          <button onClick={() => navigate('/')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer ${!sidebarOpen && 'justify-center'}`}>
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="text-xs font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 relative z-10 overflow-auto">
        <div className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-sm font-semibold text-white">{NAV.find(n => n.id === activeTab)?.label}</h1>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Pharmacy Console</p>
          </div>
          <div className="flex items-center gap-3">
            {newOrders > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-blue-400 font-mono uppercase">{newOrders} New Order{newOrders > 1 ? 's' : ''}</span>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors cursor-pointer text-zinc-400 hover:text-white"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Today Revenue', value: `৳${revenue}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { label: 'Total Orders', value: orderList.length, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'New Orders', value: newOrders, icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                  { label: 'Low Stock', value: inventory.filter(i => i.low).length, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4">Recent Orders</h2>
                <div className="space-y-3">
                  {orderList.slice(0, 4).map(order => {
                    const s = statusConfig[order.status]
                    return (
                      <div key={order.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-5 py-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-zinc-400">{order.id}</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                          </div>
                          <p className="text-sm font-medium text-white mt-0.5">{order.patient}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{order.med}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-xs font-semibold text-white">{order.amount}</p>
                          <p className="text-[10px] text-zinc-600 font-mono">{order.time}</p>
                          {order.status === 'new' && (
                            <button onClick={() => fulfillOrder(order.id, 'processing')} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase tracking-wide rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer">
                              Accept
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Low Stock Alert */}
              {inventory.filter(i => i.low).length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-semibold text-red-400">Low Stock Alert</span>
                  </div>
                  <div className="space-y-2">
                    {inventory.filter(i => i.low).map(item => (
                      <div key={item.name} className="flex justify-between items-center py-2 border-b border-red-500/10 last:border-0">
                        <p className="text-xs text-white">{item.name}</p>
                        <span className="text-xs text-red-400 font-mono">{item.stock} {item.unit} remaining</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">All Orders</h2>
              {orderList.map(order => {
                const s = statusConfig[order.status]
                return (
                  <div key={order.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-xs font-mono text-zinc-400">{order.id}</p>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-white">{order.patient}</p>
                        <p className="text-xs text-zinc-500 mt-1">{order.med}</p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-1">{order.time}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-base font-bold text-white">{order.amount}</p>
                        {order.status === 'new' && (
                          <button onClick={() => fulfillOrder(order.id, 'processing')} className="block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer">
                            Accept & Process
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button onClick={() => fulfillOrder(order.id, 'fulfilled')} className="block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono uppercase rounded-lg hover:bg-blue-500/20 transition-colors cursor-pointer">
                            Mark Fulfilled
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Inventory Management</h2>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-mono uppercase tracking-widest text-[10px]">
                      <th className="text-left px-6 py-4">Medicine</th>
                      <th className="text-left px-6 py-4">Stock</th>
                      <th className="text-left px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{item.name}</td>
                        <td className="px-6 py-4 text-zinc-400 font-mono">{item.stock} {item.unit}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase border ${item.low ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                            {item.low ? 'Low Stock' : 'Adequate'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Repeat Customers</h2>
              <div className="space-y-3">
                {['Adnan Rahman', 'Fatema Begum', 'Rahim Uddin', 'Nusrat Islam', 'Karim Hossain'].map((name, i) => (
                  <div key={name} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        {name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Chronic patient &bull; {[3, 5, 2, 4, 1][i]} orders</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{['Diabetes', 'Cardiac', 'Hypertension', 'Diabetes', 'Acute'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="text-base font-semibold text-white">Pharmacy Settings</h2>
              {[
                { label: 'Pharmacy Name', value: 'Lazz Pharma — Uttara Branch' },
                { label: 'License Number', value: 'DGDA-BD-2024-4821' },
                { label: 'Order Notifications', value: 'SMS & Dashboard Alerts' },
                { label: 'Commission Rate', value: '12% per fulfilled order' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-xs font-medium text-white">{item.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
