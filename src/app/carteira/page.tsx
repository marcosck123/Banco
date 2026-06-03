'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, CATEGORY_ICONS } from '@/lib/utils'

type Period = 'month' | '3m' | '6m' | 'all'

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
  monthlyBreakdown: MonthlyBreakdown[]
  transactions: Transaction[]
}

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Este mês',
  '3m': '3 meses',
  '6m': '6 meses',
  all: 'Tudo',
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthLabel(key: string) {
  const [, m] = key.split('-')
  return MONTH_NAMES[parseInt(m) - 1]
}

export default function Carteira() {
  const [period, setPeriod] = useState<Period>('all')
  const [data, setData] = useState<CarteiraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingGroup, setCancellingGroup] = useState<string | null>(null)

  const fetchData = async (p: Period) => {
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

  const maxMonthly = data
    ? Math.max(...data.monthlyBreakdown.map((m) => m.total), 1)
    : 1

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Carteira</h1>
        <p className="text-emerald-600 text-sm">Resumo financeiro</p>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              period === p
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-emerald-100 hover:border-emerald-300'
            }`}
          >
            {PERIOD_LABELS[p]}
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
          {/* Main totals */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-emerald-100 text-sm">Total retirado da conta</p>
            <p className="text-4xl font-bold mt-1">{formatCurrency(data.totalWithdrawn)}</p>
            <p className="text-emerald-200 text-xs mt-1">{data.transactionCount} transações</p>

            {data.totalFuture > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                <div>
                  <p className="text-emerald-100 text-xs">Comprometido futuro</p>
                  <p className="text-white font-bold text-lg">{formatCurrency(data.totalFuture)}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-100 text-xs">Parcelas a vencer</p>
                  <p className="text-white font-bold text-lg">
                    {data.installmentGroups.reduce((s, g) => s + g.futureCount, 0)}x
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Monthly bar chart */}
          {data.monthlyBreakdown.some((m) => m.total > 0) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
              <p className="text-sm font-semibold text-gray-700 mb-4">Últimos 6 meses</p>
              <div className="flex items-end gap-2 h-24">
                {data.monthlyBreakdown.map(({ month, total }) => {
                  const pct = (total / maxMonthly) * 100
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-xs text-gray-400 font-medium">
                        {total > 0 ? formatCurrency(total).replace('R$ ', '') : ''}
                      </p>
                      <div className="w-full flex items-end" style={{ height: 56 }}>
                        <div
                          className="w-full bg-emerald-400 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(pct, total > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{monthLabel(month)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active installments */}
          {data.installmentGroups.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-3">Parcelamentos ativos</h2>
              <div className="space-y-3">
                {data.installmentGroups.map((group, i) => {
                  const progressPct = (group.withdrawnCount / group.parcelas) * 100
                  const isDone = group.futureCount === 0
                  return (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CATEGORY_ICONS[group.category] || '📦'}</span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{group.description}</p>
                            <p className="text-xs text-gray-400">{group.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {isDone ? '✅ Quitado' : `📅 ${group.withdrawnCount}/${group.parcelas}x`}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">{formatCurrency(group.monthlyAmount)}/mês</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          Retirado: <span className="font-semibold text-gray-700">{formatCurrency(group.withdrawnAmount)}</span>
                        </span>
                        {group.futureAmount > 0 && (
                          <span>
                            Restante: <span className="font-semibold text-orange-500">{formatCurrency(group.futureAmount)}</span>
                          </span>
                        )}
                        <span>
                          Total: <span className="font-semibold text-gray-700">{formatCurrency(group.totalParcelado)}</span>
                        </span>
                      </div>

                      {!isDone && group.futureIds.length > 0 && (
                        <button
                          onClick={() => cancelGroup(group)}
                          disabled={cancellingGroup === group.description}
                          className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {cancellingGroup === group.description
                            ? 'Cancelando...'
                            : `🗑️ Cancelar ${group.futureIds.length} parcelas restantes`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {data.categoryBreakdown.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-3">Por categoria</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
                {data.categoryBreakdown.map(({ category, total }, i) => {
                  const pct = (total / data.totalWithdrawn) * 100
                  return (
                    <div key={category} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <span className="text-xl w-8 text-center">{CATEGORY_ICONS[category] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{category}</p>
                          <p className="text-sm font-semibold text-gray-800 ml-2">{formatCurrency(total)}</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 w-8 text-right">{Math.round(pct)}%</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transactions list */}
          {data.transactions.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-3">Transações do período</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
                {data.transactions.map((t, i) => {
                  const date = new Date(t.date)
                  const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <span className="text-xl w-8 text-center flex-shrink-0">{CATEGORY_ICONS[t.category] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                            <p className="text-xs text-gray-400">
                              {dateStr}
                              {t.parcelas && t.parcelaAtual && (
                                <span className="ml-1 text-indigo-500">· {t.parcelaAtual}/{t.parcelas}x</span>
                              )}
                              {t.splitType === 'user1_only' || t.splitType === 'user2_only' ? (
                                <span className="ml-1 text-emerald-500">· Só você</span>
                              ) : null}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 ml-2 flex-shrink-0">
                            -{formatCurrency(t.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {data.totalWithdrawn === 0 && data.installmentGroups.length === 0 && (
            <div className="bg-white rounded-2xl py-16 text-center shadow-sm border border-emerald-50">
              <p className="text-4xl mb-3">👛</p>
              <p className="text-gray-500 font-medium">Nenhum gasto registrado</p>
              <p className="text-gray-400 text-sm mt-1">no período selecionado</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
