import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDtnoMaLsyEk9h2L-KNA__01MpvTpYcyWs",
  authDomain: "note-app-4af6a.firebaseapp.com",
  projectId: "note-app-4af6a",
  storageBucket: "note-app-4af6a.firebasestorage.app",
  messagingSenderId: "787083793891",
  appId: "1:787083793891:web:d83cb12231620bc3713cd6",
  measurementId: "G-Z1VFH202LM"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)