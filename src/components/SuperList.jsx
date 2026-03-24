import { useState, useMemo } from 'react'
import styles from './SuperList.module.css'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ICONS = ['☀️', '🌤️', '⛅', '🌥️', '🎉', '😎']

// Keyword-based category grouping
const CATEGORIES = [
  { label: 'Verduras y frutas', emoji: '🥦', keywords: ['cebolla','ajo','zanahoria','tomate','jitomate','papa','pepino','lechuga','espinaca','chile','jalapeño','limón','naranja','aguacate','cilantro','apio','brócoli','chayote','acelga','elote','pimiento','champiñon','hongo','betabel'] },
  { label: 'Proteínas', emoji: '🥩', keywords: ['pollo','carne','res','cerdo','pescado','atún','camarón','salmon','huevo','chorizo','tocino','pavo','jamón','costilla','bistec'] },
  { label: 'Lácteos', emoji: '🧀', keywords: ['leche','queso','crema','mantequilla','yogurt','manteca','crema agria'] },
  { label: 'Granos y pastas', emoji: '🌾', keywords: ['arroz','frijol','lenteja','pasta','espagueti','harina','pan','tortilla','avena','garbanzo','fideo'] },
  { label: 'Salsas y condimentos', emoji: '🧴', keywords: ['salsa','soya','catsup','mostaza','mayonesa','aceite','vinagre','chile en polvo','comino','orégano','pimienta','sal','azúcar','miel','consomé','caldo'] },
  { label: 'Otros', emoji: '🛍️', keywords: [] },
]

function categorize(ingredients) {
  const groups = {}
  CATEGORIES.forEach(c => { groups[c.label] = [] })

  ingredients.forEach(ing => {
    const lower = ing.toLowerCase()
    let matched = false
    for (const cat of CATEGORIES.slice(0, -1)) {
      if (cat.keywords.some(kw => lower.includes(kw))) {
        groups[cat.label].push(ing)
        matched = true
        break
      }
    }
    if (!matched) groups['Otros'].push(ing)
  })

  return CATEGORIES
    .filter(c => groups[c.label].length > 0)
    .map(c => ({ ...c, items: groups[c.label] }))
}

export default function SuperList({ meals, week }) {
  const [checked, setChecked] = useState(new Set())
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('category') // 'category' | 'day'

  // week.days = { Lunes: mealId, ... }
  const days = week?.days || {}
  const selectedIds = Object.values(days).filter(Boolean)

  const { ingredients, selectedMeals } = useMemo(() => {
    const allIng = []
    const selMeals = []
    selectedIds.forEach(id => {
      const meal = meals.find(m => m.id === id)
      if (!meal) return
      if (!selMeals.find(m => m.id === id)) selMeals.push(meal)
      meal.ingredients?.forEach(ing => {
        if (!allIng.includes(ing)) allIng.push(ing)
      })
    })
    return { ingredients: allIng.sort(), selectedMeals: selMeals }
  }, [meals, days])

  const groups = useMemo(() => categorize(ingredients), [ingredients])

  // Por día: generar una lista de ingredientes por día asignado
  const daysItems = useMemo(() => {
    return DAYS.map((day, di) => {
      const mealId = days[day]
      const meal = meals.find(m => m.id === mealId)
      if (!meal || !meal.ingredients?.length) return null
      return {
        label: day,
        emoji: DAY_ICONS[di],
        mealName: meal.name,
        mealEmoji: meal.emoji || '🍽️',
        items: meal.ingredients
      }
    }).filter(Boolean)
  }, [days, meals])

  const toggle = (ing) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(ing)) next.delete(ing)
      else next.add(ing)
      return next
    })
  }

  const resetChecked = () => setChecked(new Set())

  const copyList = () => {
    const remaining = ingredients.filter(i => !checked.has(i))
    const text = `Lista del súper 🛒\n\n${remaining.map(i => `• ${i}`).join('\n')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const remaining = ingredients.length - checked.size
  const progress = ingredients.length > 0 ? (checked.size / ingredients.length) * 100 : 0

  return (
    <div className="fade-up">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Lista del súper</h2>
          {ingredients.length > 0 ? (
            <p className={styles.subtitle}>
              {remaining === 0
                ? '🎉 ¡Todo conseguido!'
                : `${remaining} de ${ingredients.length} pendientes`}
            </p>
          ) : (
            <p className={styles.subtitle}>Asigna platillos en la pestaña Semana</p>
          )}
        </div>
        {ingredients.length > 0 && (
          <div className={styles.actions}>
            {checked.size > 0 && (
              <button className={styles.ghostBtn} onClick={resetChecked}>Reiniciar</button>
            )}
            <button className={styles.copyBtn} onClick={copyList}>
              {copied ? '¡Copiado! ✓' : '📋 Copiar lista'}
            </button>
          </div>
        )}
      </div>

      {/* Meals this week */}
      {selectedMeals.length > 0 && (
        <div className={styles.meals}>
          <p className={styles.mealsLabel}>Esta semana</p>
          <div className={styles.mealTags}>
            {selectedMeals.map(m => (
              <span key={m.id} className={styles.mealTag}>
                {m.emoji || '🍽️'} {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>🛒</p>
          <p>No hay ingredientes todavía.</p>
          <p className={styles.emptyHint}>
            Ve a <strong>Semana</strong>, asigna platillos y la lista aparece aquí sola.
          </p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={styles.progressLabel}>{Math.round(progress)}%</span>
          </div>

          {/* View Mode Toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'category' ? styles.toggleBtnActive : ''}`}
              onClick={() => setViewMode('category')}
            >
              🏷️ Por categoría
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'day' ? styles.toggleBtnActive : ''}`}
              onClick={() => setViewMode('day')}
            >
              📅 Por día
            </button>
          </div>

          {/* Grouped ingredient list */}
          <div className={styles.groups}>
            {(viewMode === 'category' ? groups : daysItems).map(group => (
              <div key={group.label} className={styles.group}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupHeaderLeft}>
                    <span className={styles.groupEmoji}>{group.emoji}</span>
                    <span className={styles.groupLabel}>{group.label}</span>
                    {group.mealName && (
                      <span className={styles.groupSubLabel}>· {group.mealEmoji} {group.mealName}</span>
                    )}
                  </div>
                  <span className={styles.groupCount}>
                    {group.items.filter(i => checked.has(i)).length}/{group.items.length}
                  </span>
                </div>
                <ul className={styles.list}>
                  {group.items.map(ing => {
                    const done = checked.has(ing)
                    return (
                      <li
                        key={ing}
                        className={`${styles.item} ${done ? styles.done : ''}`}
                        onClick={() => toggle(ing)}
                      >
                        <span className={`${styles.checkbox} ${done ? styles.checkboxDone : ''}`}>
                          {done && (
                            <svg viewBox="0 0 20 20" className={styles.checkSvg}>
                              <polyline
                                points="4,10 8,14 16,6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span className={styles.ingName}>{ing}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {checked.size === ingredients.length && ingredients.length > 0 && (
            <div className={styles.allDone}>
              🎉 ¡Todo listo para surtir! Ya tienen todo para cocinar esta semana.
            </div>
          )}
        </>
      )}
    </div>
  )
}
