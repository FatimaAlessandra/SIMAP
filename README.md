# Sistema Web de Monitoreo, Semaforización e Inteligencia de Acompañamiento Pedagógico (SIMAP)

> **Plataforma web institucional orientada a la gestión, evaluación docente, semaforización automatizada de riesgos pedagógicos y control de asistencia a capacitaciones para la UGEL.**

---

## 📋 Tabla de Contenidos
1. [Descripción General](#-descripción-general)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Configuración Inicial y Base de Datos](#-configuración-inicial-y-base-de-datos)
5. [Documentación de Módulos y Funciones](#-documentación-de-módulos-y-funciones)
   - [Configuración (`ConfigModule`)](#1-configmodule-jsconfigjs)
   - [Notificaciones Toast (`NotificationModule`)](#2-notificationmodule-jsutilsnotificationsjs)
   - [Autenticación y Sesiones (`AuthModule`)](#3-authmodule-jsauthjs)
   - [Enrutador SPA (`RouterModule`)](#4-routermodule-jsrouterjs)
   - [Dashboard e Inteligencia de Datos (`DashboardModule`)](#5-dashboardmodule-jsmodulesdashboardjs)
   - [Monitoreo y Semaforización (`MonitoreoModule`)](#6-monitoreomodule-jsmodulesmonitoreojs)
   - [Capacitaciones y Asistencia (`CapacitacionesModule`)](#7-capacitacionesmodule-jsmodulescapacitacionesjs)
6. [Motor de Reglas y Función Transaccional RPC](#-motor-de-reglas-y-función-transaccional-rpc)
7. [Guía de Uso Paso a Paso](#-guía-de-uso-paso-a-paso)

---

## 🎯 Descripción General

**SIMAP** permite a los especialistas pedagógicos y directivos:
- Registrar visitas de acompañamiento pedagógico en aula evaluando las **5 Rúbricas Oficiales de Observación de Aula del MINEDU**:
  1. **Rúbrica I**: Involucra activamente a los estudiantes en el proceso de aprendizaje.
  2. **Rúbrica II**: Promueve el razonamiento, la creatividad y/o el pensamiento crítico.
  3. **Rúbrica III**: Evalúa el progreso de los aprendizajes para retroalimentar.
  4. **Rúbrica IV**: Propicia un ambiente de respeto y proximidad.
  5. **Rúbrica V**: Regula positivamente el comportamiento de los estudiantes.
- Asignar niveles del 1 al 4 por rúbrica (Nivel I a IV), acumulando automáticamente el puntaje de 5 a 20 pts.
- Registrar el progreso por etapas: **I Monitoreo (Diagnóstico)**, **II Monitoreo (Seguimiento)** y **III Monitoreo (Salida)** con una matriz comparativa idéntica al formato institucional de la UGEL.
- Calcular en tiempo real y a nivel de base de datos el semáforo de riesgo del docente:
  - 🔴 **Crítico** (< 12 puntos): Requiere intervención y acompañamiento intensivo.
  - 🟡 **En Proceso** (12 a 15 puntos): Docente en nivel intermedio de desempeño.
  - 🟢 **Satisfactorio** (16 a 20 puntos): Cumplimiento óptimo de estándares de desempeño.
- Registrar automáticamente logs de auditoría de cada evaluación en una transacción atómica.
- Planificar talleres de capacitación pedagógica y registrar la asistencia masiva del padrón docente.
- Visualizar un panel ejecutivo con KPIs, gráficos circulares y métricas de efectividad formativa.

---

## 🛠 Stack Tecnológico

- **Frontend**:
  - **HTML5 Semántico**: Vistas accesibles y estructuradas.
  - **CSS Puro + Tailwind CSS (CDN)**: Sistema de diseño institucional, tokens de color para semaforización, micro-animaciones, glassmorphism y diseño 100% responsivo.
  - **Vanilla JavaScript**: Arquitectura limpia basada en el **Patrón Módulo (IIFE)** sin dependencias pesadas de frameworks (React/Angular/Vue).
- **Backend & Base de Datos**:
  - **Supabase**:
    - **Auth**: Autenticación segura de usuarios (JWT, control de sesión).
    - **PostgreSQL**: Base de datos relacional con claves foráneas, enums y triggers.
    - **Row Level Security (RLS)**: Políticas de seguridad por fila.
    - **Funciones RPC (PL/pgSQL)**: Lógica de negocio y auditoría transaccional en el servidor.

---

## 📂 Estructura del Proyecto

```text
SIMAP/
├── index.html                      # Vista de Login institucional
├── dashboard.html                  # Shell SPA: Sidebar, Header y Contenedor Principal
├── README.md                       # Documentación técnica y guía de usuario
├── css/
│   └── styles.css                  # Design System (tokens, semaforización, animaciones, toasts)
├── js/
│   ├── config.js                   # Configuración del cliente Supabase
│   ├── auth.js                     # Módulo de Autenticación y gestión de usuarios
│   ├── router.js                   # Enrutador SPA Vanilla JS (basado en hash)
│   ├── utils/
│   │   └── notifications.js        # Sistema de alertas flotantes (Toasts)
│   └── modules/
│       ├── dashboard.js            # Panel de KPIs, semaforización y efectividad
│       ├── monitoreo.js            # Formulario, semáforo en vivo y llamada a RPC
│       └── capacitaciones.js       # Registro de talleres y control de asistencia
└── database/
    ├── script.sql                  # Script maestro completo
    ├── fase1_auth.sql              # Tablas de roles, usuarios, RLS y triggers
    ├── fase3_monitoreo.sql         # Tablas I.E., docentes, fichas, auditoría y RPC
    ├── fase3_rubricas_update.sql   # Actualización a las 5 rúbricas oficiales MINEDU
    ├── fase3_evaluador_update.sql  # Soporte para profesor evaluador en fichas y RPC
    └── fase4_capacitaciones.sql    # Tablas de capacitaciones y asistencias
```

---

## ⚙️ Configuración Inicial y Base de Datos

### 1. Configuración de Credenciales
Edita el archivo `js/config.js` y coloca tus llaves de proyecto de Supabase:

```javascript
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';
```

### 2. Ejecución de Scripts SQL en Supabase
En tu consola de Supabase ve al **SQL Editor** y ejecuta los scripts en este orden:
1. `database/fase1_auth.sql`: Crea los roles, tabla de usuarios vinculada a `auth.users` y el trigger automático.
2. `database/fase3_monitoreo.sql`: Crea los colegios, docentes, tabla de fichas, auditoría y la función RPC `registrar_ficha_y_auditar`.
3. `database/fase3_rubricas_update.sql`: Agrega las columnas `rubrica_1` a `rubrica_5` y actualiza la RPC.
4. `database/fase3_evaluador_update.sql`: Agrega la columna `evaluador` e `id_docente_evaluador` y actualiza la RPC.
5. `database/fase4_capacitaciones.sql`: Crea las tablas de capacitaciones y asistencias con restricción única.

---

## 📖 Documentación de Módulos y Funciones

Todos los módulos siguen el **Patrón Módulo (IIFE)** exponiendo sus métodos de forma pública a través del namespace global `window.SIMAP`.

---

### 1. `ConfigModule` (`js/config.js`)
Inicializa y gestiona la conexión con el SDK de Supabase.

* **`init()`**: Valida las credenciales y crea la instancia `supabase.createClient(...)` con persistencia de sesión activada.
* **`getClient()`**: Retorna la instancia activa del cliente Supabase.
* **`isConfigured()`**: Retorna un booleano indicando si las credenciales fueron reemplazadas.

---

### 2. `NotificationModule` (`js/utils/notifications.js`)
Controla el sistema de notificaciones flotantes (Toasts) con animaciones CSS.

* **`success(mensaje, duracion = 4000)`**: Muestra un toast verde de éxito con icono descriptivo.
* **`error(mensaje, duracion = 4000)`**: Muestra un toast rojo ante fallos o errores de red.
* **`warning(mensaje, duracion = 4000)`**: Muestra un toast ámbar para validaciones pendientes.
* **`info(mensaje, duracion = 4000)`**: Muestra un toast informativo en tono azul.

---

### 3. `AuthModule` (`js/auth.js`)
Maneja el ciclo de vida de la autenticación de usuarios.

* **`login(email, password)`**:
  * Inicia sesión con `supabase.auth.signInWithPassword`.
  * Consulta el perfil del usuario en la tabla `public.usuarios` junto con su rol institucional.
  * Retorna `{ user, session, error }`.
* **`logout()`**:
  * Cierra la sesión en Supabase (`supabase.auth.signOut`).
  * Limpia el `localStorage` y redirige a `index.html`.
* **`getSession()`**: Retorna la sesión activa actual del usuario autenticado.
* **`getUserProfile(userId)`**: Consulta y retorna el nombre y rol (`roles.nombre_rol`) del usuario desde PostgreSQL.
* **`checkAuth({ isLoginPage = false })`**:
  * Si el usuario no tiene sesión y está en el dashboard, lo redirige al login.
  * Si el usuario ya está autenticado y entra a `index.html`, lo redirige automáticamente a `dashboard.html`.

---

### 4. `RouterModule` (`js/router.js`)
Motor de enrutamiento SPA que carga vistas dinámicas mediante el evento `hashchange`.

* **`registerRoute(path, handler, title, mount)`**:
  * Registra un hash (ej: `#/monitoreo`).
  * `handler`: Función que retorna el HTML de la vista.
  * `title`: Título de la página.
  * `mount`: Función callback que se ejecuta tras inyectar el HTML en el DOM para enlazar eventos.
* **`navigateTo(hash)`**: Cambia la vista programáticamente.
* **`init()`**: Enlaza el listener de `hashchange` y carga la vista correspondiente al hash actual.

---

### 5. `DashboardModule` (`js/modules/dashboard.js`)
Centro de inteligencia y consolidación de métricas.

* **`render()`**: Retorna la estructura HTML con las tarjetas KPI, barras de semáforos, gráfico circular y tablas de actividades recientes.
* **`fetchDashboardData()`**: Realiza consultas paralelas a Supabase para obtener fichas, capacitaciones y asistencias.
* **`updateMetricsUI(data)`**: Calcula porcentajes en tiempo real, actualiza las barras de semaforización y activa la insignia de diagnóstico pedagógico.
* **`init()`**: Inicia la carga de métricas y enlaza el botón de actualización en vivo.

---

### 6. `MonitoreoModule` (`js/modules/monitoreo.js`)
Gestiona la evaluación docente por 5 Rúbricas Oficiales de Aula MINEDU, asignación del profesor evaluador, semaforización y directorio.

* **`render()`**: Retorna la interfaz modular con 4 pestañas: *Evaluar por Rúbricas*, *Matriz de Rúbricas (I, II, III)*, *Ver Historial* y *Directorio de Colegios (I.E.)*.
* **Filtros en Cascada**:
  * **Distrito**: Filtra colegios de Chepén, Pacanga, Pueblo Nuevo, etc.
  * **Institución Educativa**: Carga colegios y sincroniza su distrito.
  * **Profesor Evaluador / Acompañante Pedagógico**: Permite elegir al usuario autenticado (Especialista/Directivo), directivos/docentes de la sede o red, o escribir un evaluador externo mediante el botón `+ Escribir otro nombre`.
  * **Profesor a Evaluar**: Docente observado en aula, con validación de que no sea la misma persona que evalúa.
* **Evaluación por 5 Rúbricas (1 a 4 puntos)**:
  * Inicia limpio sin notas premarcadas.
  * Muestra progreso interactivo *(X de 5 rúbricas evaluadas)* y activa el semáforo al completar las 5 rúbricas.
* **Historial y Matriz con Evaluador**: Muestra en cada registro tanto el profesor evaluado como el evaluador que condujo la visita en aula.
* **Invocación RPC**: En el submit del formulario, invoca la función `registrar_ficha_y_auditar` en Supabase con auditoría automática.

---

### 7. `CapacitacionesModule` (`js/modules/capacitaciones.js`)
Gestiona talleres pedagógicos y control de asistencia.

* **`render()`**: Retorna la interfaz con 3 pestañas: *Control de Asistencia*, *Nuevo Taller / Evento* y *Lista de Talleres*.
* **`loadCapacitaciones()`**: Consulta los eventos activos desde la tabla `capacitaciones`.
* **`cargarPadronParaEvento(idCapacitacion)`**:
  * Consulta los docentes y las asistencias guardadas para el evento seleccionado.
  * Renderiza la tabla con los checkboxes y observaciones.
* **`actualizarContadoresAsistencia()`**: Recalcula en tiempo real los contadores de Presentes, Ausentes y el % de Asistencia.
* **Guardado Masivo**: Ejecuta un `upsert` en `asistencia_capacitaciones` evitando duplicados mediante la restricción `UNIQUE(id_capacitacion, id_docente)`.

---

## 🔒 Motor de Reglas y Función Transaccional RPC

La lógica de semaforización y auditoría reside en la base de datos para garantizar consistencia y seguridad:

```sql
CREATE OR REPLACE FUNCTION registrar_ficha_y_auditar(
    p_id_usuario UUID,
    p_id_docente UUID,
    p_id_ie UUID,
    p_fecha DATE,
    p_puntaje INT,
    p_obs TEXT
) RETURNS JSON
```

### Reglas del Algoritmo:
1. **Puntaje < 12**: Asigna el valor `Crítico`.
2. **Puntaje entre 12 y 15**: Asigna el valor `En Proceso`.
3. **Puntaje entre 16 y 20**: Asigna el valor `Satisfactorio`.
4. **Atomicidad**: En la misma transacción donde se guarda la ficha, se genera una fila en `audit_logs` con la fecha, usuario y detalle de la operación.

---

## 🚀 Guía de Uso Paso a Paso

### 1. Iniciar Sesión
1. Abre `index.html` en un navegador web.
2. Ingresa el correo y contraseña del usuario registrado en Supabase Auth.
3. El sistema verificará tus credenciales y te redirigirá a `dashboard.html`.

### 2. Registrar una Ficha de Monitoreo
1. En el menú lateral haz clic en **"Monitoreo Docente"**.
2. Selecciona la **Institución Educativa**.
3. El selector de **Docente Acompañado** se filtrará automáticamente mostrando únicamente a los profesores de esa I.E.
4. Ingresa el puntaje (0 a 20). Observa cómo el semáforo lateral cambia de color en tiempo real.
5. Escribe los compromisos pedagógicos y presiona **"Procesar y Guardar Ficha (RPC)"**.
6. El sistema registrará la ficha, guardará la auditoría y te mostrará la ficha en la pestaña **"Ver Historial"**.

### 3. Programar un Taller y Pasar Lista
1. En el menú lateral haz clic en **"Capacitaciones"**.
2. Haz clic en la pestaña **"+ Nuevo Taller / Evento"**, completa el formulario y presiona **"Guardar y Programar Evento"**.
3. El sistema te llevará automáticamente a la pestaña **"Marcar Asistencia"** con el nuevo taller seleccionado.
4. Marca los docentes que asistieron (puedes usar los botones **"Marcar Todos"** o **"Desmarcar Todos"**).
5. Haz clic en **"Guardar Registro de Asistencia"**.

### 4. Consultar el Dashboard General
1. Haz clic en **"Panel de Inicio"**.
2. Podrás visualizar el total de evaluaciones, el porcentaje de docentes en nivel Crítico, En Proceso y Satisfactorio, así como el porcentaje global de asistencia a capacitaciones.
3. Usa el botón **"Actualizar Datos"** para refrescar las estadísticas cuando lo desees.

---

### 📄 Licencia y Créditos
Desarrollado para la **UGEL - Gestión Pedagógica** como herramienta de monitoreo, semaforización y acompañamiento formativo docente &copy; 2026.
