import { useEffect, useMemo, useState } from 'react'
import { db } from '../firebase'
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  where,
  writeBatch,
  setDoc,
  serverTimestamp,
  orderBy,
  query
} from 'firebase/firestore'
import styles from './Caja.module.css'

const DEFAULT_BOX = {
  weeklyAmount: 500,
  members: [],
  weekStart: null
}

const moneyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
})

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const monthFormatter = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric'
})

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const formatMoney = (value) => moneyFormatter.format(Number(value || 0))

const getWeekStart = (date = new Date()) => {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

const toDate = (value) => {
  if (!value) return null
  if (value.toDate) return value.toDate()
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (value.seconds) return new Date(value.seconds * 1000)
  return null
}

const formatDate = (value) => {
  const d = toDate(value)
  return d ? dateFormatter.format(d) : ''
}

const formatMonth = (value) => {
  const d = toDate(value)
  return d ? monthFormatter.format(d) : 'Sin fecha'
}

const normalizeMember = (member, weeklyAmount) => {
  const weekPaid =
    typeof member.weekPaid === 'number'
      ? member.weekPaid
      : member.paid
      ? weeklyAmount
      : 0
  const debtAmount =
    typeof member.debtAmount === 'number'
      ? member.debtAmount
      : 0
  const contributes =
    typeof member.contributes === 'boolean'
      ? member.contributes
      : true
  return {
    ...member,
    weekPaid,
    debtAmount,
    contributes,
    paidAt: member.paidAt || null
  }
}

const getDebtLabel = (debtAmount, weeklyAmount) => {
  if (!debtAmount) return ''
  if (!weeklyAmount) return `Debe ${formatMoney(debtAmount)}`
  const weeks = Math.floor(debtAmount / weeklyAmount)
  const remainder = debtAmount - weeks * weeklyAmount
  const parts = []
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`)
  if (remainder > 0) parts.push(`+ ${formatMoney(remainder)}`)
  return `Debe ${parts.join(' ')}`
}

export default function Caja() {
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [box, setBox] = useState(DEFAULT_BOX)
  const [loadingBox, setLoadingBox] = useState(true)

  const [type, setType] = useState('in')
  const [amount, setAmount] = useState('')
  const [person, setPerson] = useState('')
  const [description, setDescription] = useState('')
  const [savingTx, setSavingTx] = useState(false)

  const [newMember, setNewMember] = useState('')
  const [newMemberContributes, setNewMemberContributes] = useState(true)
  const [weeklyAmount, setWeeklyAmount] = useState(DEFAULT_BOX.weeklyAmount)
  const [savingWeekly, setSavingWeekly] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editType, setEditType] = useState('in')
  const [editAmount, setEditAmount] = useState('')
  const [editPerson, setEditPerson] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [debtPayments, setDebtPayments] = useState({})
  const [weekPayments, setWeekPayments] = useState({})

  const [filterType, setFilterType] = useState('all')
  const [filterPerson, setFilterPerson] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'cash'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingTx(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    const cleanupOldTransactions = async () => {
      const now = new Date()
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const cutoff = previousMonthStart
      const q = query(
        collection(db, 'cash'),
        where('createdAt', '<', cutoff),
        orderBy('createdAt', 'asc')
      )
      const snap = await getDocs(q)
      if (snap.empty) return
      const batch = writeBatch(db)
      snap.forEach(docSnap => batch.delete(docSnap.ref))
      await batch.commit()
    }
    cleanupOldTransactions()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'cashbox', 'current'), snap => {
      if (snap.exists()) {
        const data = snap.data()
        const weeklyAmount = data.weeklyAmount ?? DEFAULT_BOX.weeklyAmount
        const normalizedMembers = (data.members || []).map(m =>
          normalizeMember(m, weeklyAmount)
        )
        setBox({
          ...DEFAULT_BOX,
          ...data,
          weeklyAmount,
          members: normalizedMembers
        })
      } else {
        setBox(DEFAULT_BOX)
      }
      setLoadingBox(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!loadingBox) {
      setWeeklyAmount(box.weeklyAmount ?? DEFAULT_BOX.weeklyAmount)
    }
  }, [box.weeklyAmount, loadingBox])

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const value = Number(t.amount) || 0
        if (t.type === 'out') acc.out += value
        else acc.in += value
        return acc
      },
      { in: 0, out: 0 }
    )
  }, [transactions])

  const balance = totals.in - totals.out

  const members = box.members || []
  const weeklyAmountValue = Number(box.weeklyAmount) || 0
  const contributingMembers = members.filter(m => m.contributes !== false)
  const paidMembers = contributingMembers.filter(
    m => (m.weekPaid || 0) >= weeklyAmountValue
  )
  const pendingMembers = contributingMembers.filter(
    m => (m.weekPaid || 0) < weeklyAmountValue
  )
  const expectedWeekly = weeklyAmountValue * contributingMembers.length
  const paidWeekly = contributingMembers.reduce(
    (sum, m) => sum + Math.min(m.weekPaid || 0, weeklyAmountValue),
    0
  )
  const pendingWeekly = Math.max(expectedWeekly - paidWeekly, 0)

  const peopleOptions = useMemo(() => {
    const set = new Set()
    members.forEach(m => set.add(m.name))
    transactions.forEach(t => {
      if (t.person) set.add(t.person)
    })
    return Array.from(set)
  }, [members, transactions])

  const filteredTransactions = useMemo(() => {
    let list = transactions
    if (filterType !== 'all') {
      list = list.filter(t => t.type === filterType)
    }
    if (filterPerson === '__none__') {
      list = list.filter(t => !t.person)
    } else if (filterPerson !== 'all') {
      list = list.filter(t => t.person === filterPerson)
    }
    return list
  }, [transactions, filterType, filterPerson])

  const groupedTransactions = useMemo(() => {
    const groups = []
    let currentLabel = null
    filteredTransactions.forEach(tx => {
      const label = formatMonth(tx.createdAt)
      if (label !== currentLabel) {
        groups.push({ label, items: [] })
        currentLabel = label
      }
      groups[groups.length - 1].items.push(tx)
    })
    return groups
  }, [filteredTransactions])

  useEffect(() => {
    if (loadingBox) return
    let timerId = null

    const checkWeekRollover = async () => {
      const currentWeekStart = getWeekStart()
      const lastWeekStart = toDate(box.weekStart)
      if (!lastWeekStart) {
        await setDoc(
          doc(db, 'cashbox', 'current'),
          { weekStart: currentWeekStart.toISOString(), updatedAt: serverTimestamp() },
          { merge: true }
        )
        return
      }
      if (lastWeekStart < currentWeekStart) {
        resetWeek()
      }
    }

    checkWeekRollover()
    timerId = setInterval(checkWeekRollover, 60 * 1000)
    return () => clearInterval(timerId)
  }, [box.weekStart, loadingBox, members, weeklyAmountValue])

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    const value = Math.abs(parseFloat(amount))
    const desc = description.trim()
    if (!value || !desc) return
    if (type === 'out' && !person.trim()) return
    setSavingTx(true)
    await addDoc(collection(db, 'cash'), {
      type,
      amount: value,
      description: desc,
      person: person.trim(),
      kind: 'manual',
      createdAt: serverTimestamp()
    })
    setSavingTx(false)
    setType('in')
    setAmount('')
    setPerson('')
    setDescription('')
  }

  const startEdit = (tx) => {
    setEditingId(tx.id)
    setEditType(tx.type || 'in')
    setEditAmount(tx.amount ?? '')
    setEditPerson(tx.person || '')
    setEditDescription(tx.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditType('in')
    setEditAmount('')
    setEditPerson('')
    setEditDescription('')
  }

  const saveEdit = async (id) => {
    const value = Math.abs(parseFloat(editAmount))
    const desc = editDescription.trim()
    if (!value || !desc) return
    if (editType === 'out' && !editPerson.trim()) return
    setEditSaving(true)
    await updateDoc(doc(db, 'cash', id), {
      type: editType,
      amount: value,
      person: editPerson.trim(),
      description: desc
    })
    setEditSaving(false)
    cancelEdit()
  }

  const removeTransaction = async (tx) => {
    const ok = window.confirm('¿Eliminar este movimiento?')
    if (!ok) return
    await deleteDoc(doc(db, 'cash', tx.id))

    if (tx.kind === 'weekly' && tx.memberId) {
      const member = members.find(m => m.id === tx.memberId)
      if (member) {
        const txWeekStart = toDate(tx.weekStart)
        const currentWeekStart = getWeekStart()
        let nextMembers = members
        if (txWeekStart && txWeekStart < currentWeekStart) {
          nextMembers = members.map(m =>
            m.id === member.id
              ? {
                  ...m,
                  debtAmount: (m.debtAmount || 0) + (Number(tx.amount) || 0)
                }
              : m
          )
        } else {
          nextMembers = members.map(m =>
            m.id === member.id
              ? {
                  ...m,
                  weekPaid: Math.max((m.weekPaid || 0) - (Number(tx.amount) || 0), 0)
                }
              : m
          )
        }
        setBox(prev => ({ ...prev, members: nextMembers }))
        await setDoc(
          doc(db, 'cashbox', 'current'),
          { members: nextMembers, updatedAt: serverTimestamp() },
          { merge: true }
        )
      }
    }

    if (tx.kind === 'debt' && tx.memberId) {
      const member = members.find(m => m.id === tx.memberId)
      if (member) {
        const nextMembers = members.map(m =>
          m.id === member.id
            ? {
                ...m,
                debtAmount: (m.debtAmount || 0) + (Number(tx.amount) || 0)
              }
            : m
        )
        setBox(prev => ({ ...prev, members: nextMembers }))
        await setDoc(
          doc(db, 'cashbox', 'current'),
          { members: nextMembers, updatedAt: serverTimestamp() },
          { merge: true }
        )
      }
    }

    if (editingId === tx.id) cancelEdit()
  }

  const saveWeeklyAmount = async () => {
    const value = Math.abs(parseFloat(weeklyAmount))
    if (!value) return
    setSavingWeekly(true)
    setBox(prev => ({ ...prev, weeklyAmount: value }))
    await setDoc(
      doc(db, 'cashbox', 'current'),
      { weeklyAmount: value, updatedAt: serverTimestamp() },
      { merge: true }
    )
    setSavingWeekly(false)
  }

  const addMember = async (e) => {
    e.preventDefault()
    const name = newMember.trim()
    if (!name) return
    const next = [
      ...members,
      {
        id: createId(),
        name,
        weekPaid: 0,
        debtAmount: 0,
        paidAt: null,
        contributes: newMemberContributes
      }
    ]
    setBox(prev => ({ ...prev, members: next }))
    setNewMember('')
    setNewMemberContributes(true)
    await setDoc(
      doc(db, 'cashbox', 'current'),
      { members: next, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  const toggleContributes = async (id) => {
    const next = members.map(m =>
      m.id === id ? { ...m, contributes: !m.contributes } : m
    )
    setBox(prev => ({ ...prev, members: next }))
    await setDoc(
      doc(db, 'cashbox', 'current'),
      { members: next, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  const payWeek = async (id, amountOverride) => {
    const member = members.find(m => m.id === id)
    if (!member || !weeklyAmountValue || member.contributes === false) return
    const weekPaid = Number(member.weekPaid) || 0
    const remaining = Math.max(weeklyAmountValue - weekPaid, 0)
    if (!remaining) return
    const amountValue = Math.min(
      Math.abs(parseFloat(amountOverride || remaining)),
      remaining
    )
    if (!amountValue) return
    await addDoc(collection(db, 'cash'), {
      type: 'in',
      amount: amountValue,
      description: 'Aporte semanal',
      person: member.name,
      kind: 'weekly',
      memberId: member.id,
      weekStart: getWeekStart().toISOString(),
      createdAt: serverTimestamp()
    })
    const next = members.map(m =>
      m.id === id
        ? { ...m, weekPaid: weekPaid + amountValue, paidAt: new Date().toISOString() }
        : m
    )
    setBox(prev => ({ ...prev, members: next }))
    await setDoc(
      doc(db, 'cashbox', 'current'),
      { members: next, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  const payDebt = async (id, amount, isFull = false) => {
    const member = members.find(m => m.id === id)
    if (!member) return
    const debtAmount = Number(member.debtAmount) || 0
    if (!debtAmount) return
    const value = Math.min(Math.abs(parseFloat(amount)), debtAmount)
    if (!value) return
    await addDoc(collection(db, 'cash'), {
      type: 'in',
      amount: value,
      description: isFull ? 'Saldar deuda' : 'Pago de deuda',
      person: member.name,
      kind: 'debt',
      memberId: member.id,
      createdAt: serverTimestamp()
    })
    const next = members.map(m =>
      m.id === id
        ? { ...m, debtAmount: Math.max((m.debtAmount || 0) - value, 0) }
        : m
    )
    setBox(prev => ({ ...prev, members: next }))
    await setDoc(
      doc(db, 'cashbox', 'current'),
      { members: next, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  const removeMember = async (id) => {
    const next = members.filter(m => m.id !== id)
    setBox(prev => ({ ...prev, members: next }))
    await setDoc(
      doc(db, 'cashbox', 'current'),
      { members: next, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  const resetWeek = async () => {
    const weekStart = getWeekStart()
    const next = members.map(m => {
      const weekPaid = Number(m.weekPaid) || 0
      const debtAmount = Number(m.debtAmount) || 0
      const remaining =
        m.contributes === false ? 0 : Math.max(weeklyAmountValue - weekPaid, 0)
      return {
        ...m,
        weekPaid: 0,
        debtAmount: debtAmount + remaining,
        paidAt: null
      }
    })
    setBox(prev => ({ ...prev, members: next, weekStart: weekStart.toISOString() }))
    await setDoc(
      doc(db, 'cashbox', 'current'),
      {
        members: next,
        weekStart: weekStart.toISOString(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  }

  return (
    <div className="fade-up">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Dinero en caja</h2>
          <p className={styles.subtitle}>
            Saldo actual: <strong>{formatMoney(balance)}</strong>
          </p>
        </div>
        <div className={styles.headerMeta}>
          {box.weekStart && (
            <span className={styles.weekStart}>
              Semana desde {formatDate(box.weekStart)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Saldo</p>
          <p className={styles.statValue}>{formatMoney(balance)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ingresos</p>
          <p className={`${styles.statValue} ${styles.statPositive}`}>
            {formatMoney(totals.in)}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Gastos</p>
          <p className={`${styles.statValue} ${styles.statNegative}`}>
            {formatMoney(totals.out)}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <form className={styles.form} onSubmit={handleAddTransaction}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>Registrar movimiento</h3>
            <p className={styles.formHint}>Ingresos y gastos del bote.</p>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo</label>
              <select
                className={styles.select}
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="in">Ingreso</option>
                <option value="out">Gasto</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Monto</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                placeholder="500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>¿Quién?</label>
            <select
              className={styles.select}
              value={person}
              onChange={e => setPerson(e.target.value)}
              required={type === 'out'}
              disabled={type === 'out' && members.length === 0}
            >
              <option value="">Sin nombre</option>
              {members.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descripción</label>
            <input
              className={styles.input}
              type="text"
              placeholder="ej. Compra del súper"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          <button className={styles.primaryBtn} type="submit" disabled={savingTx}>
            {savingTx ? 'Guardando…' : 'Guardar movimiento'}
          </button>
        </form>

        <div className={styles.weekBox}>
          <div className={styles.weekHeader}>
            <div>
              <h3 className={styles.formTitle}>Caja semanal</h3>
              <p className={styles.formHint}>
                Cada roomie aporta la misma cantidad. La semana inicia el lunes.
              </p>
              <p className={styles.formHint}>
                Pagar semana o abonar agrega un ingreso automático al historial.
              </p>
              <p className={styles.formHint}>
                Corte automático: domingo 11:59 pm → lunes 12:00 am.
              </p>
            </div>
          </div>

          <div className={styles.weekAmountRow}>
            <div className={styles.field}>
              <label className={styles.label}>Aporte por persona</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                value={weeklyAmount}
                onChange={e => setWeeklyAmount(e.target.value)}
              />
            </div>
            <button
              className={styles.secondaryBtn}
              onClick={saveWeeklyAmount}
              type="button"
              disabled={savingWeekly}
            >
              {savingWeekly ? 'Guardando…' : 'Actualizar'}
            </button>
          </div>

          <div className={styles.weekSummary}>
            <div className={styles.weekSummaryRow}>
              <span>Esperado</span>
              <strong>{formatMoney(expectedWeekly)}</strong>
            </div>
            <div className={styles.weekSummaryRow}>
              <span>Pagado</span>
              <strong>{formatMoney(paidWeekly)}</strong>
            </div>
            <div className={styles.weekSummaryRow}>
              <span>Falta</span>
              <strong>{formatMoney(pendingWeekly)}</strong>
            </div>
          </div>

          <form className={styles.addMemberRow} onSubmit={addMember}>
            <div className={styles.addMemberControls}>
              <input
                className={styles.input}
                type="text"
                placeholder="Agregar roomie"
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
              />
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={newMemberContributes}
                  onChange={e => setNewMemberContributes(e.target.checked)}
                />
                Aporta semanalmente
              </label>
            </div>
            <button className={styles.secondaryBtn} type="submit">
              + Agregar
            </button>
          </form>

          {members.length === 0 ? (
            <p className={styles.emptySmall}>
              Agrega a tus roomies para ver quién debe.
            </p>
          ) : (
            <div className={styles.memberList}>
              {members.map(member => {
                const weekPaid = Number(member.weekPaid) || 0
                const remainingWeek =
                  member.contributes === false
                    ? 0
                    : Math.max(weeklyAmountValue - weekPaid, 0)
                const debtAmount = Number(member.debtAmount) || 0
                const debtLabel = getDebtLabel(debtAmount, weeklyAmountValue)
                const debtInput = debtPayments[member.id] ?? ''

                return (
                  <div
                    key={member.id}
                    className={`${styles.memberItem} ${
                      remainingWeek === 0 ? styles.memberPaid : ''
                    }`}
                  >
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>{member.name}</p>
                      <p className={styles.memberMeta}>
                        Semana actual:{' '}
                        {member.contributes === false
                          ? 'no aporta'
                          : remainingWeek === 0
                          ? 'pagado'
                          : `falta ${formatMoney(remainingWeek)}`}
                        {member.paidAt ? ` · ${formatDate(member.paidAt)}` : ''}
                      </p>
                      {debtAmount > 0 && (
                        <p className={styles.memberDebt}>{debtLabel}</p>
                      )}
                    </div>
                    <div className={styles.memberActions}>
                      {member.contributes === false ? (
                        <span className={styles.exemptTag}>No aporta</span>
                      ) : remainingWeek > 0 ? (
                        <button
                          className={styles.payBtn}
                          onClick={() => payWeek(member.id)}
                          type="button"
                        >
                          Pagar restante
                        </button>
                      ) : (
                        <span className={`${styles.statusPill} ${styles.statusPaid}`}>
                          Pagado
                        </span>
                      )}
                      <button
                        className={styles.toggleBtn}
                        onClick={() => toggleContributes(member.id)}
                        type="button"
                        title="Cambiar aporte semanal"
                      >
                        {member.contributes === false ? 'Activar aporte' : 'Quitar aporte'}
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => removeMember(member.id)}
                        type="button"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>

                    {member.contributes !== false && remainingWeek > 0 && (
                      <div className={styles.weekRow}>
                        <input
                          className={styles.input}
                          type="number"
                          inputMode="decimal"
                          placeholder={`${remainingWeek}`}
                          value={weekPayments[member.id] ?? ''}
                          onChange={e =>
                            setWeekPayments(prev => ({
                              ...prev,
                              [member.id]: e.target.value
                            }))
                          }
                        />
                        <button
                          className={styles.secondaryBtn}
                          type="button"
                          onClick={() => {
                            const value = weekPayments[member.id] || remainingWeek
                            payWeek(member.id, value)
                            setWeekPayments(prev => ({ ...prev, [member.id]: '' }))
                          }}
                        >
                          Abonar semana
                        </button>
                      </div>
                    )}

                    {debtAmount > 0 && (
                      <div className={styles.debtRow}>
                        <input
                          className={styles.input}
                          type="number"
                          inputMode="decimal"
                          placeholder={`${weeklyAmountValue || 500}`}
                          value={debtInput}
                          onChange={e =>
                            setDebtPayments(prev => ({
                              ...prev,
                              [member.id]: e.target.value
                            }))
                          }
                        />
                        <div className={styles.debtActions}>
                          <button
                            className={styles.secondaryBtn}
                            type="button"
                            onClick={() => {
                              const value = debtInput || weeklyAmountValue
                              payDebt(member.id, value, false)
                              setDebtPayments(prev => ({ ...prev, [member.id]: '' }))
                            }}
                          >
                            Abonar
                          </button>
                          <button
                            className={styles.ghostBtn}
                            type="button"
                            onClick={() => {
                              payDebt(member.id, debtAmount, true)
                              setDebtPayments(prev => ({ ...prev, [member.id]: '' }))
                            }}
                          >
                            Saldar deuda
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {pendingMembers.length > 0 && (
            <div className={styles.pendingBox}>
              <p className={styles.pendingTitle}>Pendientes semana</p>
              <p className={styles.pendingNames}>
                {pendingMembers.map(m => m.name).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.log}>
        <div className={styles.logHeader}>
          <div>
            <h3 className={styles.formTitle}>Movimientos</h3>
            {!loadingTx && (
              <span className={styles.logMeta}>
                {transactions.length} registros · últimos 2 meses
              </span>
            )}
          </div>
          <div className={styles.logFilters}>
            <select
              className={styles.select}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="in">Ingresos</option>
              <option value="out">Gastos</option>
            </select>
            <select
              className={styles.select}
              value={filterPerson}
              onChange={e => setFilterPerson(e.target.value)}
            >
              <option value="all">Todas las personas</option>
              <option value="__none__">Sin nombre</option>
              {peopleOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingTx ? (
          <p className={styles.emptySmall}>Cargando movimientos…</p>
        ) : transactions.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>💵</p>
            <p>No hay movimientos todavía.</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <p className={styles.emptySmall}>No hay movimientos para ese filtro.</p>
        ) : (
          <div className={styles.txnGroups}>
            {groupedTransactions.map(group => (
              <div key={group.label} className={styles.monthGroup}>
                <p className={styles.monthLabel}>{group.label}</p>
                <div className={styles.txnList}>
                  {group.items.map(tx => {
                    const isEditing = editingId === tx.id
                    const isAuto = tx.kind === 'weekly' || tx.kind === 'debt'
                    const personOptions = members.map(m => m.name)
                    const editOptions =
                      editPerson && !personOptions.includes(editPerson)
                        ? [...personOptions, editPerson]
                        : personOptions

                    return (
                      <div
                        key={tx.id}
                        className={`${styles.txn} ${
                          tx.type === 'out' ? styles.txnOut : styles.txnIn
                        }`}
                      >
                        <div className={styles.txnMain}>
                          {isEditing ? (
                            <div className={styles.txnEdit}>
                              <div className={styles.txnEditRow}>
                                <select
                                  className={styles.select}
                                  value={editType}
                                  onChange={e => setEditType(e.target.value)}
                                >
                                  <option value="in">Ingreso</option>
                                  <option value="out">Gasto</option>
                                </select>
                                <input
                                  className={styles.input}
                                  type="number"
                                  inputMode="decimal"
                                  value={editAmount}
                                  onChange={e => setEditAmount(e.target.value)}
                                />
                              </div>
                              <div className={styles.txnEditRow}>
                                <select
                                  className={styles.select}
                                  value={editPerson}
                                  onChange={e => setEditPerson(e.target.value)}
                                  required={editType === 'out'}
                                >
                                  <option value="">Sin nombre</option>
                                  {editOptions.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className={styles.txnEditRow}>
                                <input
                                  className={styles.input}
                                  type="text"
                                  value={editDescription}
                                  onChange={e => setEditDescription(e.target.value)}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={styles.txnTitle}>{tx.description}</p>
                              <p className={styles.txnMeta}>
                                {tx.person ? `por ${tx.person}` : 'sin nombre'}
                                {tx.createdAt && ` · ${formatDate(tx.createdAt)}`}
                              </p>
                            </>
                          )}
                        </div>

                        <div className={styles.txnRight}>
                          {isEditing ? (
                            <div className={styles.txnEditActions}>
                              <button
                                className={styles.secondaryBtn}
                                type="button"
                                onClick={() => saveEdit(tx.id)}
                                disabled={editSaving}
                              >
                                {editSaving ? 'Guardando…' : 'Guardar'}
                              </button>
                              <button
                                className={styles.ghostBtn}
                                type="button"
                                onClick={cancelEdit}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className={styles.txnAmount}>
                                {tx.type === 'out' ? '-' : '+'} {formatMoney(tx.amount)}
                              </div>
                              <div className={styles.txnActions}>
                                {isAuto ? (
                                  <span className={styles.autoTag}>Auto</span>
                                ) : (
                                  <button
                                    className={styles.editBtn}
                                    type="button"
                                    onClick={() => startEdit(tx)}
                                  >
                                    Editar
                                  </button>
                                )}
                                <button
                                  className={styles.deleteBtnSmall}
                                  type="button"
                                  onClick={() => removeTransaction(tx)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
