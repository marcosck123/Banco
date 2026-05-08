import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const docRef = db.collection('expenses').doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    }

    await docRef.delete()
    return NextResponse.json({ message: 'Despesa excluída com sucesso' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 })
  }
}
