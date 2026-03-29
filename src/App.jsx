import { useState, useEffect } from 'react'
import { db } from './firebase'
import {
  collection, doc, onSnapshot, addDoc, deleteDoc,
  updateDoc, setDoc, serverTimestamp, orderBy, query
} from 'firebase/firestore'
import Recetario from './components/Recetario.jsx'
import Semana from './components/Semana.jsx'
import SuperList from './components/SuperList.jsx'
import Caja from './components/Caja.jsx'
import styles from './App.module.css'

const TABS = [
  { id: 'recetario', label: '🍳 Recetario' },
  { id: 'semana',    label: '📅 Semana' },
  { id: 'super',     label: '🛒 Súper' },
  { id: 'caja',      label: '💵 Caja' },
]

export default function App() {
  const [tab, setTab] = useState('recetario')
  const [meals, setMeals] = useState([])
  const [week, setWeekState] = useState({})
  const [loading, setLoading] = useState(true)

  // Real-time: meals
  useEffect(() => {
    const q = query(collection(db, 'meals'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  // Real-time: week plan
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'plans', 'current'), snap => {
      if (snap.exists()) setWeekState(snap.data())
    })
    return unsub
  }, [])

  const addMeal = async (name, ingredients, emoji) => {
    await addDoc(collection(db, 'meals'), {
      name,
      ingredients,
      emoji: emoji || '🍽️',
      createdAt: serverTimestamp()
    })
  }

  const deleteMeal = async (id) => {
    await deleteDoc(doc(db, 'meals', id))
  }

  const updateMeal = async (id, name, ingredients, emoji) => {
    await updateDoc(doc(db, 'meals', id), { name, ingredients, emoji })
  }

  const updateWeek = async (newWeek) => {
    await setDoc(doc(db, 'plans', 'current'), newWeek)
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIconWrap}>🍳</div>
            <div>
              <h1 className={styles.logoTitle}>Roomie Meals</h1>
              <p className={styles.logoSub}>el recetario de la casa</p>
            </div>
          </div>
          <nav className={styles.nav}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`${styles.navBtn} ${tab === t.id ? styles.active : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingDots}>
              <span /><span /><span />
            </div>
            <p className={styles.loadingText}>Conectando con Firebase…</p>
          </div>
        ) : (
          <>
            {tab === 'recetario' && (
              <Recetario meals={meals} onAdd={addMeal} onDelete={deleteMeal} onUpdate={updateMeal} />
            )}
            {tab === 'semana' && (
              <Semana meals={meals} week={week} onUpdate={updateWeek} />
            )}
            {tab === 'super' && (
              <SuperList meals={meals} week={week} />
            )}
            {tab === 'caja' && (
              <Caja />
            )}
          </>
        )}
      </main>
    </div>
  )
}
