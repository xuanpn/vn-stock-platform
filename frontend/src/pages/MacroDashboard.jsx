import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Globe, Fuel, DollarSign, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react'
import { getMacro } from '../api'
import { LoadingSpinner, ErrorCard, StatCard } from '../components/ui'

export default function MacroDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['macro'],
    queryFn: getMacro,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorCard message="Không thể tải dữ liệu vĩ mô." />

  const { oil_price, usd_index, gold_price, vnindex, active_catalysts } = data || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe className="text-blue-400" /> Bảng phân tích Vĩ mô & Địa chính trị (Macro Catalyst)
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Theo dõi real-time giá dầu thô Brent, chỉ số USD/VND, vàng thế giới, lãi suất & tác động trực tiếp tới các nhóm ngành chứng khoán Việt Nam.
        </p>
      </div>

      {/* Global Macro Tickers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Dầu thô Brent (USD/thùng)"
          value={`$${oil_price?.price || '---'}`}
          sub={oil_price?.change_pct ? `${oil_price.change_pct >= 0 ? '+' : ''}${oil_price.change_pct}%` : 'yfinance live'}
          color="text-yellow-400"
        />
        <StatCard
          label="Chỉ số Dollar Index (DXY)"
          value={usd_index?.price || '---'}
          sub="Áp lực tỷ giá USD/VND"
          color="text-blue-400"
        />
        <StatCard
          label="Vàng thế giới (Gold Oz)"
          value={`$${gold_price?.price || '---'}`}
          sub="Tâm lý phòng thủ / Chiến sự"
          color="text-amber-300"
        />
        <StatCard
          label="VN-Index"
          value={vnindex?.close?.toLocaleString('vi-VN') || '1,280'}
          sub="Chỉ số thị trường chung"
          color="text-green-400"
        />
      </div>

      {/* Active Catalysts & Geopolitics */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldAlert className="text-red-400 w-5 h-5" /> Các biến số Vĩ mô & Xung đột đang kích hoạt
        </h2>

        {active_catalysts && active_catalysts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active_catalysts.map(cat => (
              <div key={cat.description} className="card border-blue-500/40 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{cat.description}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    +{cat.score_boost} điểm tín hiệu
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-green-400 font-semibold block mb-1">✅ Nhóm cổ phiếu hưởng lợi:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.beneficiaries?.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-green-300 font-mono font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {cat.victims && cat.victims.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <span className="text-red-400 font-semibold block mb-1">⚠️ Nhóm chịu áp lực / Rủi ro:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.victims?.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 font-mono font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8 text-gray-500 text-sm">
            Hiện không có biến động vĩ mô cực đoan đột biến nào đang tác động tiêu cực đến thị trường.
          </div>
        )}
      </div>
    </div>
  )
}
