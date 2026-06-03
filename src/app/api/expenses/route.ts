import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db.collection('expenses')

    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const startDate = Timestamp.fromDate(new Date(yearNum, monthNum - 1, 1))
      const endDate = Timestamp.fromDate(new Date(yearNum, monthNum, 0, 23, 59, 59, 999))
      query = query
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
    } else {
      query = query.orderBy('date', 'desc')
    }

    const snapshot = await query.get()
    const expenses = snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate?.()?.toISOString() ?? d.data().date,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? d.data().createdAt,
    }))

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { amount, description, paidBy, category, date, splitType = 'shared', recordType = 'despesa', parcelas, parcelaAtual, totalParcelado } = body

    if (!amount || !description || !paidBy || !category || !date) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (!['user1', 'user2'].includes(paidBy)) {
      return NextResponse.json({ error: 'Pagador inválido' }, { status: 400 })
    }

    if (!['shared', 'user1_only', 'user2_only'].includes(splitType)) {
      return NextResponse.json({ error: 'Tipo de divisão inválido' }, { status: 400 })
    }

    if (!['despesa', 'pagamento', 'investimento'].includes(recordType)) {
      return NextResponse.json({ error: 'Tipo de registro inválido' }, { status: 400 })
    }

    const docData: Record<string, unknown> = {
      amount: parseFloat(amount),
      description,
      paidBy,
      category,
      date: Timestamp.fromDate(new Date(date)),
      splitType,
      recordType,
      paid: false,
      createdAt: Timestamp.now(),
    }

    if (parcelas && parcelaAtual) {
      docData.parcelas = parseInt(parcelas)
      docData.parcelaAtual = parseInt(parcelaAtual)
      if (totalParcelado) docData.totalParcelado = parseFloat(totalParcelado)
    }

    const docRef = await db.collection('expenses').add(docData)

    return NextResponse.json({ id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 })
  }
}
