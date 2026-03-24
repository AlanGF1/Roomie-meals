import { useState, useMemo, useEffect, useRef } from 'react'
import styles from './Semana.module.css'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ICONS = ['☀️', '🌤️', '⛅', '🌥️', '🎉', '😎']

function MealPickerModal({ meals, currentId, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const filtered = useMemo(() =>
    meals.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.ingredients?.some(i => i.toLowerCase().includes(search.toLowerCase()))
    ),
    [meals, search]
  )

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Elegir platillo</p>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalSearch}>
          <span className={styles.modalSearchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.modalSearchInput}
            type="text"
            placeholder="Buscar por nombre o ingrediente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        {currentId && (
          <button className={styles.removeOption} onClick={() => { onSelect(null); onClose() }}>
            <span>🚫</span> Quitar platillo del día
          </button>
        )}
        <div className={styles.modalGrid}>
          {filtered.length === 0 ? (
            <p className={styles.modalEmpty}>No hay resultados para "{search}"</p>
          ) : (
            filtered.map(meal => {
              const isSelected = meal.id === currentId
              return (
                <button
                  key={meal.id}
                  className={`${styles.mealOption} ${isSelected ? styles.mealOptionSelected : ''}`}
                  onClick={() => { onSelect(meal.id); onClose() }}
                >
                  <span className={styles.mealOptionEmoji}>{meal.emoji || '🍽️'}</span>
                  <div className={styles.mealOptionInfo}>
                    <p className={styles.mealOptionName}>{meal.name}</p>
                    <p className={styles.mealOptionCount}>{meal.ingredients?.length || 0} ingredientes</p>
                  </div>
                  {isSelected && <span className={styles.mealOptionCheck}>✓</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function Semana({ meals, week, onUpdate }) {
  const days = week?.days || {}
  const [pickerDay, setPickerDay] = useState(null)

  // "Pick first" mode: select a recipe card below, then click a day
  const [stagedMealId, setStagedMealId] = useState(null)

  const assignDay = async (day, mealId) => {
    const next = { ...days }
    if (!mealId) {
      delete next[day]
    } else {
      next[day] = mealId
    }
    await onUpdate({ days: next })
  }

  const handleDayClick = (day) => {
    if (stagedMealId) {
      // Mode 2: a recipe was already selected — assign it and clear staging
      assignDay(day, stagedMealId)
      setStagedMealId(null)
    } else {
      // Mode 1: open the search modal
      setPickerDay(day)
    }
  }

  const clearAll = async () => {
    await onUpdate({ days: {} })
  }

  const assignedCount = Object.keys(days).length
  const remaining = DAYS.length - assignedCount
  const stagedMeal = meals.find(m => m.id === stagedMealId)

  return (
    <div className="fade-up">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Comidas de la semana</h2>
          <p className={styles.subtitle}>
            {stagedMeal
              ? `✅ Ahora haz click en el día para asignar "${stagedMeal.name}"`
              : assignedCount === 0
              ? 'Elige una receta abajo o toca un día para buscar'
              : assignedCount === DAYS.length
              ? '🎉 ¡Toda la semana planeada!'
              : `${assignedCount} de ${DAYS.length} días planeados · faltan ${remaining}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          {stagedMeal && (
            <button className={styles.cancelStageBtn} onClick={() => setStagedMealId(null)}>
              Cancelar
            </button>
          )}
          {assignedCount > 0 && !stagedMeal && (
            <button className={styles.clearBtn} onClick={clearAll}>
              Limpiar todo
            </button>
          )}
        </div>
      </div>

      {meals.length === 0 ? (
        <p className={styles.empty}>Primero agrega platillos en el Recetario.</p>
      ) : (
        <>
          {/* ── Day grid ── */}
          <div className={`${styles.weekGrid} ${stagedMeal ? styles.weekGridStaged : ''}`}>
            {DAYS.map((day, di) => {
              const assignedId = days[day]
              const assignedMeal = meals.find(m => m.id === assignedId)
              return (
                <div
                  key={day}
                  className={`${styles.dayCard}
                    ${assignedMeal ? styles.dayCardFilled : ''}
                    ${stagedMeal ? styles.dayCardStageable : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={styles.dayHeader}>
                    <span className={styles.dayIcon}>{DAY_ICONS[di]}</span>
                    <span className={styles.dayName}>{day}</span>
                    {assignedMeal && !stagedMeal && (
                      <button
                        className={styles.clearDayBtn}
                        onClick={e => { e.stopPropagation(); assignDay(day, null) }}
                        title="Quitar"
                      >×</button>
                    )}
                  </div>

                  {assignedMeal ? (
                    <div className={styles.assignedMeal}>
                      <span className={styles.assignedEmoji}>{assignedMeal.emoji || '🍽️'}</span>
                      <span className={styles.assignedName}>{assignedMeal.name}</span>
                    </div>
                  ) : (
                    <div className={styles.dayEmpty}>
                      <span className={styles.addIcon}>
                        {stagedMeal ? '→' : '+'}
                      </span>
                      <span>{stagedMeal ? 'Asignar aquí' : 'Elegir platillo'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Recipe panel below ── */}
          <div className={styles.recipePanel}>
            <div className={styles.recipePanelHeader}>
              <span className={styles.recipePanelTitle}>
                {stagedMeal
                  ? `"${stagedMeal.name}" seleccionado — elige un día arriba`
                  : 'Todas las recetas'}
              </span>
              {stagedMeal && (
                <span className={styles.recipePanelHint}>o elige otra receta</span>
              )}
            </div>

            <div className={styles.recipeGrid}>
              {meals.map(meal => {
                const isStaged = meal.id === stagedMealId
                const assignedTo = DAYS.find(d => days[d] === meal.id)
                return (
                  <button
                    key={meal.id}
                    className={`${styles.recipeCard}
                      ${isStaged ? styles.recipeCardStaged : ''}
                      ${assignedTo ? styles.recipeCardAssigned : ''}`}
                    onClick={() => setStagedMealId(isStaged ? null : meal.id)}
                  >
                    <span className={styles.recipeCardEmoji}>{meal.emoji || '🍽️'}</span>
                    <div className={styles.recipeCardInfo}>
                      <p className={styles.recipeCardName}>{meal.name}</p>
                      <p className={styles.recipeCardMeta}>
                        {assignedTo
                          ? <span className={styles.recipeCardDay}>📅 {assignedTo}</span>
                          : <span>{meal.ingredients?.length || 0} ing.</span>}
                      </p>
                    </div>
                    {isStaged && <span className={styles.recipeCardCheck}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Summary ── */}
          {assignedCount > 0 && (
            <div className={styles.summary}>
              <p className={styles.summaryLabel}>Resumen de la semana</p>
              <div className={styles.summaryList}>
                {DAYS.map(day => {
                  const meal = meals.find(m => m.id === days[day])
                  return meal ? (
                    <div key={day} className={styles.summaryItem}>
                      <span className={styles.summaryDay}>{day}</span>
                      <span className={styles.summaryDot} />
                      <span className={styles.summaryMeal}>{meal.emoji || '🍽️'} {meal.name}</span>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal picker (Mode 1) */}
      {pickerDay && (
        <MealPickerModal
          meals={meals}
          currentId={days[pickerDay]}
          onSelect={id => assignDay(pickerDay, id)}
          onClose={() => setPickerDay(null)}
        />
      )}
    </div>
  )
}
