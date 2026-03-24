# 🍳 Roomie Meals

Recetario compartido para planear la comida de la semana y generar la lista del súper automáticamente. Diseñado para que el plan del domingo dure minutos y la compra sea sin drama.

---

## ✨ Lo bonito de esta app

- Recetario con emojis, búsqueda y edición rápida.
- Planeación semanal con dos modos: elegir receta y asignar día, o buscar por día.
- Lista del súper única, sin duplicados, con progreso y modo por categoría o por día.
- Copiar lista con un clic para mandarla al chat.
- Sincronización en tiempo real para que todos vean lo mismo al instante.

---

## 🧭 Cómo funciona (flujo real)

1. Agregas recetas con sus ingredientes.
2. El domingo asignas platillos a los días.
3. La pestaña **Súper** arma la lista y la puedes ir palomeando.

---

## 🗂️ Estructura de datos (Firestore)

- `meals` (colección)
- `plans/current` (documento)

Cada receta guarda:
- `name`
- `ingredients` (array de strings)
- `emoji`
- `createdAt`

El plan semanal guarda:
- `days` (objeto con clave por día y valor `mealId`)

---

## 🧪 Stack

- React + Vite
- Firebase Firestore
- Netlify

---

## 🚀 Corre local

1. Instala dependencias

```bash
npm install
```

2. Crea tu proyecto en Firebase y habilita Firestore (modo prueba)

```text
https://console.firebase.google.com
```

3. Pega tu config en `src/firebase.js`

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

4. Arranca el dev server

```bash
npm run dev
```

---

## 🌍 Deploy en Netlify

### Opción A: Drag & drop

1. Build

```bash
npm run build
```

2. Sube la carpeta `dist/` a Netlify

```text
https://netlify.com
```

### Opción B: Desde GitHub (recomendado)

1. Sube el repo
2. En Netlify: `Add new site → Import from Git`
3. Build command: `npm run build`
4. Publish directory: `dist`

---

## 🔒 Reglas de Firestore (opcional)

Para uso entre roomies está bien con modo prueba. Si quieres reglas explícitas:

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

---

## 🧩 Ideas para mejorar después

- Autenticación simple por link o email.
- Historial de semanas anteriores.
- Exportar lista a PDF.
- Inventario de despensa para evitar comprar de más.

---

## 🫶 Hecho para vivir con roomies

Si lo usas y le haces mejoras, ¡me encantaría verlas!
