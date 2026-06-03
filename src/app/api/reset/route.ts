import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

async function deleteCollection(collectionName: string) {
  const db = getDb()
  const snapshot = await db.collection(collectionName).get()
  if (snapshot.empty) return 0

  // Firestore batch limit is 500
  const chunks: typeof snapshot.docs[] = []
  for (let i = 0; i < snapshot.docs.length; i += 500) {
    chunks.push(snapshot.docs.slice(i, i + 500))
  }

  for (const chunk of chunks) {
    const batch = db.batch()
    chunk.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }

  return snapshot.docs.length
}

export async function DELETE() {
  try {
    const [expenses, payments] = await Promise.all([
      deleteCollection('expenses'),
      deleteCollection('payments'),
    ])
    return NextResponse.json({ deleted: { expenses, payments } })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Erro ao resetar' }, { status: 500 })
  }
}
