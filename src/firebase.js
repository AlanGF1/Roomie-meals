import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBptCbPzuqOiSazYjeUTHB6fKmqED2OUnI",
  authDomain: "comidacasa-3755c.firebaseapp.com",
  projectId: "comidacasa-3755c",
  storageBucket: "comidacasa-3755c.firebasestorage.app",
  messagingSenderId: "1008735630304",
  appId: "1:1008735630304:web:9d99298e21b3d82cdbf185"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
