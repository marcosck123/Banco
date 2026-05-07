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
  createdAt: string
}

const SPLIT_BADGE: Record<string, { label: string; color: string }> = {
  shared: { label: '👫 Casal', color: 'text-emerald-600 bg-emerald-50' },
  user1_only: { label: '🧍 Só você', color: 'text-blue-600 bg-blue-50' },
  user2_only: { label: '🧍‍♀️ Só ela', color: 'text-purple-600 bg-purple-50' },
}

interface Summary {
  user1Name: string
  user2Name: string
  user1Due: number
  user2Due: number
}

export default function Historico() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const [expRes, sumRes] = await Promise.all([
        fetch(`/api/expenses?month=${month}&year=${year}`),
        fetch(`/api/summary?month=${month}&year=${year}`),
      ])
      const expData = await expRes.json()
      const sumData = await sumRes.json()
      setExpenses(expData)
      setSummary(sumData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [month, year])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const user1Total = expenses.filter((e) => e.paidBy === 'user1').reduce((s, e) => s + e.amount, 0)
  const user2Total = expenses.filter((e) => e.paidBy === 'user2').reduce((s, e) => s + e.amount, 0)

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  // Group expenses by date
  const grouped: Record<string, Expense[]> = {}
  expenses.forEach((expense) => {
    const dateKey = expense.date.split('T')[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(expense)
  })
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Histórico</h1>
        <p className="text-emerald-600 text-sm">Todas as despesas registradas</p>
      </div>

      {/* Month selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-800 text-lg">
              {getMonthName(month)} {year}
            </p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-emerald-50 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-bold text-gray-800 text-sm mt-1">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-emerald-50 text-center">
            <p className="text-xs text-blue-500">{summary?.user1Name || 'Você'}</p>
            <p className="font-bold text-blue-600 text-sm mt-1">{formatCurrency(user1Total)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-emerald-50 text-center">
            <p className="text-xs text-purple-500">{summary?.user2Name || 'Namorada'}</p>
            <p className="font-bold text-purple-600 text-sm mt-1">{formatCurrency(user2Total)}</p>
          </div>
        </div>
      )}

      {/* Expenses list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl py-16 text-center shadow-sm border border-emerald-50">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">Nenhuma despesa</p>
          <p className="text-gray-400 text-sm mt-1">em {getMonthName(month)} {year}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {formatDate(dateKey)}
              </p>
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
                <ul className="divide-y divide-gray-50">
                  {grouped[dateKey].map((expense) => (
                    <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="text-2xl w-10 text-center flex-shrink-0">
                        {CATEGORY_ICONS[expense.category] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {expense.description}
                        </p>
                        <p className="text-gray-400 text-xs">{expense.category}</p>
                        {(() => {
                          const badge = SPLIT_BADGE[expense.splitType] ?? SPLIT_BADGE.shared
                          return (
                            <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${badge.color}`}>
                              {badge.label}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-800 text-sm">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p
                          className={`text-xs ${
                            expense.paidBy === 'user1' ? 'text-blue-500' : 'text-purple-500'
                          }`}
                        >
                          {expense.paidBy === 'user1'
                            ? summary?.user1Name || 'Você'
                            : summary?.user2Name || 'Namorada'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {deletingId === expense.id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {/* Total footer */}
          <div className="bg-emerald-600 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total do mês</span>
              <span className="text-xl font-bold">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-emerald-100 text-sm">
              <span>
                {summary?.user1Name || 'Você'}: {formatCurrency(summary?.user1Due ?? totalSpent / 2)}
              </span>
              <span>
                {summary?.user2Name || 'Namorada'}: {formatCurrency(summary?.user2Due ?? totalSpent / 2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
