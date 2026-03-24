# 🍳 Roomie Meals

> Recetario compartido para planear la comida de la semana y generar la lista del súper automáticamente.

El plan del domingo en minutos. La compra sin drama. Para todos en el depa al mismo tiempo.

![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat&logo=netlify&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

---

## ✨ Qué hace

| Función | Detalle |
|---|---|
| 📖 Recetario | Emojis, búsqueda y edición rápida |
| 📅 Planeación semanal | Asigna recetas por día o busca por platillo |
| 🛒 Lista del súper | Sin duplicados, con progreso, por categoría o por día |
| 📋 Copiar con un clic | Lista lista para pegar en el chat del grupo |
| 🔄 Sincronización en tiempo real | Todos ven lo mismo al instante |

---

## 🧭 Flujo real
```
Agregar recetas → Planear la semana → Generar lista → Ir al súper ✓
```

1. **Recetario** — Agrega platillos con ingredientes y emoji.
2. **Plan semanal** — El domingo asignas cada receta a su día.
3. **Súper** — La app arma la lista consolidada y la vas palomeando.

---

## 🚀 Correr local

### 1. Instala dependencias
```bash
npm install
```

### 2. Configura Firebase

Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com) y habilita **Firestore** en modo prueba.

Luego pega tu configuración en `src/firebase.js`:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "roomie-meals-xxxx.firebaseapp.com",
  projectId: "roomie-meals-xxxx",
  storageBucket: "roomie-meals-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

### 3. Levanta el servidor
```bash
npm run dev
```

---

## 🌍 Deploy en Netlify

**Opción A — Drag & drop**
```bash
npm run build
# Sube la carpeta dist/ en netlify.com
```

**Opción B — Desde GitHub (recomendado)**

1. Sube el repo a GitHub.
2. En Netlify: `Add new site → Import from Git`.
3. Configura:
   - Build command: `npm run build`
   - Publish directory: `dist`

---

## 🗂️ Estructura de datos (Firestore)
```
firestore/
├── meals/          ← colección de recetas
│   └── {mealId}
│       ├── name
│       ├── emoji
│       ├── ingredients   (string[])
│       └── createdAt
└── plans/
    └── current     ← plan de la semana activa
        └── days    ({ lunes: mealId, martes: mealId, ... })
```

---

## 🔒 Reglas de Firestore

Para uso entre roomies el modo prueba funciona bien. Si prefieres reglas explícitas:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Estas reglas permiten acceso público. Agrega autenticación antes de compartir la URL con desconocidos.

---

## 🧩 Roadmap

- [ ] Autenticación por link o email
- [ ] Historial de semanas anteriores
- [ ] Exportar lista a PDF
- [ ] Inventario de despensa para no comprar de más
- [ ] Modo oscuro

---

## 🤝 Contribuir

¿Lo usas y le agregaste algo? ¡Se agradece el PR! Abre un issue primero para platicar el cambio.

---

## 🫶 Hecho para vivir con roomies
```
Hecho con ♥ para el depa
```
