'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, getMonthName } from '@/lib/utils'

interface Payment {
  id: string
  user1Paid?: number
  user2Paid?: number
  totalPaid?: number
  // legacy fields
  amount?: number
  user1Amount?: number
  user2Amount?: number
  month: number
  year: number
  expenseCount?: number
  paidAt: string
}

export default function FaturasPagas() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch('/api/payments', { signal: AbortSignal.timeout(12000) })
        const data = await res.json()
        setPayments(Array.isArray(data) ? data : [])
      } catch {
        setError('Erro ao carregar faturas.')
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  const formatDateTime = (dateStr: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr))

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pagamento" className="text-emerald-600 hover:text-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Faturas pagas</h1>
          <p className="text-emerald-600 text-sm">Histórico de pagamentos</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl py-16 text-center shadow-sm border border-emerald-50">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500 font-medium">Nenhuma fatura paga ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const u1 = payment.user1Paid ?? payment.user1Amount ?? 0
            const u2 = payment.user2Paid ?? payment.user2Amount ?? 0
            const total = payment.totalPaid ?? payment.amount ?? (u1 + u2)
            return (
              <div key={payment.id} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        {getMonthName(payment.month)} {payment.year}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateTime(payment.paidAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatCurrency(total)}</p>
                    {payment.expenseCount ? (
                      <p className="text-xs text-gray-400">{payment.expenseCount} despesas quitadas</p>
                    ) : null}
                  </div>
                </div>

                {(u1 > 0 || u2 > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-400 font-medium">Depositado</p>
                      <p className="text-sm font-bold text-blue-600 mt-0.5">{formatCurrency(u1)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-400 font-medium">Depositado</p>
                      <p className="text-sm font-bold text-purple-600 mt-0.5">{formatCurrency(u2)}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
