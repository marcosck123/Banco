'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, getMonthName, CATEGORY_ICONS } from '@/lib/utils'

interface Expense {
  id: string
  amount: number
  description: string
  paidBy: string
  category: string
  date: string
  splitType: string
  recordType: string
  paid: boolean
}

interface Payment {
  id: string
  amount: number
  user1Amount: number
  user2Amount: number
  month: number
  year: number
  paidAt: string
  expenseCount: number
}

interface Names {
  user1Name: string
  user2Name: string
}

function calcSplit(expenses: Expense[]) {
  const sharedTotal = expenses
    .filter((e) => e.splitType === 'shared' || !e.splitType)
    .reduce((sum, e) => sum + e.amount, 0)
  const user1Only = expenses
    .filter((e) => e.splitType === 'user1_only')
    .reduce((sum, e) => sum + e.amount, 0)
  const user2Only = expenses
    .filter((e) => e.splitType === 'user2_only')
    .reduce((sum, e) => sum + e.amount, 0)
  return {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    user1Due: sharedTotal / 2 + user1Only,
    user2Due: sharedTotal / 2 + user2Only,
    sharedTotal,
  }
}

export default function Pagamento() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [names, setNames] = useState<Names>({ user1Name: 'Você', user2Name: 'Namorada' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const signal = AbortSignal.timeout(12000)
    try {
      const [expRes, payRes, sumRes] = await Promise.all([
        fetch(`/api/expenses?month=${month}&year=${year}`, { signal }),
        fetch('/api/payments', { signal }),
        fetch(`/api/summary?month=${month}&year=${year}`, { signal }),
      ])

      const [expRaw, payRaw, sumData] = await Promise.all([
        expRes.json(),
        payRes.json(),
        sumRes.json(),
      ])

      const expData: Expense[] = Array.isArray(expRaw) ? expRaw : []
      const payData: Payment[] = Array.isArray(payRaw) ? payRaw : []

      const outflows = expData.filter((e) => e.recordType !== 'investimento' && !e.paid)
      setExpenses(outflows)
      setPayments(payData)
      setNames({ user1Name: sumData.user1Name ?? 'Você', user2Name: sumData.user2Name ?? 'Namorada' })
      setSelected(new Set(outflows.map((e) => e.id)))
    } catch (err: any) {
      console.error(err)
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError('Conexão lenta. Verifique sua internet e tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [month, year])

  const toggleExpense = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === expenses.length) setSelected(new Set())
    else setSelected(new Set(expenses.map((e) => e.id)))
  }

  const selectedExpenses = expenses.filter((e) => selected.has(e.id))
  const { total, user1Due, user2Due, sharedTotal } = calcSplit(selectedExpenses)

  const handlePay = async () => {
    if (selected.size === 0) return
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseIds: Array.from(selected), month, year }),
        signal: AbortSignal.timeout(12000),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao registrar pagamento.')
        return
      }
      setConfirmOpen(false)
      await fetchData()
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError('Conexão lenta. O pagamento pode ter sido processado — recarregue a página.')
      } else {
        setError('Erro de conexão. Tente novamente.')
      }
    } finally {
      setPaying(false)
    }
  }

  const formatDateTime = (dateStr: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr))

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Pagar Fatura</h1>
        <p className="text-emerald-600 text-sm">Selecione as despesas para pagar</p>
      </div>

      {/* Month navigator */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 flex items-center justify-between">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-bold text-gray-800">{getMonthName(month)} {year}</p>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Expense selection list */}
      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-emerald-50">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-700 font-semibold">Tudo pago!</p>
          <p className="text-gray-400 text-sm mt-1">Nenhuma despesa pendente em {getMonthName(month)}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
          {/* Select all header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={toggleAll} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              {selected.size === expenses.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            <span className="text-xs text-gray-400">{selected.size}/{expenses.length} selecionados</span>
          </div>

          <ul className="divide-y divide-gray-50">
            {expenses.map((expense) => {
              const isSelected = selected.has(expense.id)
              return (
                <li
                  key={expense.id}
                  onClick={() => toggleExpense(expense.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}
                >
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="text-xl w-8 text-center flex-shrink-0">
                    {CATEGORY_ICONS[expense.category] || '📦'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{expense.description}</p>
                    <p className="text-gray-400 text-xs">
                      {expense.category} · {formatDate(expense.date)}
                      {expense.recordType === 'pagamento' && <span className="ml-1 text-orange-500">· Pagamento</span>}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-800 text-sm">{formatCurrency(expense.amount)}</p>
                    <p className={`text-xs ${expense.splitType === 'user1_only' ? 'text-blue-500' : expense.splitType === 'user2_only' ? 'text-purple-500' : 'text-gray-400'}`}>
                      {expense.splitType === 'user1_only' ? 'Só você' : expense.splitType === 'user2_only' ? 'Só ela' : '50/50'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Running total + pay button */}
      {expenses.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <p className="text-emerald-100 text-sm">Total selecionado</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>

          {total > 0 && (
            <div className="bg-white/10 rounded-xl p-3 mb-4">
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-white/70 text-xs">{names.user1Name}</p>
                  <p className="font-bold text-white">{formatCurrency(user1Due)}</p>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-white/70 text-xs">{names.user2Name}</p>
                  <p className="font-bold text-white">{formatCurrency(user2Due)}</p>
                </div>
              </div>
              {sharedTotal > 0 && (
                <p className="text-center text-white/40 text-xs mt-2">
                  {formatCurrency(sharedTotal)} compartilhado · {formatCurrency(sharedTotal / 2)} cada
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={selected.size === 0}
            className="w-full bg-white text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            💳 Pagar {selected.size} {selected.size === 1 ? 'despesa' : 'despesas'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Past payments */}
      <div>
        <h2 className="font-bold text-gray-800 mb-3">Pagamentos realizados</h2>
        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl py-10 text-center shadow-sm border border-emerald-50">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-gray-500 text-sm">Nenhum pagamento ainda</p>
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
                      {getMonthName(payment.month)} {payment.year}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {payment.expenseCount} {payment.expenseCount === 1 ? 'despesa' : 'despesas'} · {formatDateTime(payment.paidAt)}
                    </p>
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

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Confirmar pagamento?</h3>
              <p className="text-gray-500 text-sm mt-1">
                {selected.size} {selected.size === 1 ? 'despesa' : 'despesas'} de {getMonthName(month)} {year}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-gray-800">{formatCurrency(total)}</span>
              </div>
              <div className="border-t border-emerald-100 pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{names.user1Name} paga</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(user1Due)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{names.user2Name} paga</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(user2Due)}</span>
                </div>
              </div>
            </div>

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
