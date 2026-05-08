'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'

type RecordType = 'despesa' | 'pagamento' | 'investimento'

const INVESTMENT_CATEGORIES = ['Salário', 'Freelance', 'Aluguel recebido', 'Dividendos', 'Outros']

const RECORD_TYPES: { value: RecordType; label: string; emoji: string; color: string; activeStyle: string }[] = [
  { value: 'despesa',     label: 'Despesa',     emoji: '🔴', color: 'text-red-600',    activeStyle: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'pagamento',   label: 'Pagamento',   emoji: '🟠', color: 'text-orange-600', activeStyle: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'investimento',label: 'Investimento',emoji: '🟢', color: 'text-emerald-600',activeStyle: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
]

export default function NovaTransacao() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [recordType, setRecordType] = useState<RecordType>('despesa')
  const [form, setForm] = useState({
    amount: '',
    description: '',
    category: 'Alimentação',
    paidBy: 'user1',
    date: today,
    splitType: 'shared',
  })

  const isInvestment = recordType === 'investimento'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.,]/g, '')
    setForm((prev) => ({ ...prev, amount: value }))
    setError('')
  }

  const handleRecordTypeChange = (type: RecordType) => {
    setRecordType(type)
    setForm((prev) => ({
      ...prev,
      category: type === 'investimento' ? 'Salário' : 'Alimentação',
    }))
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
          splitType: isInvestment ? 'shared' : form.splitType,
          recordType,
        }),
        signal: AbortSignal.timeout(12000),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao salvar.')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/'), 1200)
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError('Conexão lenta. Tente novamente.')
      } else {
        setError('Erro de conexão. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentType = RECORD_TYPES.find((t) => t.value === recordType)!

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isInvestment ? 'bg-emerald-100' : 'bg-red-50'}`}>
          <span className="text-4xl">{isInvestment ? '💰' : '✅'}</span>
        </div>
        <p className="text-xl font-bold text-gray-800">
          {isInvestment ? 'Investimento registrado!' : recordType === 'pagamento' ? 'Pagamento registrado!' : 'Despesa adicionada!'}
        </p>
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
          <h1 className="text-2xl font-bold text-emerald-900">Nova Transação</h1>
          <p className="text-emerald-600 text-sm">Escolha o tipo abaixo</p>
        </div>
      </div>

      {/* Record type selector */}
      <div className="grid grid-cols-3 gap-2">
        {RECORD_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => handleRecordTypeChange(type.value)}
            className={`py-3 px-2 rounded-2xl font-semibold text-sm transition-all border-2 flex flex-col items-center gap-1 ${
              recordType === type.value
                ? type.activeStyle
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{type.emoji}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${isInvestment ? 'text-emerald-500' : 'text-red-400'}`}>
              {isInvestment ? '+' : '-'} R$
            </span>
            <input
              type="text"
              name="amount"
              inputMode="decimal"
              value={form.amount}
              onChange={handleAmountChange}
              placeholder="0,00"
              className={`flex-1 text-3xl font-bold border-none outline-none bg-transparent placeholder-gray-300 ${
                isInvestment ? 'text-emerald-600' : 'text-red-500'
              }`}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder={isInvestment ? 'Ex: Salário do mês' : 'Ex: Jantar no restaurante'}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
            required
          />
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent bg-white"
          >
            {(isInvestment ? INVESTMENT_CATEGORIES : CATEGORIES).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Who (paidBy = who registered / deposited) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {isInvestment ? 'Quem depositou?' : 'Quem pagou?'}
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

        {/* Split type — hidden for investments */}
        {!isInvestment && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quem vai pagar essa conta?</label>
            <p className="text-xs text-gray-400 mb-3">Decida se é uma conta do casal ou individual</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'shared',     emoji: '👫', label: 'Casal',    sub: '50/50',           active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                { value: 'user1_only', emoji: '🧍', label: 'Só você',  sub: 'ela não divide',  active: 'border-blue-500 bg-blue-50 text-blue-700' },
                { value: 'user2_only', emoji: '🧍‍♀️', label: 'Só ela',   sub: 'você não divide', active: 'border-purple-500 bg-purple-50 text-purple-700' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, splitType: opt.value }))}
                  className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all border-2 flex flex-col items-center gap-1 ${
                    form.splitType === opt.value
                      ? opt.active
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                  <span className="text-xs font-normal opacity-70">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            isInvestment ? 'bg-emerald-600 hover:bg-emerald-700' : recordType === 'pagamento' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Salvando...
            </span>
          ) : isInvestment ? '💰 Registrar Investimento' : recordType === 'pagamento' ? '🧾 Registrar Pagamento' : '➕ Adicionar Despesa'}
        </button>
      </form>
    </div>
  )
}
