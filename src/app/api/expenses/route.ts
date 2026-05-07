import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let whereClause = {}

    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const startDate = new Date(yearNum, monthNum - 1, 1)
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)

      whereClause = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, paidBy, category, date, splitType = 'shared' } = body

    if (!amount || !description || !paidBy || !category || !date) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (!['user1', 'user2'].includes(paidBy)) {
      return NextResponse.json({ error: 'Pagador inválido' }, { status: 400 })
    }

    if (!['shared', 'user1_only', 'user2_only'].includes(splitType)) {
      return NextResponse.json({ error: 'Tipo de divisão inválido' }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        description,
        paidBy,
        category,
        date: new Date(date),
        splitType,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 })
  }
}
