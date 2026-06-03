import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = request.nextUrl
    const period = searchParams.get('period') ?? 'all' // month | 3m | 6m | all

    const now = new Date()
    now.setHours(23, 59, 59, 999)

    let startDate: Date | null = null
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === '3m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    } else if (period === '6m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    }

    // Fetch all expenses (no date filter — we need full installment history)
    const snapshot = await db.collection('expenses').get()

    const all = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        amount: data.amount as number,
        description: data.description as string,
        paidBy: data.paidBy as string,
        category: data.category as string,
        splitType: data.splitType as string,
        recordType: data.recordType as string,
        paid: data.paid as boolean,
        parcelas: data.parcelas as number | undefined,
        parcelaAtual: data.parcelaAtual as number | undefined,
        parcelaGroupId: data.parcelaGroupId as string | undefined,
        totalParcelado: data.totalParcelado as number | undefined,
        date: (data.date?.toDate?.() ?? new Date(data.date)) as Date,
      }
    })

    // Outflows only (no investments)
    const outflows = all.filter((e) => e.recordType !== 'investimento')

    // Withdrawn = outflows with date <= now
    const withdrawn = outflows.filter((e) => e.date <= now)
    // Future = outflows with date > now (future installments)
    const future = outflows.filter((e) => e.date > now)

    // Apply period filter to withdrawn for the stats display
    const periodWithdrawn = startDate
      ? withdrawn.filter((e) => e.date >= startDate!)
      : withdrawn

    const totalWithdrawn = periodWithdrawn.reduce((s, e) => s + e.amount, 0)
    const totalFuture = future.reduce((s, e) => s + e.amount, 0)

    // Category breakdown (period filtered)
    const categoryMap: Record<string, number> = {}
    for (const e of periodWithdrawn) {
      categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    // Installment groups
    const installmentMap: Record<string, {
      description: string
      parcelas: number
      monthlyAmount: number
      totalParcelado: number
      splitType: string
      paidBy: string
      category: string
      withdrawnCount: number
      futureCount: number
      withdrawnAmount: number
      futureAmount: number
      futureIds: string[]
    }> = {}

    for (const e of outflows) {
      if (!e.parcelas) continue
      // Use parcelaGroupId when available, fall back to description+parcelas for older records
      const key = e.parcelaGroupId ?? `${e.description}__${e.parcelas}__${e.totalParcelado ?? e.amount * e.parcelas}`

      if (!installmentMap[key]) {
        installmentMap[key] = {
          description: e.description,
          parcelas: e.parcelas,
          monthlyAmount: e.amount,
          totalParcelado: e.totalParcelado ?? e.amount * e.parcelas,
          splitType: e.splitType,
          paidBy: e.paidBy,
          category: e.category,
          withdrawnCount: 0,
          futureCount: 0,
          withdrawnAmount: 0,
          futureAmount: 0,
          futureIds: [],
        }
      }

      if (e.date <= now) {
        installmentMap[key].withdrawnCount++
        installmentMap[key].withdrawnAmount += e.amount
      } else {
        installmentMap[key].futureCount++
        installmentMap[key].futureAmount += e.amount
        installmentMap[key].futureIds.push(e.id)
      }
    }

    const installmentGroups = Object.values(installmentMap)
      .filter((g) => g.futureCount > 0 || g.withdrawnCount > 0)
      .sort((a, b) => b.withdrawnAmount - a.withdrawnAmount)

    // Monthly breakdown (last 6 months)
    const monthlyMap: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = 0
    }
    for (const e of withdrawn) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
      if (key in monthlyMap) monthlyMap[key] += e.amount
    }
    const monthlyBreakdown = Object.entries(monthlyMap).map(([month, total]) => ({ month, total }))

    return NextResponse.json({
      period,
      totalWithdrawn,
      totalFuture,
      transactionCount: periodWithdrawn.length,
      installmentGroups,
      categoryBreakdown,
      monthlyBreakdown,
    })
  } catch (error) {
    console.error('Error fetching carteira:', error)
    return NextResponse.json({ error: 'Erro ao buscar carteira' }, { status: 500 })
  }
}
