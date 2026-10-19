import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, TrendingUp, ShieldCheck, Calendar, Activity, DollarSign, Award, Target } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts'
import { getStock } from '../api'
import { SignalBadge, ScoreBar, PriceTargetCard, LoadingSpinner, ErrorCard, StatCard } from '../components/ui'

export default function StockDetail() {
  const { symbol } = useParams()
  const [activeTab, setActiveTab] = useState('technical')

  const { data: stock, isLoading, isError } = useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => getStock(symbol),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError || !stock) return <ErrorCard message={`Không tìm thấy thông tin cho mã ${symbol}`} />

  const {
    company_name, sector, exchange, current_price, change_pct, score, signal,
    score_breakdown, targets, technical_indicators: tech, financials: fin,
    seasonal_backtest: seasonal, historical_comparison: hist, chart_data
  } = stock

  const ratios = fin?.ratios || {}

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-card border border-border rounded-lg hover:border-gray-500 text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white font-mono">{stock.symbol}</h1>
              <SignalBadge signal={signal} />
              <span className="text-xs text-gray-400 bg-border/50 px-2 py-0.5 rounded">{exchange}</span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{company_name} · <span className="text-green-400">{sector}</span></p>
          </div>
        </div>

        {/* Live Price Tag & Fast Paper Buy Button */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {current_price?.toLocaleString('vi-VN')} <span className="text-sm sm:text-lg font-normal text-gray-400">₫</span>
            </div>
            <div className={`text-xs sm:text-sm font-mono font-semibold ${change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change_pct >= 0 ? '+' : ''}{change_pct}%
            </div>
          </div>
          <Link
            to="/portfolio"
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors">
            <Target className="w-4 h-4" /> Mua giả lập
          </Link>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Breakdown Card */}
        <div className="card space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-semibold text-gray-300">Điểm đánh giá thông minh</h3>
            <span className="text-2xl font-mono font-bold text-green-400">{score}/100</span>
          </div>
          <ScoreBar score={score_breakdown?.technical_score || 0} label="Kỹ thuật (65đ)" />
          <ScoreBar score={score_breakdown?.seasonal_score || 0} label="Mùa vụ (15đ)" />
          <ScoreBar score={score_breakdown?.macro_score || 0} label="Vĩ mô (10đ)" />
          <ScoreBar score={score_breakdown?.financial_score || 0} label="Nội tại (10đ)" />
        </div>

        {/* Price Targets Card */}
        <PriceTargetCard
          buy={targets?.buy_price}
          cutloss={targets?.cutloss}
          tp1={targets?.tp1}
          tp2={targets?.tp2}
          tp3={targets?.tp3}
          current={current_price}
        />

        {/* Moat & Advice Card */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-semibold mb-2">
              <Award className="w-4 h-4" /> Lợi thế cạnh tranh (Economic Moat)
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              {fin?.moat || "Doanh nghiệp có vị thế đầu ngành, thương hiệu uy tín và mạng lưới phân phối rộng lớn."}
            </p>
            <div className="text-xs text-gray-400">
              <strong className="text-gray-300">Chiến lược đề xuất: </strong>
              {targets?.holding_time_advice}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs font-mono">
            <span className="text-gray-500">Risk/Reward TP1:</span>
            <span className="text-green-400 font-bold">{targets?.risk_reward_ratio}:1</span>
          </div>
        </div>
      </div>

      {/* Interactive Price Chart */}
      <div className="card space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" /> Biểu đồ giá & khối lượng (120 phiên gần nhất)
          </h3>
          <span className="text-xs text-gray-500 font-mono">Đơn vị: VNĐ</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart_data}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c087" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00c087" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22272e" />
              <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }}
                formatter={(val) => [Number(val).toLocaleString('vi-VN') + ' ₫', 'Giá đóng cửa']}
              />
              <Area type="monotone" dataKey="close" stroke="#00c087" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs Section: Technical vs Seasonal vs Financials */}
      <div className="space-y-4">
        <div className="flex border-b border-border gap-4">
          <button
            onClick={() => setActiveTab('technical')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'technical' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            Chỉ báo Kỹ thuật
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'seasonal' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            Lịch sử Thời điểm & Mùa vụ
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'financials' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            Báo cáo Tài chính & Định giá
          </button>
        </div>

        {/* Tab 1: Technical */}
        {activeTab === 'technical' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="RSI (14)" value={tech?.rsi?.toFixed(1) || '---'} sub={tech?.rsi < 35 ? 'Vùng quá bán' : tech?.rsi > 70 ? 'Vùng quá mua' : 'Trung tính / Tích lũy'} color="text-yellow-400" />
            <StatCard label="Xu hướng (Trend)" value={tech?.trend === 'strong_uptrend' ? 'TĂNG MẠNH' : tech?.trend === 'uptrend' ? 'TĂNG TRƯỞNG' : 'ĐI NGANG'} sub="Dựa trên MA20/50/200" color="text-green-400" />
            <StatCard label="Khối lượng vs MA20" value={`${tech?.vol_ma_ratio?.toFixed(2)}x` || '---'} sub={tech?.vol_ma_ratio > 1.3 ? 'Dòng tiền đột biến' : 'Bình thường'} color="text-blue-400" />
            <StatCard label="Bollinger Bands" value={tech?.bb_position < 0.35 ? 'Gần dải dưới' : tech?.bb_position > 0.75 ? 'Gần dải trên' : 'Giữa dải'} sub="Vị thế giá hiện tại" />
          </div>
        )}

        {/* Tab 2: Seasonal Pattern & Historical Date Comparison */}
        {activeTab === 'seasonal' && (
          <div className="space-y-4">
            {/* Same Date Historical Comparison Module (Ngày này năm ngoái, 2 năm trước & 2 tuần qua) */}
            <div className="card space-y-3 border-yellow-500/40 bg-gradient-to-br from-yellow-950/20 via-card to-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                  <Calendar className="w-4 h-4" /> So sánh lịch sử giá Ngày này các năm trước & 2 Tuần gần nhất
                </div>
                <span className="text-xs font-mono text-gray-400">
                  Mốc đối chiếu ngày hiện tại: <strong className="text-white">{hist?.current_date || 'Hôm nay'}</strong> ({current_price?.toLocaleString('vi-VN')} ₫)
                </span>
              </div>

              {/* 3 Benchmark Cards: 2 Weeks ago, 1 Year ago, 2 Years ago */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 2 Weeks Ago */}
                <div className="p-3 bg-dark/70 rounded-lg border border-border flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                      2 Tuần gần nhất ({hist?.two_weeks_ago?.date || '14 ngày trước'})
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {hist?.two_weeks_ago?.price?.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Biến động 2 tuần:</span>
                    <span className={`text-sm font-mono font-bold ${
                      (hist?.two_weeks_ago?.change_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(hist?.two_weeks_ago?.change_pct || 0) >= 0 ? '+' : ''}{hist?.two_weeks_ago?.change_pct}%
                    </span>
                  </div>
                </div>

                {/* 1 Year Ago (Same calendar date last year) */}
                <div className="p-3 bg-dark/70 rounded-lg border border-border flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                      Ngày này 1 năm trước ({hist?.one_year_ago?.date || 'Cùng kỳ 1Y'})
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {hist?.one_year_ago?.price?.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-gray-400">So với 1 năm trước:</span>
                    <span className={`text-sm font-mono font-bold ${
                      (hist?.one_year_ago?.change_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(hist?.one_year_ago?.change_pct || 0) >= 0 ? '+' : ''}{hist?.one_year_ago?.change_pct}%
                    </span>
                  </div>
                </div>

                {/* 2 Years Ago (Same calendar date 2 years ago) */}
                <div className="p-3 bg-dark/70 rounded-lg border border-border flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                      Ngày này 2 năm trước ({hist?.two_years_ago?.date || 'Cùng kỳ 2Y'})
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {hist?.two_years_ago?.price?.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-gray-400">So với 2 năm trước:</span>
                    <span className={`text-sm font-mono font-bold ${
                      (hist?.two_years_ago?.change_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(hist?.two_years_ago?.change_pct || 0) >= 0 ? '+' : ''}{hist?.two_years_ago?.change_pct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Week Daily Trend Chart */}
              {hist?.recent_two_weeks_trend && hist.recent_two_weeks_trend.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-gray-400 block mb-1">Diễn biến giá hàng ngày trong 2 tuần gần nhất:</span>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hist.recent_two_weeks_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#22272e" />
                        <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} />
                        <YAxis domain={['auto', 'auto']} stroke="#666" tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '6px' }}
                          formatter={(v) => [`${Number(v).toLocaleString('vi-VN')} ₫`, 'Giá']}
                        />
                        <Area type="monotone" dataKey="close" stroke="#eab308" strokeWidth={2} fill="#eab308" fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* General Seasonal Pattern Summary */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
                <Calendar className="w-4 h-4" /> Thống kê chu kỳ mùa vụ lịch sử 5 năm
              </div>
              <p className="text-xs text-gray-300">
                Đánh giá xác suất thắng khi đầu tư mã <strong>{stock.symbol}</strong> tại các mốc thời điểm vàng trong năm:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-dark/60 rounded-lg border border-border">
                  <span className="text-xs text-gray-400 uppercase">Tỷ lệ thắng lịch sử (Win Rate)</span>
                  <div className="text-2xl font-bold font-mono text-green-400 mt-1">{seasonal?.win_rate || 68}%</div>
                  <div className="text-xs text-gray-500 mt-1">Các năm tăng điểm trong cùng thời điểm</div>
                </div>
                <div className="p-3 bg-dark/60 rounded-lg border border-border">
                  <span className="text-xs text-gray-400 uppercase">Lợi nhuận bình quân</span>
                  <div className="text-2xl font-bold font-mono text-green-400 mt-1">+{seasonal?.avg_return || 8.5}%</div>
                  <div className="text-xs text-gray-500 mt-1">Mức tăng trung bình sau 4-8 tuần</div>
                </div>
                <div className="p-3 bg-dark/60 rounded-lg border border-border">
                  <span className="text-xs text-gray-400 uppercase">Mùa cao điểm lịch sử</span>
                  <div className="text-base font-bold text-yellow-400 mt-1">{seasonal?.best_period || 'Tháng 11 - Tháng 2'}</div>
                  <div className="text-xs text-gray-500 mt-1">{seasonal?.driver || 'Sóng tiêu dùng Tết & Chốt sổ tài chính'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Financials */}
        {activeTab === 'financials' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="P/E" value={ratios.pe || '---'} sub="Hệ số định giá P/E" color="text-green-400" />
              <StatCard label="P/B" value={ratios.pb || '---'} sub="Giá trên giá trị sổ sách" />
              <StatCard label="ROE (%)" value={`${ratios.roe}%` || '---'} sub="Tỷ suất sinh lời trên vốn" color="text-yellow-400" />
              <StatCard label="Tăng trưởng LN" value={`+${ratios.profit_growth}%` || '---'} sub="So với cùng kỳ năm trước" color="text-blue-400" />
            </div>

            {/* Income statement 5-yr table */}
            <div className="card overflow-x-auto">
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-3">Kết quả kinh doanh 5 năm gần nhất (Tỷ VNĐ)</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-gray-500 text-left">
                    <th className="py-1.5">Chỉ tiêu</th>
                    {fin?.income_statement?.map(item => (
                      <th key={item.year} className="py-1.5 text-right font-mono">{item.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 text-gray-300">Doanh thu thuần</td>
                    {fin?.income_statement?.map(item => (
                      <td key={item.year} className="py-1.5 text-right font-mono text-white">{item.revenue?.toLocaleString('vi-VN')}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 text-gray-300">Lợi nhuận ròng</td>
                    {fin?.income_statement?.map(item => (
                      <td key={item.year} className="py-1.5 text-right font-mono text-green-400 font-semibold">{item.net_profit?.toLocaleString('vi-VN')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-300">EPS (đồng)</td>
                    {fin?.income_statement?.map(item => (
                      <td key={item.year} className="py-1.5 text-right font-mono text-yellow-300">{item.eps?.toLocaleString('vi-VN')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
