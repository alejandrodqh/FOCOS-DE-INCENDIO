# 🔥 IGNIS-Harmonize
### *Calendario de Actividad de Fuego Armonizado (MODIS & VIIRS) con Google Gemini Fire Intelligence*
**Desafío NASA Space Apps:** *Regímenes de Fuego / Burning Activity Calendars*

---

## 📌 1. Visión General del Proyecto

En las últimas dos décadas, los cambios globales en el uso del suelo, el cambio climático y la actividad humana han alterado drásticamente la frecuencia, intensidad y estacionalidad de los incendios forestales. Para que el personal de respuesta a emergencias, bomberos forestales, científicos y tomadores de decisiones puedan anticipar y mitigar estas catástrofes, necesitan **calendarios históricos de actividad de quema** consistentes y actualizados.

Sin embargo, existe un obstáculo técnico crítico en la teledetección espacial de **NASA FIRMS**:
- **MODIS (Terra y Aqua):** Proporciona un registro histórico continuo desde el año 2000 con una resolución de píxel térmico de **1.0 km** en el nadir. No obstante, se encuentra cerca del final de su vida operativa.
- **VIIRS (S-NPP, NOAA-20 y NOAA-21):** Reemplazo moderno con resolución de **375 m** en bandas de imágenes ($I$-band). Debido a su mayor resolución, **VIIRS detecta entre 3.0x y 4.2x más focos de calor** para el mismo incendio que MODIS.
- **El Problema:** Si se grafican los datos de MODIS (2000-2011) y VIIRS (2012-presente) sin armonización, se produce una **falsa ilusión de un aumento catastrófico del 300%** en 2012 que distorsiona la toma de decisiones.

**IGNIS-Harmonize** resuelve este desafío combinando un **motor matemático de armonización satelital**, un **calendario interactivo de actividad de quema con rampas de color accesibles**, y un **módulo de inteligencia artificial impulsado por la API de Google Gemini (Gemini Fire Intelligence)**.

---

## 🌟 2. La Característica de Google Gemini API (El Diferenciador)

Integramos la API de **Google Gemini** (`gemini-2.5-flash`) para transformar los datos numéricos de anomalías satelitales en inteligencia procesable de nivel de mando para protección civil y bomberos:

```
┌─────────────────────────────────┐      ┌───────────────────────────────┐
│     NASA Earthdata FIRMS        │      │    Algoritmo de Calibración   │
│  MODIS (1 km) + VIIRS (375 m)   │ ───> │        IGNIS Harmonize        │
└─────────────────────────────────┘      └──────────────┬────────────────┘
                                                        │
                                                        ▼
                                         ┌───────────────────────────────┐
                                         │    Métricas & Anomalías vs    │
                                         │   Mediana Histórica (20 años) │
                                         └──────────────┬────────────────┘
                                                        │
                                                        ▼
                                         ┌───────────────────────────────┐
                                         │     GOOGLE GEMINI API         │
                                         │  (gemini-2.5-flash / Pro)     │
                                         └──────────────┬────────────────┘
                                                        │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         ▼                                                             ▼
         ┌───────────────────────────────┐                             ┌───────────────────────────────┐
         │ 🚨 Diagnóstico Ejecutivo IA   │                             │ 💬 Asistente "Ask FIRMS AI"   │
         │ - Semáforo de Riesgo (ROJO)   │                             │ - Consultas en lenguaje natural│
         │ - Ruptura de Régimen Ecológico│                             │ - Comparación con años récord │
         │ - Recomendaciones de Brigada  │                             │ - Ventanas de quema segura    │
         └───────────────────────────────┘                             └───────────────────────────────┘
```

### Funcionalidades de Gemini Implementadas:
1. **Diagnóstico Ejecutivo Oficial de Régimen de Fuego:**
   - Evalúa si el mes seleccionado corresponde a la temporada seca típica o a un **desfase temporal peligroso**.
   - Analiza la Potencia Radiativa del Fuego (**FRP promedio en MW**) y el estrés hídrico de la biomasa.
   - Determina el semáforo de riesgo: `Verde`, `Amarillo`, `Naranja` o `Rojo`.
   - Proporciona **recomendaciones tácticas inmediatas** para defensa civil (declaratoria de moratoria de quemas, refuerzo de patrullajes, avisos de PM2.5 por humo).
2. **Asistente Conversacional Multiturno ("Ask FIRMS AI"):**
   - Responde preguntas complejas de usuarios no técnicos o brigadistas:
     * *"¿Por qué es fundamental armonizar MODIS y VIIRS en este ecosistema?"*
     * *"¿Cuáles fueron los peores años históricos de incendios en esta región?"*
     * *"¿Cuándo es la ventana segura para realizar quemas prescritas o controladas?"*
3. **Modo Demostración / Simulación de Alta Fidelidad:**
   - Diseñado específicamente para que los jueces de la hackathon puedan probar el 100% de la funcionalidad de inmediato, incluso antes de ingresar su clave personal de Gemini API.

---

## 🔬 3. Metodología de Armonización MODIS-VIIRS

Para crear un calendario continuo de 24 años (2001 - 2024), IGNIS aplica:

1. **Relación Empírica por Ecorregión:** Durante el periodo de solapamiento satelital (2012-2023), se calcula el ratio de detección:
   $$\beta_{\text{región}} = \frac{N_{\text{VIIRS}}}{N_{\text{MODIS}}}$$
   Donde $\beta$ oscila entre **3.15 y 3.45** según la cobertura del dosel forestal y la temperatura de fondo.
2. **Normalización Espacial a Escala Consistente:**
   Para $t \ge 2012$:
   $$N_{\text{Armonizado}} = \alpha \cdot N_{\text{MODIS}} + (1 - \alpha) \cdot \left(\frac{N_{\text{VIIRS}}}{\beta_{\text{región}}}\right)$$
3. **Climatología de Línea Base (2001 - 2020):**
   Se calcula la mediana mensual histórica ($\tilde{M}_m$) y percentiles 25, 75 y 90.
4. **Cálculo de Anomalía Porcentual:**
   $$\Delta\% = \left(\frac{N_{\text{actual}} - \tilde{M}_m}{\tilde{M}_m}\right) \times 100\%$$

> **Demostración en la App:** Puedes presionar el botón **"Datos Crudos (Salto 2012)"** en la barra superior para ver el error que cometen las herramientas no armonizadas, y volver a **"Armonizado"** para ver la curva real corregida.

---

## 🎨 4. Experiencia de Usuario: Simple, Intuitiva y Fácil de Administrar

Para que la herramienta sea fácil de entender y manipular tanto para brigadistas y personal de emergencia como para los jueces de la hackathon:

1. **Guía Rápida en 3 Pasos (Sin Complicaciones):**
   - **Paso 1: ¿Dónde?** Selecciona la región en un menú desplegable claro con banderas y nombres comunes.
   - **Paso 2: ¿Cuándo?** Navega con botones sencillos de `[ ◀ Mes Anterior ]` y `[ Siguiente Mes ▶ ]`, o simplemente toca cualquier celda del calendario.
   - **Paso 3: Diagnóstico IA:** Presiona el botón `[ ✨ Analizar con Gemini IA ]` para obtener el reporte oficial en segundos.

2. **Frase de Resumen Humana:**
   - La aplicación traduce los datos técnicos a un lenguaje claro e inmediato:
     > *"En Agosto de 2024, la región de Bosque Seco Chiquitano registró 28,400 focos de calor, lo que representa un +294% más de incendios que el promedio habitual de los últimos 20 años."*

3. **Navegación Espaciosa por Pestañas:**
   - 📅 **1. Calendario de Quemas:** Matriz de 24 años con celdas interactivas y rampas de color accesibles (Inferno, Viridis para daltonismo).
   - 🗺️ **2. Mapa Satelital:** Mapa Leaflet a pantalla amplia con puntos calientes, dibujo de área de interés y coordenadas.
   - 🤖 **3. Asistente Gemini AI:** Informe oficial para bomberos y chat interactivo con preguntas de 1 clic.
   - 📈 **4. Gráficos & Comparación:** Climatología de 20 años y serie histórica de tendencias.
   - ⚙️ **5. Panel de Administración:**
     * Interruptor del algoritmo de **Armonización Satelital (MODIS vs VIIRS)** con botón para demostrar el salto del 300% de 2012 sin armonizar.
     * **Carga de Datos Personalizados (CSV):** Zona para arrastrar y soltar tus propios archivos CSV de NASA FIRMS.
     * Selector de paletas de color accesibles.
     * Configuración de la clave de Gemini API.

---

## 🚀 5. Cómo Ejecutar el Proyecto

La aplicación es completamente autosuficiente y no requiere complejas instalaciones ni bases de datos.

### Opción A: Servidor Local con Python (Recomendada)
En la carpeta del proyecto, ejecuta:
```bash
py -3.9 server.py
# o también:
python server.py
```
Abre tu navegador en: [http://localhost:8000](http://localhost:8000)

### Opción B: Ejecución Directa en el Navegador
Simplemente haz doble clic sobre el archivo [index.html](file:///c:/Users/alejo/Desktop/Espace%20apps/index.html) en el explorador de archivos para abrirlo en cualquier navegador moderno (Edge, Chrome, Firefox).

---

## 🔑 6. Configurar tu Gemini API Key (Opcional)

1. Obtén tu clave gratuita en [Google AI Studio](https://aistudio.google.com/).
2. Haz clic en el botón **"Configurar Gemini API"** en la esquina superior derecha de la aplicación.
3. Pega tu API Key y haz clic en **"Guardar Configuración"**.
4. ¡Listo! La aplicación utilizará el modelo de razonamiento en vivo de Google. Si no ingresas una clave, el sistema operará automáticamente en el **Modo Demostración Inteligente**.

---

## 👥 7. Tecnologías Utilizadas

- **Inteligencia Artificial:** Google Gemini API (`gemini-2.5-flash` / Google GenAI Interactions)
- **Datos Satelitales:** NASA Earthdata FIRMS (MODIS Collection 6.1 & VIIRS 375m)
- **Frontend:** HTML5 semántico, Tailwind CSS, FontAwesome 6
- **Cartografía:** Leaflet.js con capas Esri World Imagery & CartoDB
- **Gráficos & Visualización:** Chart.js & Canvas API
- **Backend / Servidor:** Python 3 (servidor HTTP estándar con soporte CORS)
