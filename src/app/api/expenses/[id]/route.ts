import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const expense = await prisma.expense.findUnique({ where: { id } })

    if (!expense) {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    return NextResponse.json({ message: 'Despesa excluída com sucesso' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 })
  }
}
