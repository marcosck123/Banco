'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, getMonthName, CATEGORY_ICONS } from '@/lib/utils'

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
  expenseCount: number
  paidAt: string
}

interface Summary {
  month: number
  year: number
  user1Name: string
  user2Name: string
}

function calcSplit(expenses: Expense[]) {
  const shared = expenses
    .filter((e) => e.splitType === 'shared' || !e.splitType)
    .reduce((s, e) => s + e.amount, 0)
  const user1Only = expenses
    .filter((e) => e.splitType === 'user1_only')
    .reduce((s, e) => s + e.amount, 0)
  const user2Only = expenses
    .filter((e) => e.splitType === 'user2_only')
    .reduce((s, e) => s + e.amount, 0)
  return {
    total: shared + user1Only + user2Only,
    user1Due: shared / 2 + user1Only,
    user2Due: shared / 2 + user2Only,
  }
}

export default function Pagamento() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [summary, setSummary] = useState<Summary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    const signal = AbortSignal.timeout(12000)
    try {
      const [sumRes, expRes, payRes] = await Promise.all([
        fetch(`/api/summary?month=${month}&year=${year}`, { signal }),
        fetch(`/api/expenses?month=${month}&year=${year}`, { signal }),
        fetch('/api/payments', { signal }),
      ])
      const sumData = await sumRes.json()
      const expData = await expRes.json()
      const payData = await payRes.json()
      setSummary(sumData)
      const allExpenses: Expense[] = Array.isArray(expData) ? expData : []
      const unpaid = allExpenses.filter(
        (e) => !e.paid && e.recordType !== 'investimento'
      )
      setExpenses(unpaid)
      setSelected(new Set(unpaid.map((e) => e.id)))
      setPayments(Array.isArray(payData) ? payData : [])
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError('Conexão lenta. Tente novamente.')
      } else {
        setError('Erro ao carregar dados.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleExpense = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === expenses.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(expenses.map((e) => e.id)))
    }
  }

  const handlePay = async () => {
    if (selected.size === 0) return
    setPaying(true)
    setError('')
    const signal = AbortSignal.timeout(12000)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseIds: Array.from(selected), month, year }),
        signal,
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
        setError('Conexão lenta. Tente novamente.')
      } else {
        setError('Erro de conexão. Tente novamente.')
      }
    } finally {
      setPaying(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr))
  }

  const selectedExpenses = expenses.filter((e) => selected.has(e.id))
  const split = calcSplit(selectedExpenses)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Pagamento</h1>
        <p className="text-emerald-600 text-sm">
          {getMonthName(month)} {year}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Unpaid expenses list */}
      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl py-16 text-center shadow-sm border border-emerald-50">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500 font-medium">Nenhuma despesa pendente</p>
          <p className="text-gray-400 text-sm mt-1">em {getMonthName(month)} {year}</p>
        </div>
      ) : (
        <>
          {/* Select all toggle */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-emerald-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selected.size} de {expenses.length} selecionadas
            </span>
            <button
              onClick={toggleAll}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              {selected.size === expenses.length ? 'Desmarcar todas' : 'Marcar todas'}
            </button>
          </div>

          {/* Expense checkboxes */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  onClick={() => toggleExpense(expense.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                    selected.has(expense.id)
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300'
                  }`}>
                    {selected.has(expense.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xl w-8 text-center flex-shrink-0">
                    {CATEGORY_ICONS[expense.category] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{expense.description}</p>
                    <p className="text-gray-400 text-xs">
                      {expense.category}
                      {expense.splitType === 'user1_only' && ' · Só você'}
                      {expense.splitType === 'user2_only' && ` · Só ${summary?.user2Name || 'ela'}`}
                    </p>
                  </div>
                  <p className="font-semibold text-sm text-gray-800 flex-shrink-0">
                    {formatCurrency(expense.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Running total */}
          <div className="bg-emerald-600 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total selecionado</span>
              <span className="text-xl font-bold">{formatCurrency(split.total)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-emerald-100 text-sm">
              <span>{summary?.user1Name || 'Você'}: {formatCurrency(split.user1Due)}</span>
              <span>{summary?.user2Name || 'Namorada'}: {formatCurrency(split.user2Due)}</span>
            </div>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={selected.size === 0}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            💳 Pagar {selected.size} despesa{selected.size !== 1 ? 's' : ''}
          </button>
        </>
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
                      {getMonthName(payment.month)} {payment.year}
                      {payment.expenseCount && (
                        <span className="text-gray-400 font-normal"> · {payment.expenseCount} despesas</span>
                      )}
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
              <h3 className="text-xl font-bold text-gray-800">Confirmar pagamento?</h3>
              <p className="text-gray-500 text-sm mt-1">
                {selected.size} despesa{selected.size !== 1 ? 's' : ''} de {getMonthName(month)} {year}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-gray-800">{formatCurrency(split.total)}</span>
              </div>
              <div className="border-t border-emerald-100 pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{summary.user1Name} deve</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(split.user1Due)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{summary.user2Name} deve</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(split.user2Due)}</span>
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
