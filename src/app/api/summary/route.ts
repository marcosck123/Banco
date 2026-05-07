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

    const investments = expenses.filter((e) => e.recordType === 'investimento')
    const outflows = expenses.filter((e) => e.recordType !== 'investimento')
    const unpaidOutflows = outflows.filter((e) => !e.paid)

    const totalInvested = investments.reduce((sum, e) => sum + e.amount, 0)
    const totalSpent = outflows.reduce((sum, e) => sum + e.amount, 0)
    const totalPaid = outflows.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0)

    const sharedTotal = unpaidOutflows
      .filter((e) => e.splitType === 'shared' || !e.splitType)
      .reduce((sum, e) => sum + e.amount, 0)

    const user1OnlyTotal = unpaidOutflows
      .filter((e) => e.splitType === 'user1_only')
      .reduce((sum, e) => sum + e.amount, 0)

    const user2OnlyTotal = unpaidOutflows
      .filter((e) => e.splitType === 'user2_only')
      .reduce((sum, e) => sum + e.amount, 0)

    const user1Invested = investments
      .filter((e) => e.paidBy === 'user1')
      .reduce((sum, e) => sum + e.amount, 0)

    const user2Invested = investments
      .filter((e) => e.paidBy === 'user2')
      .reduce((sum, e) => sum + e.amount, 0)

    const user1Due = sharedTotal / 2 + user1OnlyTotal
    const user2Due = sharedTotal / 2 + user2OnlyTotal

    return NextResponse.json({
      month,
      year,
      totalSpent,
      totalPaid,
      totalUnpaid: totalSpent - totalPaid,
      totalInvested,
      sharedTotal,
      user1OnlyTotal,
      user2OnlyTotal,
      user1Invested,
      user2Invested,
      user1Due,
      user2Due,
      availableBalance: settings.creditLimit + totalInvested - totalSpent,
      creditLimit: settings.creditLimit,
      eachShare: totalSpent / 2,
      isPaid: unpaidOutflows.length === 0 && outflows.length > 0,
      payment,
      user1Name: settings.user1Name,
      user2Name: settings.user2Name,
      expenseCount: outflows.length,
      investmentCount: investments.length,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json({ error: 'Erro ao buscar resumo' }, { status: 500 })
  }
}
