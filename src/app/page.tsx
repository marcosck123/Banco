'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, getMonthName, CATEGORY_ICONS } from '@/lib/utils'

interface Summary {
  month: number
  year: number
  totalSpent: number
  totalInvested: number
  sharedTotal: number
  user1OnlyTotal: number
  user2OnlyTotal: number
  user1Invested: number
  user2Invested: number
  user1Due: number
  user2Due: number
  availableBalance: number
  creditLimit: number
  eachShare: number
  isPaid: boolean
  user1Name: string
  user2Name: string
  expenseCount: number
  investmentCount: number
}

interface Expense {
  id: string
  amount: number
  description: string
  paidBy: string
  category: string
  date: string
  splitType: string
  recordType: string
  createdAt: string
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const signal = AbortSignal.timeout(12000)
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

      const [summaryRes, expensesRes] = await Promise.all([
        fetch(`/api/summary?month=${month}&year=${year}`, { signal }),
        fetch(`/api/expenses?month=${month}&year=${year}`, { signal }),
      ])

      const summaryData = await summaryRes.json()
      const expensesRaw = await expensesRes.json()

      setSummary(summaryData)
      setRecentExpenses(Array.isArray(expensesRaw) ? expensesRaw.slice(0, 5) : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const balancePercent = summary
    ? Math.max(0, Math.min(100, (summary.availableBalance / summary.creditLimit) * 100))
    : 0

  const balanceColor =
    balancePercent > 50
      ? 'bg-emerald-500'
      : balancePercent > 25
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Banco do Casal 💑</h1>
          <p className="text-emerald-600 text-sm">
            {summary ? `${getMonthName(summary.month)} ${summary.year}` : ''}
          </p>
        </div>
        <Link
          href="/nova-despesa"
          className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      {/* Balance Card */}
      {summary && (
        <div className={`rounded-2xl p-6 text-white shadow-lg ${
          summary.isPaid
            ? 'bg-gradient-to-br from-gray-600 to-gray-700'
            : 'bg-gradient-to-br from-emerald-600 to-emerald-800'
        }`}>
          {summary.isPaid && (
            <div className="mb-2 text-xs font-semibold bg-white/20 inline-block px-2 py-1 rounded-full">
              ✅ MÊS PAGO
            </div>
          )}
          <p className="text-emerald-100 text-sm font-medium">Saldo disponível</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(summary.availableBalance)}</p>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-emerald-100 mb-1">
              <span>Usado: {formatCurrency(summary.totalSpent)}</span>
              <span>Limite: {formatCurrency(summary.creditLimit)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className={`${balanceColor} h-2 rounded-full transition-all`}
                style={{ width: `${balancePercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
            <p className="text-gray-500 text-xs font-medium">Gasto no mês</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(summary.totalSpent)}</p>
            <p className="text-gray-400 text-xs mt-1">{summary.expenseCount} despesas</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
            <p className="text-gray-500 text-xs font-medium">Saídas do mês</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(summary.totalSpent)}</p>
            <p className="text-gray-400 text-xs mt-1">{summary.expenseCount} transações</p>
          </div>
          {summary.totalInvested > 0 && (
            <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
              <p className="text-gray-500 text-xs font-medium">Investimentos</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">+{formatCurrency(summary.totalInvested)}</p>
              <p className="text-gray-400 text-xs mt-1">{summary.investmentCount} entradas</p>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
            <p className="text-gray-500 text-xs font-medium">{summary.user1Name} deve</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(summary.user1Due)}</p>
            <p className="text-gray-400 text-xs mt-1">
              {summary.user1OnlyTotal > 0 ? `incl. ${formatCurrency(summary.user1OnlyTotal)} individual` : '50% do casal'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
            <p className="text-gray-500 text-xs font-medium">{summary.user2Name} deve</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(summary.user2Due)}</p>
            <p className="text-gray-400 text-xs mt-1">
              {summary.user2OnlyTotal > 0 ? `incl. ${formatCurrency(summary.user2OnlyTotal)} individual` : '50% do casal'}
            </p>
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Últimas despesas</h2>
          <Link href="/historico" className="text-emerald-600 text-sm font-medium">
            Ver todas
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-gray-500 text-sm">Nenhuma despesa este mês</p>
            <Link
              href="/nova-despesa"
              className="mt-3 inline-block text-emerald-600 text-sm font-medium"
            >
              Adicionar primeira despesa
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentExpenses.map((expense) => (
              <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                <div className="text-2xl w-10 text-center">
                  {CATEGORY_ICONS[expense.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{expense.description}</p>
                  <p className="text-gray-400 text-xs">
                    {expense.category} · {formatDate(expense.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${expense.recordType === 'investimento' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {expense.recordType === 'investimento' ? '+' : '-'}{formatCurrency(expense.amount)}
                  </p>
                  <p className={`text-xs ${expense.paidBy === 'user1' ? 'text-blue-500' : 'text-purple-500'}`}>
                    {expense.paidBy === 'user1' ? summary?.user1Name : summary?.user2Name}
                  </p>
                  {expense.recordType === 'investimento' ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-600">
                      Investimento
                    </span>
                  ) : expense.recordType === 'pagamento' ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                      Pagamento
                    </span>
                  ) : expense.splitType !== 'shared' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      expense.splitType === 'user1_only' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {expense.splitType === 'user1_only' ? 'Só você' : 'Só ela'}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pay bill CTA */}
      {summary && !summary.isPaid && summary.totalSpent > 0 && (
        <Link
          href="/pagamento"
          className="block w-full bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-center py-4 rounded-2xl font-semibold hover:bg-emerald-100 transition-colors"
        >
          💳 Fechar fatura do mês
        </Link>
      )}
    </div>
  )
}
