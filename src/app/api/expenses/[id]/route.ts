import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const docRef = doc(db, 'expenses', id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    }

    await deleteDoc(docRef)
    return NextResponse.json({ message: 'Despesa excluída com sucesso' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 })
  }
}
