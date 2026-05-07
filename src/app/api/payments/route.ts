import { NextRequest, NextResponse } from 'next/server'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
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
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    // Check if already paid
    const existing = await getDocs(
      query(
        collection(db, 'payments'),
        where('month', '==', monthNum),
        where('year', '==', yearNum)
      )
    )
    if (!existing.empty) {
      return NextResponse.json({ error: 'Este mês já foi pago' }, { status: 409 })
    }

    // Get all expenses for the month
    const startDate = Timestamp.fromDate(new Date(yearNum, monthNum - 1, 1))
    const endDate = Timestamp.fromDate(new Date(yearNum, monthNum, 0, 23, 59, 59, 999))

    const expSnap = await getDocs(
      query(
        collection(db, 'expenses'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
    )

    const expenses = expSnap.docs.map((d) => d.data())
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

    const docRef = await addDoc(collection(db, 'payments'), {
      amount: totalAmount,
      user1Amount: sharedTotal / 2 + user1OnlyTotal,
      user2Amount: sharedTotal / 2 + user2OnlyTotal,
      month: monthNum,
      year: yearNum,
      paidAt: Timestamp.now(),
    })

    return NextResponse.json({ id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
