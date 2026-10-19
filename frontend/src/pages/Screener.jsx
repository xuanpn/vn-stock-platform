import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Filter, Search } from 'lucide-react'
import { getScreener } from '../api'
import { SignalBadge, ScoreBar, LoadingSpinner, ErrorCard } from '../components/ui'

const SIGNALS = ['ALL', 'STRONG_BUY', 'BUY', 'WATCH', 'AVOID']
const SECTORS = ['Tất cả', 'Ngân hàng', 'Bất động sản', 'Thép', 'Dầu khí', 'Bán lẻ', 'Công nghệ', 'Thủy sản', 'Dệt may', 'Chứng khoán']

export default function Screener() {
  const [signal, setSignal] = useState('ALL')
  const [sector, setSector] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['screener', signal, sector],
    queryFn: () => getScreener({
      signal: signal === 'ALL' ? undefined : signal,
      sector: sector === 'Tất cả' ? undefined : sector,
      min_score: 0
    }),
  })

  const stocks = (data?.stocks || []).filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Filter className="text-green-400" /> Bộ lọc cổ phiếu toàn diện (Screener)
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Lọc cổ phiếu theo tín hiệu kỹ thuật, điểm tổng hợp, ngành nghề và vùng giá mục tiêu.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="card flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Lọc mã hoặc tên..."
            className="bg-dark border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 w-44"
          />
        </div>

        {/* Signal Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Tín hiệu:</span>
          <div className="flex gap-1">
            {SIGNALS.map(s => (
              <button
                key={s}
                onClick={() => setSignal(s)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  signal === s
                    ? 'border-green-500 text-green-400 bg-green-500/10 font-bold'
                    : 'border-border text-gray-400 hover:border-gray-500'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Ngành:</span>
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="bg-dark border border-border text-sm text-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-green-500">
            {SECTORS.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Results Table */}
      {isLoading ? <LoadingSpinner /> : isError ? <ErrorCard /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase">
                <th className="text-left py-2.5 px-3">Mã</th>
                <th className="text-left py-2.5 px-3">Tín hiệu</th>
                <th className="text-right py-2.5 px-3">Giá hiện tại</th>
                <th className="text-right py-2.5 px-3">Vùng mua</th>
                <th className="text-right py-2.5 px-3">Cắt lỗ</th>
                <th className="text-right py-2.5 px-3">TP1</th>
                <th className="text-right py-2.5 px-3">TP2</th>
                <th className="text-right py-2.5 px-3">TP3</th>
                <th className="text-left py-2.5 px-3 w-32">Tổng điểm</th>
                <th className="text-left py-2.5 px-3">Ngành</th>
                <th className="text-center py-2.5 px-3">Lệnh</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr
                  key={s.symbol}
                  className="border-b border-border/50 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 cursor-pointer" onClick={() => navigate(`/stock/${s.symbol}`)}>
                    <span className="font-bold text-white font-mono hover:text-green-400">{s.symbol}</span>
                    <div className="text-xs text-gray-500">{s.company_name}</div>
                  </td>
                  <td className="py-2.5 px-3"><SignalBadge signal={s.signal} /></td>
                  <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">
                    {s.price?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-400">
                    {s.buy_price?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-400">
                    {s.cutloss?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-400">
                    {s.tp1?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-400">
                    {s.tp2?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-300">
                    {s.tp3?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-2.5 px-3">
                    <ScoreBar score={s.score} />
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-400">{s.sector}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => navigate(`/portfolio?buy=${s.symbol}&price=${s.price}`)}
                      className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xs transition-colors shadow">
                      Mua
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stocks.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              Không tìm thấy cổ phiếu thỏa mãn tiêu chí lọc.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
