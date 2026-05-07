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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const expensesRef = collection(db, 'expenses')
    let q

    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const startDate = Timestamp.fromDate(new Date(yearNum, monthNum - 1, 1))
      const endDate = Timestamp.fromDate(new Date(yearNum, monthNum, 0, 23, 59, 59, 999))
      q = query(
        expensesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      )
    } else {
      q = query(expensesRef, orderBy('date', 'desc'))
    }

    const snapshot = await getDocs(q)
    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.()?.toISOString() ?? doc.data().date,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? doc.data().createdAt,
    }))

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

    const docRef = await addDoc(collection(db, 'expenses'), {
      amount: parseFloat(amount),
      description,
      paidBy,
      category,
      date: Timestamp.fromDate(new Date(date)),
      splitType,
      createdAt: Timestamp.now(),
    })

    return NextResponse.json({ id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 })
  }
}
