import React from 'react'

export function SignalBadge({ signal }) {
  const map = {
    STRONG_BUY: { label: 'MUA MẠNH 🟢', cls: 'badge-strongbuy' },
    BUY:        { label: 'MUA 🟩',       cls: 'badge-buy' },
    WATCH:      { label: 'THEO DÕI 🟡',  cls: 'badge-watch' },
    AVOID:      { label: 'TRÁNH 🔴',     cls: 'badge-avoid' },
  }
  const { label, cls } = map[signal] || map.AVOID
  return <span className={cls}>{label}</span>
}

export function ScoreBar({ score, label }) {
  const color = score >= 80 ? 'bg-green-400'
    : score >= 65 ? 'bg-green-600'
    : score >= 50 ? 'bg-yellow-400'
    : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400 w-20">{label}</span>}
      <div className="flex-1 bg-dark rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-300 w-8 text-right">{score}</span>
    </div>
  )
}

export function PriceTargetCard({ buy, cutloss, tp1, tp2, tp3, current }) {
  const pct = (p) => current ? (((p - current) / current) * 100).toFixed(1) : null

  const Row = ({ label, price, color, dir }) => (
    <div className={`flex justify-between items-center py-1.5 border-b border-border/50 last:border-0`}>
      <span className="text-sm text-gray-400">{label}</span>
      <div className="text-right">
        <div className={`font-mono font-bold ${color}`}>{price?.toLocaleString('vi-VN')} ₫</div>
        {current && price && (
          <div className={`text-xs ${parseFloat(pct(price)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {parseFloat(pct(price)) >= 0 ? '+' : ''}{pct(price)}%
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="card space-y-0">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">🎯 Vùng giá chiến lược</h3>
      <Row label="✂️ Cut-loss"         price={cutloss} color="text-red-400" />
      <Row label="📍 Vùng mua"         price={buy}     color="text-blue-400" />
      <Row label="🎯 Mục tiêu 1 (~4W)" price={tp1}     color="text-green-400" />
      <Row label="🎯 Mục tiêu 2 (~3M)" price={tp2}     color="text-green-400" />
      <Row label="🎯 Mục tiêu 3 (~1Y)" price={tp3}     color="text-emerald-300" />
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-border border-t-green-400 rounded-full animate-spin" />
    </div>
  )
}

export function ErrorCard({ message }) {
  return (
    <div className="card border-red-800 bg-red-950/30 text-red-300 text-sm">
      ⚠️ {message || 'Lỗi tải dữ liệu. Vui lòng thử lại.'}
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  )
}
