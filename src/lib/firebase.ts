import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function getDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(
        JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
        )
      ),
    })
  }
  return getFirestore()
}
