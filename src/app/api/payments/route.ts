import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 })
    }

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: { month: parseInt(month), year: parseInt(year) },
    })

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Este mês já foi pago' },
        { status: 409 }
      )
    }

    // Calculate total for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

    const sharedTotal = expenses
      .filter((e) => e.splitType === 'shared' || !e.splitType)
      .reduce((sum, e) => sum + e.amount, 0)

    const user1OnlyTotal = expenses
      .filter((e) => e.splitType === 'user1_only')
      .reduce((sum, e) => sum + e.amount, 0)

    const user2OnlyTotal = expenses
      .filter((e) => e.splitType === 'user2_only')
      .reduce((sum, e) => sum + e.amount, 0)

    const user1Amount = sharedTotal / 2 + user1OnlyTotal
    const user2Amount = sharedTotal / 2 + user2OnlyTotal

    const payment = await prisma.payment.create({
      data: {
        amount: totalAmount,
        user1Amount,
        user2Amount,
        month: parseInt(month),
        year: parseInt(year),
        paidAt: new Date(),
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
