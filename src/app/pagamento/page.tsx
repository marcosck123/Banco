'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, getMonthName } from '@/lib/utils'

interface Expense {
  id: string
  amount: number
  splitType: string
  recordType: string
  paid: boolean
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
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [user1Input, setUser1Input] = useState('')
  const [user2Input, setUser2Input] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    const signal = AbortSignal.timeout(12000)
    try {
      const [sumRes, expRes] = await Promise.all([
        fetch(`/api/summary?month=${month}&year=${year}`, { signal }),
        fetch(`/api/expenses?month=${month}&year=${year}`, { signal }),
      ])
      const sumData = await sumRes.json()
      const expData = await expRes.json()
      setSummary(sumData)
      const allExpenses: Expense[] = Array.isArray(expData) ? expData : []
      const unpaid = allExpenses.filter((e) => !e.paid && e.recordType !== 'investimento')
      setExpenses(unpaid)
      const split = calcSplit(unpaid)
      setUser1Input(split.user1Due > 0 ? split.user1Due.toFixed(2) : '')
      setUser2Input(split.user2Due > 0 ? split.user2Due.toFixed(2) : '')
    } catch (err: any) {
      setError(err?.name === 'TimeoutError' ? 'Conexão lenta. Tente novamente.' : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handlePay = async () => {
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1Paid: user1Input, user2Paid: user2Input, month, year }),
        signal: AbortSignal.timeout(12000),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao registrar.'); return }
      setSuccess(true)
      await fetchData()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.name === 'TimeoutError' ? 'Conexão lenta. Tente novamente.' : 'Erro de conexão.')
    } finally {
      setPaying(false)
    }
  }

  const split = calcSplit(expenses)
  const u1 = parseFloat(user1Input) || 0
  const u2 = parseFloat(user2Input) || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Pagamento</h1>
          <p className="text-emerald-600 text-sm">{getMonthName(month)} {year}</p>
        </div>
        <Link
          href="/faturas-pagas"
          className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          Ver faturas ↗
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
          ✅ Pagamento registrado com sucesso!
        </div>
      )}

      {/* Monthly summary card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide mb-1">
          Total de despesas — {getMonthName(month)}
        </p>
        <p className="text-3xl font-bold">{formatCurrency(split.total)}</p>
        <p className="text-emerald-200 text-xs mt-1">{expenses.length} despesas pendentes</p>

        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3">
          <div>
            <p className="text-emerald-200 text-xs">{summary?.user1Name || 'Você'} deve</p>
            <p className="text-white font-bold text-lg">{formatCurrency(split.user1Due)}</p>
          </div>
          <div>
            <p className="text-emerald-200 text-xs">{summary?.user2Name || 'Parceiro(a)'} deve</p>
            <p className="text-white font-bold text-lg">{formatCurrency(split.user2Due)}</p>
          </div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-emerald-50">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500 font-medium">Nenhuma despesa pendente</p>
          <p className="text-gray-400 text-sm mt-1">em {getMonthName(month)} {year}</p>
        </div>
      ) : (
        <>
          {/* Deposit inputs */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-50 space-y-4">
            <p className="text-sm font-bold text-gray-700">Valor depositado</p>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                {summary?.user1Name || 'Você'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={user1Input}
                  onChange={(e) => setUser1Input(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 font-semibold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                {summary?.user2Name || 'Parceiro(a)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={user2Input}
                  onChange={(e) => setUser2Input(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 font-semibold text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {(u1 > 0 || u2 > 0) && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span className="text-gray-500">Total depositado</span>
                <span className="font-bold text-gray-800">{formatCurrency(u1 + u2)}</span>
              </div>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={paying || (u1 === 0 && u2 === 0)}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {paying ? 'Registrando...' : `💳 Registrar pagamento`}
          </button>
        </>
      )}
    </div>
  )
}
