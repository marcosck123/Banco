'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'

export default function NovaDespesa() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    amount: '',
    description: '',
    category: 'Alimentação',
    paidBy: 'user1',
    date: today,
    splitType: 'shared',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and comma/dot for decimals
    const value = e.target.value.replace(/[^\d.,]/g, '')
    setForm((prev) => ({ ...prev, amount: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amountNum = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Informe um valor válido maior que zero.')
      return
    }
    if (!form.description.trim()) {
      setError('Informe uma descrição.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          description: form.description.trim(),
          category: form.category,
          paidBy: form.paidBy,
          date: form.date,
          splitType: form.splitType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao salvar despesa.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 1200)
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-bold text-emerald-800">Despesa adicionada!</p>
        <p className="text-gray-500 text-sm">Redirecionando...</p>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Nova Despesa</h1>
          <p className="text-emerald-600 text-sm">Registre um gasto compartilhado</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium text-lg">R$</span>
            <input
              type="text"
              name="amount"
              inputMode="decimal"
              value={form.amount}
              onChange={handleAmountChange}
              placeholder="0,00"
              className="flex-1 text-3xl font-bold text-emerald-700 border-none outline-none bg-transparent placeholder-gray-300"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Ex: Jantar no restaurante"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
            required
          />
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent bg-white"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Who paid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quem pagou?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, paidBy: 'user1' }))}
              className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                form.paidBy === 'user1'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
            >
              👤 Você
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, paidBy: 'user2' }))}
              className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                form.paidBy === 'user2'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
            >
              👤 Namorada
            </button>
          </div>
        </div>

        {/* Split type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quem vai pagar essa conta?
          </label>
          <p className="text-xs text-gray-400 mb-3">Decida se é uma conta do casal ou individual</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, splitType: 'shared' }))}
              className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all border-2 flex flex-col items-center gap-1 ${
                form.splitType === 'shared'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">👫</span>
              <span>Casal</span>
              <span className="text-xs font-normal opacity-70">50/50</span>
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, splitType: 'user1_only' }))}
              className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all border-2 flex flex-col items-center gap-1 ${
                form.splitType === 'user1_only'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">🧍</span>
              <span>Só você</span>
              <span className="text-xs font-normal opacity-70">ela não divide</span>
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, splitType: 'user2_only' }))}
              className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all border-2 flex flex-col items-center gap-1 ${
                form.splitType === 'user2_only'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">🧍‍♀️</span>
              <span>Só ela</span>
              <span className="text-xs font-normal opacity-70">você não divide</span>
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data
          </label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
            required
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Salvando...
            </span>
          ) : (
            'Adicionar Despesa'
          )}
        </button>
      </form>
    </div>
  )
}
