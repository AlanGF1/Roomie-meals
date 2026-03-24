import { useState } from 'react'
import styles from './Recetario.module.css'

const EMOJIS = ['🍝', '🌮', '🥗', '🍜', '🍔', '🥘', '🍣', '🫕', '🥩', '🍛', '🥞', '🍲']

export default function Recetario({ meals, onAdd, onDelete, onUpdate }) {
  const [name, setName]         = useState('')
  const [ingText, setIngText]   = useState('')
  const [emoji, setEmoji]       = useState('🍝')
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState(null)

  // Edit state
  const [editingId, setEditingId]   = useState(null)
  const [editName, setEditName]     = useState('')
  const [editIng, setEditIng]       = useState('')
  const [editEmoji, setEditEmoji]   = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim() || !ingText.trim()) return
    setSaving(true)
    const ingredients = ingText
      .split('\n')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    await onAdd(name.trim(), ingredients, emoji)
    setName('')
    setIngText('')
    setEmoji('🍝')
    setSaving(false)
  }

  const startEdit = (meal, e) => {
    e.stopPropagation()
    setEditingId(meal.id)
    setEditName(meal.name)
    setEditIng(meal.ingredients?.join('\n') || '')
    setEditEmoji(meal.emoji || '🍝')
    setExpanded(meal.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return
    setEditSaving(true)
    const ings = editIng
      .split('\n')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    await onUpdate(id, editName.trim(), ings, editEmoji)
    setEditSaving(false)
    setEditingId(null)
  }

  const filtered = meals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.ingredients?.some(i => i.includes(search.toLowerCase()))
  )

  return (
    <div className="fade-up">
      {/* ── Add form ── */}
      <form className={styles.form} onSubmit={handleAdd}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Agregar platillo</h2>
        </div>

        {/* Emoji picker */}
        <div className={styles.field}>
          <label className={styles.label}>Categoría</label>
          <div className={styles.emojiGrid}>
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                className={`${styles.emojiBtn} ${emoji === e ? styles.emojiSelected : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre del platillo</label>
            <input
              className={styles.input}
              type="text"
              placeholder="ej. Jalapeño chicken"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Ingredientes <span className={styles.hint}>(uno por línea)</span>
          </label>
          <textarea
            className={styles.textarea}
            placeholder={"pollo\njalapeño\nsalsa de soya\nzanahoria\najo"}
            value={ingText}
            onChange={e => setIngText(e.target.value)}
            required
          />
        </div>

        <button className={styles.addBtn} type="submit" disabled={saving}>
          {saving ? 'Guardando…' : '+ Agregar al recetario'}
        </button>
      </form>

      {/* ── List header ── */}
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>
          {meals.length} {meals.length === 1 ? 'platillo' : 'platillos'}
        </h2>
        {meals.length > 2 && (
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.search}
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <p className={styles.empty}>
          {meals.length === 0
            ? '¡Agrega tu primer platillo arriba! 👆'
            : 'No hay resultados para esa búsqueda.'}
        </p>
      )}

      <div className={styles.grid}>
        {filtered.map((meal, i) => {
          const isEditing = editingId === meal.id
          const isExpanded = expanded === meal.id

          return (
            <div
              key={meal.id}
              className={`${styles.card} ${isExpanded ? styles.cardOpen : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Card Top */}
              <div
                className={styles.cardTop}
                onClick={() => {
                  if (!isEditing) setExpanded(isExpanded ? null : meal.id)
                }}
              >
                <div className={styles.cardLeft}>
                  <span className={styles.mealEmoji}>{meal.emoji || '🍽️'}</span>
                  <div>
                    <p className={styles.mealName}>{meal.name}</p>
                    <p className={styles.mealCount}>
                      {meal.ingredients?.length || 0} ingredientes
                    </p>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={e => isEditing ? cancelEdit() : startEdit(meal, e)}
                    title={isEditing ? 'Cancelar' : 'Editar'}
                  >
                    {isEditing ? '✕' : '✏️'}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); onDelete(meal.id) }}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                  {!isEditing && (
                    <span className={`${styles.chevron} ${isExpanded ? styles.open : ''}`}>›</span>
                  )}
                </div>
              </div>

              {/* Edit mode */}
              {isEditing && (
                <div className={styles.editPanel} onClick={e => e.stopPropagation()}>
                  <div className={styles.field}>
                    <label className={styles.label}>Categoría</label>
                    <div className={styles.emojiGrid}>
                      {EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          className={`${styles.emojiBtn} ${editEmoji === e ? styles.emojiSelected : ''}`}
                          onClick={() => setEditEmoji(e)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Nombre</label>
                    <input
                      className={styles.input}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Ingredientes <span className={styles.hint}>(uno por línea)</span>
                    </label>
                    <textarea
                      className={styles.textarea}
                      value={editIng}
                      onChange={e => setEditIng(e.target.value)}
                    />
                  </div>
                  <div className={styles.editActions}>
                    <button className={styles.cancelBtn} onClick={cancelEdit}>Cancelar</button>
                    <button
                      className={styles.saveBtn}
                      onClick={() => handleSaveEdit(meal.id)}
                      disabled={editSaving}
                    >
                      {editSaving ? 'Guardando…' : '✓ Guardar cambios'}
                    </button>
                  </div>
                </div>
              )}

              {/* Ingredients (expanded, view mode) */}
              {isExpanded && !isEditing && (
                <div className={styles.ingredients}>
                  {meal.ingredients?.map(ing => (
                    <span key={ing} className={styles.tag}>{ing}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
