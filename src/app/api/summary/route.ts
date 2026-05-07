import { NextRequest, NextResponse } from 'next/server'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

const DEFAULT_SETTINGS = {
  creditLimit: 65000,
  user1Name: 'Você',
  user2Name: 'Namorada',
}

async function getSettings() {
  const settingsRef = doc(db, 'settings', 'default')
  const snap = await getDoc(settingsRef)
  if (!snap.exists()) {
    await setDoc(settingsRef, DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  return snap.data() as typeof DEFAULT_SETTINGS
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    const now = new Date()
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1
    const year = yearParam ? parseInt(yearParam) : now.getFullYear()

    const startDate = Timestamp.fromDate(new Date(year, month - 1, 1))
    const endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59, 999))

    const [settings, expSnap, paySnap] = await Promise.all([
      getSettings(),
      getDocs(
        query(
          collection(db, 'expenses'),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        )
      ),
      getDocs(
        query(
          collection(db, 'payments'),
          where('month', '==', month),
          where('year', '==', year)
        )
      ),
    ])

    const expenses = expSnap.docs.map((d) => d.data())
    const payment = paySnap.empty ? null : { id: paySnap.docs[0].id, ...paySnap.docs[0].data() }

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)

    const sharedTotal = expenses
      .filter((e) => e.splitType === 'shared' || !e.splitType)
      .reduce((sum, e) => sum + e.amount, 0)

    const user1OnlyTotal = expenses
      .filter((e) => e.splitType === 'user1_only')
      .reduce((sum, e) => sum + e.amount, 0)

    const user2OnlyTotal = expenses
      .filter((e) => e.splitType === 'user2_only')
      .reduce((sum, e) => sum + e.amount, 0)

    const user1Spent = expenses
      .filter((e) => e.paidBy === 'user1')
      .reduce((sum, e) => sum + e.amount, 0)

    const user2Spent = expenses
      .filter((e) => e.paidBy === 'user2')
      .reduce((sum, e) => sum + e.amount, 0)

    const user1Due = sharedTotal / 2 + user1OnlyTotal
    const user2Due = sharedTotal / 2 + user2OnlyTotal

    return NextResponse.json({
      month,
      year,
      totalSpent,
      sharedTotal,
      user1OnlyTotal,
      user2OnlyTotal,
      user1Spent,
      user2Spent,
      user1Due,
      user2Due,
      availableBalance: settings.creditLimit - totalSpent,
      creditLimit: settings.creditLimit,
      eachShare: totalSpent / 2,
      isPaid: !!payment,
      payment,
      user1Name: settings.user1Name,
      user2Name: settings.user2Name,
      expenseCount: expenses.length,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json({ error: 'Erro ao buscar resumo' }, { status: 500 })
  }
}
