import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Star, TrendingUp } from 'lucide-react'
import { getWatchlist } from '../api'
import { SignalBadge, ScoreBar, LoadingSpinner, ErrorCard } from '../components/ui'

export default function Watchlist() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
  })

  const stocks = data?.stocks || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="text-yellow-400 fill-yellow-400" /> Danh mục theo dõi trọng điểm (Watchlist)
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Các mã cổ phiếu ưu tiên hàng đầu thị trường, cập nhật tín hiệu và điểm khuyến nghị liên tục trong phiên.
        </p>
      </div>

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
                <th className="text-right py-2.5 px-3">Mục tiêu 1</th>
                <th className="text-right py-2.5 px-3">Mục tiêu 2</th>
                <th className="text-right py-2.5 px-3">Mục tiêu 3</th>
                <th className="text-left py-2.5 px-3 w-32">Tổng điểm</th>
                <th className="text-left py-2.5 px-3">Ngành</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr
                  key={s.symbol}
                  onClick={() => navigate(`/stock/${s.symbol}`)}
                  className="border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-white font-mono">{s.symbol}</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
