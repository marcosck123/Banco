import { NextRequest, NextResponse } from 'next/server'
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET() {
  try {
    const q = query(
      collection(db, 'payments'),
      orderBy('year', 'desc'),
      orderBy('month', 'desc')
    )
    const snapshot = await getDocs(q)
    const payments = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      paidAt: d.data().paidAt?.toDate?.()?.toISOString() ?? d.data().paidAt,
    }))
    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { expenseIds, month, year } = body

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos uma despesa' }, { status: 400 })
    }
    if (!month || !year) {
      return NextResponse.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 })
    }

    // Fetch selected expenses to calculate amounts
    const expenseDocs = await Promise.all(
      expenseIds.map((id: string) => getDoc(doc(db, 'expenses', id)))
    )

    const expenses = expenseDocs
      .filter((d) => d.exists())
      .map((d) => ({ id: d.id, ...d.data() } as any))

    if (expenses.length === 0) {
      return NextResponse.json({ error: 'Despesas não encontradas' }, { status: 404 })
    }

    const totalAmount = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)

    const sharedTotal = expenses
      .filter((e: any) => e.splitType === 'shared' || !e.splitType)
      .reduce((sum: number, e: any) => sum + e.amount, 0)

    const user1OnlyTotal = expenses
      .filter((e: any) => e.splitType === 'user1_only')
      .reduce((sum: number, e: any) => sum + e.amount, 0)

    const user2OnlyTotal = expenses
      .filter((e: any) => e.splitType === 'user2_only')
      .reduce((sum: number, e: any) => sum + e.amount, 0)

    // Use a batch to atomically create payment + mark expenses as paid
    const batch = writeBatch(db)

    const paymentRef = doc(collection(db, 'payments'))
    batch.set(paymentRef, {
      amount: totalAmount,
      user1Amount: sharedTotal / 2 + user1OnlyTotal,
      user2Amount: sharedTotal / 2 + user2OnlyTotal,
      month: parseInt(month),
      year: parseInt(year),
      expenseCount: expenses.length,
      expenseIds,
      paidAt: Timestamp.now(),
    })

    for (const id of expenseIds) {
      batch.update(doc(db, 'expenses', id), { paid: true })
    }

    await batch.commit()

    return NextResponse.json({ id: paymentRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
