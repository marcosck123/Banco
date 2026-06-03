import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase'

export async function GET() {
  try {
    const db = getDb()
    const snapshot = await db.collection('payments').orderBy('paidAt', 'desc').get()
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
    const db = getDb()
    const body = await request.json()
    const { user1Paid, user2Paid, month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 })
    }

    const u1 = parseFloat(user1Paid) || 0
    const u2 = parseFloat(user2Paid) || 0

    // Fetch all unpaid expenses for this month and mark them as paid
    const { Timestamp: TS } = await import('firebase-admin/firestore')
    const startDate = TS.fromDate(new Date(parseInt(year), parseInt(month) - 1, 1))
    const endDate = TS.fromDate(new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999))

    const expSnap = await db.collection('expenses')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .where('paid', '==', false)
      .get()

    const expenseIds = expSnap.docs
      .filter((d) => d.data().recordType !== 'investimento')
      .map((d) => d.id)

    const batch = db.batch()

    const paymentRef = db.collection('payments').doc()
    batch.set(paymentRef, {
      user1Paid: u1,
      user2Paid: u2,
      totalPaid: u1 + u2,
      month: parseInt(month),
      year: parseInt(year),
      expenseCount: expenseIds.length,
      expenseIds,
      paidAt: Timestamp.now(),
    })

    for (const id of expenseIds) {
      batch.update(db.collection('expenses').doc(id), { paid: true })
    }

    await batch.commit()

    return NextResponse.json({ id: paymentRef.id, expenseCount: expenseIds.length }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
