import React, { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, Calendar, Globe, Search, Star, Activity, TrendingUp,
  Wallet, Menu, X
} from 'lucide-react'
import SignalBoard      from './pages/SignalBoard'
import StockDetail      from './pages/StockDetail'
import SeasonalCalendar from './pages/SeasonalCalendar'
import MacroDashboard   from './pages/MacroDashboard'
import Watchlist        from './pages/Watchlist'
import Screener         from './pages/Screener'
import Portfolio        from './pages/Portfolio'

const NAV = [
  { to: '/',          icon: Activity,  label: 'Tín hiệu' },
  { to: '/portfolio', icon: Wallet,    label: 'Mua bán Giả lập' },
  { to: '/seasonal',  icon: Calendar,  label: 'Mùa vụ' },
  { to: '/macro',     icon: Globe,     label: 'Vĩ mô' },
  { to: '/screener',  icon: BarChart2, label: 'Lọc CP' },
  { to: '/watchlist', icon: Star,      label: 'Watchlist' },
]

function LiveClock() {
  const [time, setTime] = React.useState(new Date())
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const isTrading = time.getHours() >= 9 && time.getHours() < 15 &&
    time.getDay() >= 1 && time.getDay() <= 5
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      <div className={`w-2 h-2 rounded-full ${isTrading ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      <span className="hidden sm:inline text-gray-400">{isTrading ? 'GIAO DỊCH' : 'NGOÀI GIỜ'}</span>
      <span className="text-gray-300">{time.toLocaleTimeString('vi-VN')}</span>
    </div>
  )
}

export default function App() {
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/stock/${search.trim().toUpperCase()}`)
      setSearch('')
      setMobileMenuOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col text-gray-100">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-3 sm:px-4 py-2.5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg border border-border">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-2 cursor-pointer">
              <TrendingUp className="text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-white font-bold text-base sm:text-lg tracking-tight">VNStock Intel</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm transition-colors ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Quick Search & Live Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mã CP..."
                className="bg-dark border border-border rounded-lg pl-8 pr-2.5 py-1 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 w-24 sm:w-36 uppercase font-mono"
              />
            </form>
            <LiveClock />
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 pb-1">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Main Responsive Container */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6">
        <Routes>
          <Route path="/"              element={<SignalBoard />} />
          <Route path="/portfolio"     element={<Portfolio />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/seasonal"      element={<SeasonalCalendar />} />
          <Route path="/macro"         element={<MacroDashboard />} />
          <Route path="/screener"      element={<Screener />} />
          <Route path="/watchlist"     element={<Watchlist />} />
        </Routes>
      </main>

      {/* Bottom Sticky Tab Bar for Mobile Phone Users */}
      <nav className="md:hidden sticky bottom-0 z-40 bg-card border-t border-border px-2 py-1.5 flex justify-around items-center">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 rounded ${
                isActive ? 'text-green-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <footer className="hidden md:block border-t border-border py-3 text-center text-xs text-gray-500">
        ⚠️ Công cụ phân tích chứng khoán & mua bán giả lập — Tự động cập nhật bảng giá thời gian thực.
      </footer>
    </div>
  )
}
