import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    const now = new Date()
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1
    const year = yearParam ? parseInt(yearParam) : now.getFullYear()

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Get all expenses for the month
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Get settings
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    const creditLimit = settings?.creditLimit ?? 65000
    const user1Name = settings?.user1Name ?? 'Você'
    const user2Name = settings?.user2Name ?? 'Namorada'

    // Check if this month has been paid
    const payment = await prisma.payment.findFirst({
      where: { month, year },
    })

    // Calculate totals
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
    const user1Spent = expenses
      .filter((e) => e.paidBy === 'user1')
      .reduce((sum, e) => sum + e.amount, 0)
    const user2Spent = expenses
      .filter((e) => e.paidBy === 'user2')
      .reduce((sum, e) => sum + e.amount, 0)

    const availableBalance = creditLimit - totalSpent
    const eachShare = totalSpent / 2

    return NextResponse.json({
      month,
      year,
      totalSpent,
      user1Spent,
      user2Spent,
      availableBalance,
      creditLimit,
      eachShare,
      isPaid: !!payment,
      payment: payment || null,
      user1Name,
      user2Name,
      expenseCount: expenses.length,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json({ error: 'Erro ao buscar resumo' }, { status: 500 })
  }
}
