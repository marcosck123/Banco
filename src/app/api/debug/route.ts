import { NextResponse } from 'next/server'

export async function GET() {
  const report: Record<string, unknown> = {}

  // 1. Check env var
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  report.envVar = key
    ? `present (${key.length} chars)`
    : 'MISSING'

  // 2. Try to parse the key
  if (key) {
    try {
      const decoded = Buffer.from(key, 'base64').toString()
      const parsed = JSON.parse(decoded)
      report.keyParsed = 'ok'
      report.projectId = parsed.project_id ?? '(not found in key)'
      report.clientEmail = parsed.client_email ?? '(not found in key)'
    } catch (e: any) {
      report.keyParsed = `FAILED: ${e.message}`
    }
  }

  // 3. Try to init firebase-admin and do a simple Firestore read
  if (key && report.keyParsed === 'ok') {
    try {
      const { getDb } = await import('@/lib/firebase')
      const db = getDb()
      report.firebaseInit = 'ok'

      const snap = await db.collection('settings').doc('default').get()
      report.firestoreRead = 'ok'
      report.settingsExists = snap.exists
      if (snap.exists) {
        report.settings = snap.data()
      }
    } catch (e: any) {
      report.firestoreError = e.message
      report.firestoreStack = e.stack?.split('\n').slice(0, 5).join('\n')
    }
  }

  return NextResponse.json(report, { status: 200 })
}
