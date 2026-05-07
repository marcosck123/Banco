'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, getMonthName } from '@/lib/utils'

interface Summary {
  month: number
  year: number
  totalSpent: number
  sharedTotal: number
  user1OnlyTotal: number
  user2OnlyTotal: number
  user1Spent: number
  user2Spent: number
  user1Due: number
  user2Due: number
  eachShare: number
  isPaid: boolean
  payment: Payment | null
  user1Name: string
  user2Name: string
  expenseCount: number
}

interface Payment {
  id: string
  amount: number
  user1Amount: number
  user2Amount: number
  month: number
  year: number
  paidAt: string
}

export default function Pagamento() {
  const now = new Date()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const [sumRes, payRes] = await Promise.all([
        fetch(`/api/summary?month=${month}&year=${year}`),
        fetch('/api/payments'),
      ])
      const sumData = await sumRes.json()
      const payData = await payRes.json()
      setSummary(sumData)
      setPayments(payData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePay = async () => {
    if (!summary) return
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: summary.month, year: summary.year }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao registrar pagamento.')
        return
      }
      setConfirmOpen(false)
      await fetchData()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setPaying(false)
    }
  }

  const formatMonthYear = (month: number, year: number) => {
    return `${getMonthName(month)} ${year}`
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Pagamento</h1>
        <p className="text-emerald-600 text-sm">Feche a fatura do mês</p>
      </div>

      {/* Current month bill */}
      {summary && (
        <div className={`rounded-2xl overflow-hidden shadow-lg ${
          summary.isPaid
            ? 'bg-gradient-to-br from-gray-600 to-gray-700'
            : 'bg-gradient-to-br from-emerald-600 to-emerald-800'
        }`}>
          <div className="p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-emerald-100 text-sm">Fatura de</p>
                <p className="text-lg font-bold">{formatMonthYear(summary.month, summary.year)}</p>
              </div>
              {summary.isPaid ? (
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  ✅ PAGO
                </span>
              ) : (
                <span className="bg-yellow-400/20 text-yellow-200 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-400/30">
                  ⏳ ABERTO
                </span>
              )}
            </div>

            <div className="text-center py-4">
              <p className="text-emerald-100 text-sm">Total da fatura</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(summary.totalSpent)}</p>
              <p className="text-emerald-200 text-xs mt-1">{summary.expenseCount} despesas</p>
            </div>

            <div className="bg-white/10 rounded-xl p-3 mt-2">
              <p className="text-center text-emerald-100 text-xs mb-3 font-medium">
                Quanto cada um deve
              </p>
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-white/70 text-xs">{summary.user1Name}</p>
                  <p className="font-bold text-white">{formatCurrency(summary.user1Due)}</p>
                  {summary.user1OnlyTotal > 0 && (
                    <p className="text-white/50 text-xs">incl. {formatCurrency(summary.user1OnlyTotal)} individual</p>
                  )}
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-white/70 text-xs">{summary.user2Name}</p>
                  <p className="font-bold text-white">{formatCurrency(summary.user2Due)}</p>
                  {summary.user2OnlyTotal > 0 && (
                    <p className="text-white/50 text-xs">incl. {formatCurrency(summary.user2OnlyTotal)} individual</p>
                  )}
                </div>
              </div>
              {(summary.user1OnlyTotal > 0 || summary.user2OnlyTotal > 0) && (
                <p className="text-center text-white/40 text-xs mt-2">
                  Compartilhado: {formatCurrency(summary.sharedTotal)} ({formatCurrency(summary.sharedTotal / 2)} cada)
                </p>
              )}
            </div>
          </div>

          {!summary.isPaid && summary.totalSpent > 0 && (
            <div className="px-5 pb-5">
              <button
                onClick={() => setConfirmOpen(true)}
                className="w-full bg-white text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                💳 Fechar fatura
              </button>
            </div>
          )}

          {summary.isPaid && summary.payment && (
            <div className="px-5 pb-5">
              <p className="text-center text-white/60 text-xs">
                Pago em {formatDateTime(summary.payment.paidAt)}
              </p>
            </div>
          )}

          {!summary.isPaid && summary.totalSpent === 0 && (
            <div className="px-5 pb-5">
              <p className="text-center text-white/60 text-xs">
                Nenhuma despesa registrada neste mês
              </p>
            </div>
          )}
        </div>
      )}

      {/* Balance adjustment info */}
      {summary && !summary.isPaid && summary.totalSpent > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <h3 className="font-semibold text-gray-800 mb-3">Acerto entre vocês</h3>
          {(() => {
            // user1Spent = what user1 physically paid; user1Due = what user1 owes
            // If user1Spent > user1Due, user2 owes user1 the difference
            const diff = summary.user1Spent - summary.user1Due
            const absDiff = Math.abs(diff)
            if (absDiff < 0.01) {
              return (
                <p className="text-gray-500 text-sm">
                  Tudo certo, nenhuma transferência necessária!
                </p>
              )
            }
            const payer = diff > 0 ? summary.user2Name : summary.user1Name
            const receiver = diff > 0 ? summary.user1Name : summary.user2Name
            return (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-orange-600">{payer}</span> deve transferir
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(absDiff)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  para <span className="font-semibold">{receiver}</span>
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Past payments */}
      <div>
        <h2 className="font-bold text-gray-800 mb-3">Faturas anteriores</h2>
        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl py-10 text-center shadow-sm border border-emerald-50">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-gray-500 text-sm">Nenhuma fatura paga ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">
                      {formatMonthYear(payment.month, payment.year)}
                    </p>
                    <p className="text-gray-400 text-xs">{formatDateTime(payment.paidAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800 text-sm">{formatCurrency(payment.amount)}</p>
                    {payment.user1Amount !== payment.user2Amount ? (
                      <p className="text-gray-400 text-xs">
                        {formatCurrency(payment.user1Amount)} / {formatCurrency(payment.user2Amount)}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-xs">{formatCurrency(payment.user1Amount)} cada</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && summary && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Fechar fatura?</h3>
              <p className="text-gray-500 text-sm mt-1">
                {getMonthName(summary.month)} {summary.year}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total da fatura</span>
                <span className="font-bold text-gray-800">{formatCurrency(summary.totalSpent)}</span>
              </div>
              {summary.sharedTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 text-xs">Compartilhado (50/50)</span>
                  <span className="text-gray-500 text-xs">{formatCurrency(summary.sharedTotal)}</span>
                </div>
              )}
              <div className="border-t border-emerald-100 pt-2 mt-1 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{summary.user1Name} deve</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(summary.user1Due)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{summary.user2Name} deve</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(summary.user2Due)}</span>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-500 text-xs">
              Isso irá registrar o pagamento e liberar o saldo para o próximo mês.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {paying ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
