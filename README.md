# 🎰 Lucky English Casino (Vegas English Learning)

Una aplicación web educativa ambientada en un casino de Las Vegas para el aprendizaje interactivo de inglés. Cuenta con tres máquinas de juego (Tragamonedas, Ruleta de la Fortuna y Blackjack), generación inteligente de actividades con **Groq AI (Llama 3.3)**, síntesis de voz en inglés (**TTS**), efectos sonoros de casino con **Web Audio API**, y backend en **Firebase Firestore** con soporte completo de modo offline/local.

---

## 🎲 Características Principales

1. **🎰 Lucky Slots 777 (Tragamonedas Educativa)**:
   - 3 rodillos animados con símbolos clásicos (Cerezas, Limones, Campanas, Tréboles, Diamantes y 7s de la suerte).
   - Palanca mecánica con sonido de trinquete (*lever pull*).
   - Desafíos de inglés para validar giros y multiplicar pagos de fichas.
   - Jackpots con lluvia de confeti y fanfarria triunfal.

2. **🎡 Roulette of Fortune (Ruleta de la Fortuna)**:
   - Ruleta renderizada en tiempo real mediante **HTML5 Canvas** con física de desaceleración y sonido mecánico de aguja (*needle tick*).
   - Casillas temáticas con multiplicadores: Gramática (x2), Vocabulario (x3), Pronunciación (x2), Modismos (x4), y Mega Jackpot (x5).
   - Apuestas de fichas por giro y preguntas según la casilla ganadora.

3. **🃏 21 Blackjack Lingua (Blackjack de Preguntas)**:
   - Mesa de tapiz verde con mazo de 52 cartas, valores dinámicos para los Ases (1 u 11) y carta oculta (*hole card*) del croupier.
   - Mecánica pedagógica: Para pedir carta (**HIT**) o doblar (**DOUBLE**), el estudiante debe responder correctamente una pregunta en inglés.
   - Pago clásico 3 a 2 para Blackjack natural con As y carta de valor 10.

4. **🤖 Generador de Actividades con Groq AI**:
   - Integración directa con **Groq Cloud API** utilizando modelos de última generación como `llama-3.3-70b-versatile` y `llama-3.1-8b-instant`.
   - El docente ingresa el tema (ej. *Phrasal Verbs with Get & Look*, *Job Interviews*, *Irregular Verbs*), selecciona el nivel CEFR (A1 a C1), la cantidad de preguntas y la máquina de destino.
   - Las preguntas incluyen 4 opciones, retroalimentación pedagógica explicada y valor en fichas.
   - La API Key se guarda localmente en el navegador del docente (`localStorage`), garantizando privacidad y costo cero de servidor.

5. **🔊 Audio Inmersivo y Text-to-Speech (TTS)**:
   - **Sintetizador Web Audio API**: Sonidos 100% nativos sin dependencias externas (monedas metálicas, giro de ruleta, deslizamiento de cartas, zumbador de error, campanas de acierto y fanfarria de jackpot).
   - **TTS Integrado (SpeechSynthesis API)**: Pronunciación nativa en inglés para preguntas y opciones, con control de velocidad y selección de acento (US/UK).

6. **👥 Acceso Rápido para Estudiantes (Estilo Kahoot)**:
   - Entrada con **PIN de sala de 6 dígitos** (ej. `VERB77`, `SPIN24`, `CARD21`) o mediante enlace directo (`?pin=VERB77`).
   - Selección de avatar de la suerte (🎩, 👑, 🍀, 🦊, 🤖, 💎, 🎲, 🦁) y apodo sin necesidad de registrarse.
   - Tabla de clasificación (**Leaderboard**) para premiar a los mejores jugadores.

---

## 🚀 Despliegue en GitHub Pages

Este proyecto ya está preconfigurado para compilar con rutas relativas (`base: './'`) e incluye un flujo de trabajo automatizado en `.github/workflows/deploy.yml`.

### Pasos para publicar:

1. Crea un nuevo repositorio en GitHub.
2. Sube el código del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Lucky English Casino"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```
3. En tu repositorio de GitHub:
   - Ve a **Settings** > **Pages**.
   - En **Source**, selecciona **GitHub Actions**.
   - ¡Listo! En unos segundos tu aplicación estará en línea en:
     `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

---

## 🔥 Configuración de Backend (Firebase Firestore)

La aplicación funciona de forma **100% autónoma en modo local** sin configuración previa. Si deseas sincronizar salas y puntajes centralizados en Firebase:

1. Ingresa a la [Consola de Firebase](https://console.firebase.google.com/) y crea un proyecto.
2. Agrega una **Web App** y copia el objeto `firebaseConfig`.
3. Ve a **Firestore Database** > **Crear base de datos**.
4. En la pestaña **Reglas**, permite lectura y escritura básica para actividades y marcadores:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /activities/{document=**} {
         allow read, write: if true;
       }
       match /leaderboard/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
5. En la aplicación, abre el menú **⚙️ Settings** > pestaña **Firebase Backend**, pega tu configuración y haz clic en **Save Firebase Config**.

---

## 🛠️ Ejecución Local

Para ejecutar y probar la aplicación en tu máquina:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev

# Compilar para producción
npm run build
```
