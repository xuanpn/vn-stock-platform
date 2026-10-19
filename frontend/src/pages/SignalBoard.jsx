import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import { getSignals } from '../api'
import { SignalBadge, ScoreBar, LoadingSpinner, ErrorCard, StatCard } from '../components/ui'

const SECTORS = ['Tất cả', 'Ngân hàng', 'Bất động sản', 'Thép', 'Dệt may', 'Thủy sản', 'Tiêu dùng', 'Dầu khí', 'Xây dựng']

export default function SignalBoard() {
  const [minScore, setMinScore] = useState(60)
  const [sector, setSector] = useState('Tất cả')
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['signals', minScore, sector],
    queryFn: () => getSignals({ min_score: minScore, sector: sector === 'Tất cả' ? undefined : sector }),
    staleTime: 5 * 60 * 1000,
  })

  const stocks = data?.stocks || []
  const summary = data?.summary || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-green-400" /> Bảng tín hiệu hôm nay
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cập nhật lúc {data?.updated_at || '---'} · {stocks.length} mã được lọc
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-lg text-sm hover:border-green-500 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-green-400' : 'text-gray-400'}`} />
          Làm mới
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Mua mạnh 🟢" value={summary.strong_buy || 0} color="text-green-400" />
        <StatCard label="Mua 🟩"       value={summary.buy || 0}        color="text-green-600" />
        <StatCard label="Theo dõi 🟡"  value={summary.watch || 0}      color="text-yellow-400" />
        <StatCard label="Tránh 🔴"     value={summary.avoid || 0}      color="text-red-400" />
      </div>

      {/* Seasonal Alert */}
      {data?.seasonal_alert && (
        <div className="card border-yellow-700 bg-yellow-950/30">
          <p className="text-yellow-300 text-sm">
            📅 <strong>Mùa vụ:</strong> {data.seasonal_alert}
          </p>
        </div>
      )}

      {/* Macro Alert */}
      {data?.macro_alert && (
        <div className="card border-blue-700 bg-blue-950/30">
          <p className="text-blue-300 text-sm">
            🌍 <strong>Vĩ mô:</strong> {data.macro_alert}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 card">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Điểm tối thiểu:</label>
          <input type="range" min={0} max={100} value={minScore}
            onChange={e => setMinScore(+e.target.value)}
            className="w-24 accent-green-500" />
          <span className="text-sm font-mono text-green-400 w-6">{minScore}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                sector === s
                  ? 'border-green-500 text-green-400 bg-green-500/10'
                  : 'border-border text-gray-400 hover:border-gray-500'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      {isLoading ? <LoadingSpinner /> : isError ? <ErrorCard /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 px-3">Mã</th>
                <th className="text-left py-2 px-3">Tín hiệu</th>
                <th className="text-right py-2 px-3">Giá TT</th>
                <th className="text-right py-2 px-3">Thay đổi</th>
                <th className="text-left py-2 px-3 w-36">Điểm KT</th>
                <th className="text-left py-2 px-3 w-28">Mùa vụ</th>
                <th className="text-left py-2 px-3 w-24">Vĩ mô</th>
                <th className="text-right py-2 px-3">Mua</th>
                <th className="text-right py-2 px-3">Cut-loss</th>
                <th className="text-right py-2 px-3">TP1</th>
                <th className="text-right py-2 px-3">TP2</th>
                <th className="text-right py-2 px-3">TP3</th>
                <th className="text-left py-2 px-3">Ngành</th>
                <th className="text-center py-2 px-3">Lệnh</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => {
                const chg = s.change_pct || 0
                return (
                  <tr key={s.symbol}
                    className="border-b border-border/50 hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 cursor-pointer" onClick={() => navigate(`/stock/${s.symbol}`)}>
                      <span className="font-bold text-white font-mono hover:text-green-400">{s.symbol}</span>
                      <div className="text-xs text-gray-500 truncate max-w-[80px]">{s.company_name}</div>
                    </td>
                    <td className="py-2 px-3"><SignalBadge signal={s.signal} /></td>
                    <td className="py-2 px-3 text-right font-mono text-white font-semibold">
                      {s.price?.toLocaleString('vi-VN')}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${chg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {chg >= 0 ? '+' : ''}{chg?.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3">
                      <ScoreBar score={s.technical_score || 0} />
                    </td>
                    <td className="py-2 px-3">
                      <ScoreBar score={s.seasonal_score || 0} />
                    </td>
                    <td className="py-2 px-3">
                      <ScoreBar score={s.macro_score || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-400">
                      {s.buy_price?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-red-400">
                      {s.cutloss?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-green-400">
                      {s.tp1?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-green-400">
                      {s.tp2?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-300">
                      {s.tp3?.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-400">{s.sector}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/portfolio?buy=${s.symbol}&price=${s.price}`)
                        }}
                        className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xs transition-colors shadow">
                        Mua
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {stocks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Không có cổ phiếu nào đủ điều kiện với bộ lọc hiện tại
            </div>
          )}
        </div>
      )}
    </div>
  )
}
