'use client'

import { useEffect, useState, useMemo } from 'react'
import { formatCurrency, CATEGORY_ICONS } from '@/lib/utils'

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  paidBy: string
  splitType: string
  parcelas?: number
  parcelaAtual?: number
  date: string
}

interface InstallmentGroup {
  description: string
  parcelas: number
  monthlyAmount: number
  totalParcelado: number
  splitType: string
  paidBy: string
  category: string
  futureIds: string[]
  withdrawnCount: number
  futureCount: number
  withdrawnAmount: number
  futureAmount: number
}

interface CategoryBreakdown {
  category: string
  total: number
}

interface MonthlyBreakdown {
  month: string
  total: number
}

interface CarteiraData {
  period: string
  totalWithdrawn: number
  totalFuture: number
  transactionCount: number
  installmentGroups: InstallmentGroup[]
  categoryBreakdown: CategoryBreakdown[]
  categoryBreakdownFull: CategoryBreakdown[]
  monthlyBreakdown: MonthlyBreakdown[]
  transactions: Transaction[]
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function generateMonthOptions() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      label: `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    }
  })
}

export default function Carteira() {
  const [period, setPeriod] = useState('all')
  const [data, setData] = useState<CarteiraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingGroup, setCancellingGroup] = useState<string | null>(null)
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentGroup | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const monthOptions = useMemo(() => generateMonthOptions(), [])

  const fetchData = async (p: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/carteira?period=${p}`, {
        signal: AbortSignal.timeout(12000),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(period) }, [period])
  useEffect(() => { setSelectedCategory(null) }, [period])

  const cancelGroup = async (group: InstallmentGroup) => {
    if (!confirm(`Cancelar as ${group.futureIds.length} parcelas restantes de "${group.description}"?`)) return
    setCancellingGroup(group.description)
    try {
      await Promise.all(
        group.futureIds.map((id) =>
          fetch(`/api/expenses/${id}`, { method: 'DELETE', signal: AbortSignal.timeout(12000) })
        )
      )
      await fetchData(period)
    } catch {
      setError('Erro ao cancelar parcelas.')
    } finally {
      setCancellingGroup(null)
    }
  }

  const filteredTransactions = useMemo(() => {
    if (!data) return []
    return selectedCategory
      ? data.transactions.filter((t) => t.category === selectedCategory)
      : data.transactions
  }, [data, selectedCategory])

  const periodLabel = useMemo(() => {
    if (period === 'all') return 'Total geral'
    if (period === 'month') return 'Este mês'
    const found = monthOptions.find((m) => m.value === period)
    return found ? found.label : period
  }, [period, monthOptions])

  return (
    <div className="py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Carteira</h1>
        <p className="text-emerald-600 text-sm">Resumo financeiro</p>
      </div>

      {/* Period filter — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { label: 'Tudo', value: 'all' },
          { label: 'Este mês', value: 'month' },
          ...monthOptions.slice(1),
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              period === opt.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-emerald-100 hover:border-emerald-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600" />
        </div>
      ) : data && (
        <>
          {/* Top row: bank card + installments */}
          <div className="flex gap-3 items-stretch">
            {/* Bank card */}
            <div className="w-[46%] flex-shrink-0">
              <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 rounded-2xl p-4 text-white shadow-lg h-full overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />

                {/* Chip */}
                <div className="relative w-7 h-5 bg-yellow-300/80 rounded-sm mb-3 overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-yellow-600/40" />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-yellow-600/40" />
                </div>

                <p className="text-emerald-200 text-[10px] font-medium uppercase tracking-wide">Retirado</p>
                <p className="text-xl font-bold leading-tight mt-0.5">
                  {formatCurrency(data.totalWithdrawn)}
                </p>

                <p className="text-emerald-200 text-[10px] mt-2">{periodLabel}</p>
                <p className="text-emerald-100 text-[10px] mt-0.5">{data.transactionCount} transações</p>

                {data.totalFuture > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/20">
                    <p className="text-emerald-200 text-[10px]">Comprometido</p>
                    <p className="text-white text-sm font-bold">{formatCurrency(data.totalFuture)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Installments panel */}
            <div className="flex-1 min-w-0 flex flex-col">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Parcelamentos</p>
              {data.installmentGroups.length === 0 ? (
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-emerald-50 flex-1 flex items-center justify-center">
                  <p className="text-xs text-gray-400 text-center">Sem<br/>parcelamentos</p>
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1" style={{ maxHeight: 200 }}>
                  {data.installmentGroups.map((g, i) => {
                    const isDone = g.futureCount === 0
                    const pct = (g.withdrawnCount / g.parcelas) * 100
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedInstallment(g)}
                        className="w-full text-left bg-white rounded-xl px-2.5 py-2 shadow-sm border border-emerald-50 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm flex-shrink-0">{CATEGORY_ICONS[g.category] || '📦'}</span>
                          <p className="text-xs font-semibold text-gray-800 truncate flex-1">{g.description}</p>
                          <span className={`text-[10px] font-bold flex-shrink-0 ${isDone ? 'text-emerald-600' : 'text-indigo-500'}`}>
                            {g.withdrawnCount}/{g.parcelas}x
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${isDone ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                            style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Category filter pills */}
          {data.categoryBreakdown.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Por categoria</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    !selectedCategory
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  Tudo · {formatCurrency(data.totalWithdrawn)}
                </button>
                {data.categoryBreakdown.map(({ category, total }) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedCategory === category
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <span>{CATEGORY_ICONS[category] || '📦'}</span>
                    <span>{category}</span>
                    <span className={`font-normal ${selectedCategory === category ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {formatCurrency(total)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transaction list */}
          {filteredTransactions.length > 0 ? (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">
                {selectedCategory ?? 'Todas as transações'}
                <span className="font-normal text-gray-400 ml-1">({filteredTransactions.length})</span>
              </p>
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
                {filteredTransactions.map((t, i) => {
                  const date = new Date(t.date)
                  const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <span className="text-xl w-8 text-center flex-shrink-0">{CATEGORY_ICONS[t.category] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">
                          {dateStr}
                          {t.parcelas && t.parcelaAtual && (
                            <span className="text-indigo-500 ml-1">· {t.parcelaAtual}/{t.parcelas}x</span>
                          )}
                          {(t.splitType === 'user1_only' || t.splitType === 'user2_only') && (
                            <span className="text-emerald-500 ml-1">· Só você</span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 flex-shrink-0">-{formatCurrency(t.amount)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : data.transactions.length > 0 ? (
            <div className="bg-white rounded-2xl py-8 text-center shadow-sm border border-emerald-50">
              <p className="text-gray-400 text-sm">Nenhuma transação em {selectedCategory}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl py-16 text-center shadow-sm border border-emerald-50">
              <p className="text-4xl mb-3">👛</p>
              <p className="text-gray-500 font-medium">Nenhum gasto registrado</p>
              <p className="text-gray-400 text-sm mt-1">no período selecionado</p>
            </div>
          )}
        </>
      )}

      {/* Installment detail modal */}
      {selectedInstallment && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedInstallment(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_ICONS[selectedInstallment.category] || '📦'}</span>
                <div>
                  <p className="font-bold text-gray-800 leading-tight">{selectedInstallment.description}</p>
                  <p className="text-xs text-gray-400">{selectedInstallment.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInstallment(null)}
                className="text-gray-300 hover:text-gray-500 transition-colors text-2xl leading-none mt-0.5"
              >
                ×
              </button>
            </div>

            {/* Status badge */}
            <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold mb-4 ${
              selectedInstallment.futureCount === 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {selectedInstallment.futureCount === 0
                ? '✅ Quitado'
                : `📅 ${selectedInstallment.withdrawnCount}/${selectedInstallment.parcelas}x · ${selectedInstallment.futureCount} restantes`}
            </span>

            {/* Progress bar */}
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{selectedInstallment.withdrawnCount} pagas</span>
              <span>{formatCurrency(selectedInstallment.monthlyAmount)}/mês</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  selectedInstallment.futureCount === 0 ? 'bg-emerald-500' : 'bg-indigo-400'
                }`}
                style={{ width: `${(selectedInstallment.withdrawnCount / selectedInstallment.parcelas) * 100}%` }}
              />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Retirado</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{formatCurrency(selectedInstallment.withdrawnAmount)}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Restante</p>
                <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(selectedInstallment.futureAmount)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total</p>
                <p className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(selectedInstallment.totalParcelado)}</p>
              </div>
            </div>

            {/* Cancel button */}
            {selectedInstallment.futureIds.length > 0 && (
              <button
                onClick={() => {
                  cancelGroup(selectedInstallment)
                  setSelectedInstallment(null)
                }}
                disabled={cancellingGroup === selectedInstallment.description}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {cancellingGroup === selectedInstallment.description
                  ? 'Cancelando...'
                  : `🗑️ Cancelar ${selectedInstallment.futureIds.length} parcelas restantes`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
