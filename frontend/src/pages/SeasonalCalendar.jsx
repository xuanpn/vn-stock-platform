import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { getSeasonal } from '../api'
import { LoadingSpinner, ErrorCard } from '../components/ui'

export default function SeasonalCalendar() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['seasonal'],
    queryFn: getSeasonal,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorCard message="Không thể tải dữ liệu chu kỳ mùa vụ." />

  const { current_month, month_name, active_events, calendar } = data || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-yellow-400" /> Bản đồ chu kỳ mùa vụ & Thời điểm lịch sử
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Thống kê xác suất tăng điểm qua các mốc thời điểm năm trước: Tết Nguyên Đán, cuối năm tài chính, mùa ĐHCĐ và sóng vĩ mô.
        </p>
      </div>

      {/* Active Now Banner */}
      <div className="card border-yellow-600/50 bg-gradient-to-r from-yellow-950/40 via-card to-card p-5">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-2">
          <Clock className="w-4 h-4" /> THỜI ĐIỂM HIỆN TẠI: THÁNG {current_month} ({month_name})
        </div>
        {active_events && active_events.length > 0 ? (
          <div className="space-y-3">
            {active_events.map(ev => (
              <div key={ev.name} className="p-3 bg-dark/70 rounded-lg border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">{ev.name}</h3>
                  <p className="text-xs text-gray-300 mt-0.5">{ev.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ev.symbols?.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-300 font-mono font-bold text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-xs text-gray-400 block">Xác suất thắng (Win rate)</span>
                    <span className="text-xl font-bold font-mono text-green-400">{ev.win_rate}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">LN trung bình</span>
                    <span className="text-xl font-bold font-mono text-green-400">+{ev.avg_return}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Hiện đang là giai đoạn tích lũy bình thường, không có sóng mùa vụ cao điểm đột biến.</p>
        )}
      </div>

      {/* Full 12-Month Calendar */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Lịch trình sóng cổ phiếu theo các tháng trong năm</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendar?.map(item => (
            <div key={item.key} className={`card ${item.is_active ? 'border-yellow-500/60 ring-1 ring-yellow-500/40' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-gray-400">THÁNG {item.months.join(', ')}</span>
                {item.is_active && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-yellow-500 text-black">
                    ĐANG DIỄN RA
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mb-1">{item.name}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 mb-3">{item.description}</p>
              
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span className="text-gray-400">Lợi nhuận TB: <strong className="text-green-400 font-mono">+{item.avg_return}%</strong></span>
                <span className="text-gray-400">Xác suất: <strong className="text-green-400 font-mono">{item.win_rate}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
