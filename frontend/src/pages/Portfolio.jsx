import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Wallet, TrendingUp, TrendingDown, PlusCircle, MinusCircle, RefreshCw,
  RotateCcw, DollarSign, History, AlertCircle, ArrowUpRight, ArrowDownRight, Layers, Tag
} from 'lucide-react'
import { getPortfolio, buyStock, sellStock, resetPortfolio, getStock } from '../api'
import { LoadingSpinner, ErrorCard, StatCard } from '../components/ui'

export default function Portfolio() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  // Modal / Order form states
  const [modalType, setModalType] = useState(null) // 'BUY' | 'SELL' | null
  const [targetSymbol, setTargetSymbol] = useState('')
  const [shares, setShares] = useState(100)
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [customPrice, setCustomPrice] = useState('')
  const [currentMarketPrice, setCurrentMarketPrice] = useState(null)
  const [note, setNote] = useState('')
  const [orderError, setOrderError] = useState('')

  const { data: portfolio, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
    refetchInterval: 10000,
  })

  // Mutations
  const buyMutation = useMutation({
    mutationFn: buyStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      closeModal()
    },
    onError: (err) => {
      setOrderError(err.response?.data?.detail || err.message || 'Lỗi khi đặt lệnh mua')
    }
  })

  const sellMutation = useMutation({
    mutationFn: sellStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      closeModal()
    },
    onError: (err) => {
      setOrderError(err.response?.data?.detail || err.message || 'Lỗi khi đặt lệnh bán')
    }
  })

  const resetMutation = useMutation({
    mutationFn: resetPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    }
  })

  // Open Buy modal with pre-filled price if passed
  const openBuyModal = (sym = '', price = null) => {
    setModalType('BUY')
    setTargetSymbol(sym)
    setShares(100)
    setCurrentMarketPrice(price)
    setUseCustomPrice(false)
    setCustomPrice(price ? String(price) : '')
    setNote('')
    setOrderError('')
    if (sym && !price) {
      fetchPriceForSymbol(sym)
    }
  }

  const openSellModal = (sym, maxShares = 100, price = null) => {
    setModalType('SELL')
    setTargetSymbol(sym)
    setShares(maxShares)
    setCurrentMarketPrice(price)
    setUseCustomPrice(false)
    setCustomPrice(price ? String(price) : '')
    setNote('')
    setOrderError('')
    if (sym && !price) {
      fetchPriceForSymbol(sym)
    }
  }

  const fetchPriceForSymbol = async (sym) => {
    try {
      const data = await getStock(sym)
      if (data && data.current_price) {
        setCurrentMarketPrice(data.current_price)
      }
    } catch (e) {
      console.warn("Could not fetch price for", sym)
    }
  }

  // Handle URL parameters if coming from SignalBoard or StockDetail with ?buy=HPG&price=25500
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const buyParam = params.get('buy')
    const priceParam = params.get('price')
    if (buyParam) {
      openBuyModal(buyParam.toUpperCase(), priceParam ? parseFloat(priceParam) : null)
    }
  }, [location.search])

  const closeModal = () => {
    setModalType(null)
    setOrderError('')
  }

  const handleSubmitOrder = (e) => {
    e.preventDefault()
    setOrderError('')
    if (!targetSymbol) {
      setOrderError('Vui lòng nhập mã cổ phiếu')
      return
    }
    if (shares <= 0) {
      setOrderError('Số lượng cổ phiếu phải lớn hơn 0')
      return
    }

    const payload = {
      symbol: targetSymbol.toUpperCase().trim(),
      shares: parseInt(shares, 10),
      custom_price: useCustomPrice && customPrice ? parseFloat(customPrice) : (currentMarketPrice || null),
      note: note.trim()
    }

    if (modalType === 'BUY') {
      buyMutation.mutate(payload)
    } else {
      sellMutation.mutate(payload)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorCard message="Không thể tải danh mục đầu tư giả lập" />

  const {
    nav, cash, stock_value, cost_basis, total_pnl, total_pnl_pct,
    initial_capital, holdings = [], transactions = []
  } = portfolio || {}

  // Effective price used for total cost preview
  const effectivePrice = useCustomPrice && customPrice
    ? parseFloat(customPrice)
    : (currentMarketPrice || 0)
  const estimatedTotal = effectivePrice * (parseInt(shares, 10) || 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-green-400" /> Quản lý Danh mục & Mua bán Giả lập (Paper Trading)
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Tự động tải giá chốt phiên mới nhất của cổ phiếu — Bạn chỉ cần nhập số lượng là có thể giải ngân hoặc bán chốt lời/cắt lỗ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openBuyModal()}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors">
            <PlusCircle className="w-4 h-4" /> Đặt lệnh Mua
          </button>
          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn đặt lại tài khoản giả lập về số dư 500,000,000 ₫?')) {
                resetMutation.mutate({ capital: 500000000 })
              }
            }}
            className="p-2 border border-border rounded-lg text-gray-400 hover:text-red-400 hover:border-red-500 transition-colors"
            title="Đặt lại tài khoản">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Account Balance Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Tổng Tài Sản (NAV)"
          value={`${nav?.toLocaleString('vi-VN')} ₫`}
          sub={`Vốn ban đầu: ${initial_capital?.toLocaleString('vi-VN')} ₫`}
          color="text-white"
        />
        <StatCard
          label="Tiền mặt khả dụng"
          value={`${cash?.toLocaleString('vi-VN')} ₫`}
          sub="Sẵn sàng giải ngân"
          color="text-blue-400"
        />
        <StatCard
          label="Giá trị cổ phiếu"
          value={`${stock_value?.toLocaleString('vi-VN')} ₫`}
          sub={`Giá vốn: ${cost_basis?.toLocaleString('vi-VN')} ₫`}
          color="text-yellow-400"
        />
        <StatCard
          label="Tổng Lãi / Lỗ"
          value={`${total_pnl >= 0 ? '+' : ''}${total_pnl?.toLocaleString('vi-VN')} ₫`}
          sub={`${total_pnl >= 0 ? '+' : ''}${total_pnl_pct}%`}
          color={total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* Holdings Section (Danh mục cổ phiếu đang nắm giữ) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-400" /> Cổ phiếu đang nắm giữ ({holdings.length})
          </h2>
          <span className="text-xs text-gray-500">Cập nhật tự động theo giá thị trường</span>
        </div>

        {holdings.length === 0 ? (
          <div className="card text-center py-10 space-y-3">
            <p className="text-gray-400 text-sm">Danh mục hiện đang trống. Bạn chưa nắm giữ cổ phiếu nào.</p>
            <button
              onClick={() => openBuyModal()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 border border-green-500/40 bg-green-500/10 px-3 py-1.5 rounded-lg hover:bg-green-500/20">
              <PlusCircle className="w-4 h-4" /> Mua cổ phiếu đầu tiên
            </button>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-500 text-xs uppercase">
                  <th className="text-left py-2.5 px-3">Mã</th>
                  <th className="text-right py-2.5 px-3">Số lượng</th>
                  <th className="text-right py-2.5 px-3">Giá vốn TB</th>
                  <th className="text-right py-2.5 px-3">Giá hiện tại</th>
                  <th className="text-right py-2.5 px-3">Tổng giá trị</th>
                  <th className="text-right py-2.5 px-3">Lãi/Lỗ chưa chốt</th>
                  <th className="text-center py-2.5 px-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const isProfit = h.unrealized_pnl >= 0
                  return (
                    <tr key={h.symbol} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => navigate(`/stock/${h.symbol}`)}
                          className="cursor-pointer">
                          <span className="font-bold text-white font-mono hover:text-green-400">{h.symbol}</span>
                          <div className="text-xs text-gray-500">{h.company_name}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">
                        {h.shares?.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                        {h.avg_price?.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white font-bold">
                        {h.current_price?.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">
                        {h.market_value?.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <div className={`font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{h.unrealized_pnl?.toLocaleString('vi-VN')} ₫
                        </div>
                        <div className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{h.unrealized_pnl_pct}%
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openBuyModal(h.symbol, h.current_price)}
                            className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2 py-1 rounded font-semibold">
                            Mua thêm
                          </button>
                          <button
                            onClick={() => openSellModal(h.symbol, h.shares, h.current_price)}
                            className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded font-semibold">
                            Bán
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" /> Lịch sử giao dịch gần đây
        </h2>

        {transactions.length === 0 ? (
          <div className="card text-center py-6 text-gray-500 text-xs">
            Chưa có giao dịch mua/bán nào được thực hiện.
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Thời gian</th>
                  <th className="text-left py-2 px-3">Lệnh</th>
                  <th className="text-left py-2 px-3">Mã</th>
                  <th className="text-right py-2 px-3">Khối lượng</th>
                  <th className="text-right py-2 px-3">Giá khớp</th>
                  <th className="text-right py-2 px-3">Tổng giá trị</th>
                  <th className="text-right py-2 px-3">Lãi/Lỗ chốt</th>
                  <th className="text-left py-2 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isBuy = tx.type === 'BUY'
                  return (
                    <tr key={tx.id} className="border-b border-border/40 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 text-gray-400">{tx.timestamp}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isBuy ? 'MUA' : 'BÁN'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-white">{tx.symbol}</td>
                      <td className="py-2 px-3 text-right font-mono text-gray-300">{tx.shares?.toLocaleString('vi-VN')}</td>
                      <td className="py-2 px-3 text-right font-mono text-white">{tx.price?.toLocaleString('vi-VN')} ₫</td>
                      <td className="py-2 px-3 text-right font-mono text-white font-semibold">{tx.total_amount?.toLocaleString('vi-VN')} ₫</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {tx.realized_pnl !== undefined ? (
                          <span className={tx.realized_pnl >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {tx.realized_pnl >= 0 ? '+' : ''}{tx.realized_pnl?.toLocaleString('vi-VN')} ₫
                          </span>
                        ) : (
                          <span className="text-gray-500">---</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-400">{tx.note || '---'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Buy / Sell Form with Automatic Price Display */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="card w-full max-w-md border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {modalType === 'BUY' ? (
                  <><PlusCircle className="text-green-400" /> Đặt lệnh Mua Giả lập</>
                ) : (
                  <><MinusCircle className="text-red-400" /> Đặt lệnh Bán Giả lập</>
                )}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            {orderError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs">
                {orderError}
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-4 text-sm">
              {/* Symbol Input with Quick Price Fetch */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mã cổ phiếu:</label>
                <input
                  type="text"
                  value={targetSymbol}
                  onChange={e => {
                    const sym = e.target.value.toUpperCase()
                    setTargetSymbol(sym)
                    if (sym.length >= 3) {
                      fetchPriceForSymbol(sym)
                    }
                  }}
                  placeholder="VD: HPG, FPT, VCB..."
                  required
                  className="w-full bg-dark border border-border rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-green-500 uppercase text-base"
                />
              </div>

              {/* Display Current Live/Close Price */}
              <div className="p-3 bg-dark/70 rounded-lg border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Giá khớp phiên gần nhất (Thị giá thực):</span>
                  <div className="text-xl font-bold font-mono text-green-400 mt-0.5">
                    {currentMarketPrice ? `${currentMarketPrice.toLocaleString('vi-VN')} ₫` : 'Đang lấy giá thị trường...'}
                  </div>
                </div>
                <Tag className="w-5 h-5 text-gray-500" />
              </div>

              {/* Shares Input */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Số lượng cổ phiếu muốn mua (Lô 100):</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={shares}
                    onChange={e => setShares(e.target.value)}
                    required
                    className="flex-1 bg-dark border border-border rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-green-500 text-base"
                  />
                  {/* Quick Share Buttons */}
                  <div className="flex gap-1">
                    {[100, 500, 1000, 5000].map(qty => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setShares(qty)}
                        className={`text-xs px-2 py-1.5 rounded border border-border font-mono transition-colors ${
                          parseInt(shares, 10) === qty ? 'bg-green-500/20 text-green-400 border-green-500 font-bold' : 'text-gray-400 hover:text-white'
                        }`}>
                        {qty >= 1000 ? `${qty/1000}k` : qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimated Total Calculation */}
              {estimatedTotal > 0 && (
                <div className="flex justify-between items-center text-xs px-1 text-gray-400">
                  <span>Ước tính giá trị khớp:</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {estimatedTotal.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              )}

              {/* Custom Price Switch (Optional if user wants other prices) */}
              <div className="p-2.5 bg-dark/40 rounded-lg border border-border/60 space-y-2">
                <label className="text-xs text-gray-400 cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCustomPrice}
                    onChange={e => setUseCustomPrice(e.target.checked)}
                    className="accent-green-500"
                  />
                  Chỉnh sửa giá khớp riêng (nếu không dùng giá chốt phiên)
                </label>

                {useCustomPrice && (
                  <input
                    type="number"
                    step="50"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="Nhập giá VNĐ tùy chọn"
                    required
                    className="w-full bg-dark border border-border rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-green-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Ghi chú (Tùy chọn):</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú kế hoạch đầu tư..."
                  className="w-full bg-dark border border-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 rounded-lg border border-border text-gray-400 hover:bg-white/5 font-semibold text-xs">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={buyMutation.isPending || sellMutation.isPending}
                  className={`flex-1 py-2 rounded-lg text-white font-bold text-xs ${
                    modalType === 'BUY'
                      ? 'bg-green-600 hover:bg-green-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}>
                  {buyMutation.isPending || sellMutation.isPending ? 'Đang gửi lệnh...' : modalType === 'BUY' ? 'Xác nhận Mua' : 'Xác nhận Bán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
