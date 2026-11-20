# AGENTS.md — NailStudio

Especificación de Agentes de IA, Arquitectura del Sistema y Guía de Mentoría bajo la Metodología DERCA (Diagnóstico, Experiencia, Reflexión, Conceptualización, Aplicación).

## Visión General del Proyecto
- **Proyecto:** NailStudio — Sistema Web de Agendamiento, Cotización e Inventario para Estudio de Manicura.
- **Autora & Experta de Negocio:** Nayeli Bravo.
- **Fuente de verdad funcional:** `docs/DERCAS.md` (RF, RN, CU, HU, API, errores). Si este archivo y el DERCAS difieren, prevalece estrictamente el DERCAS: avisa, no improvises.
- **Stack Tecnológico:**
  - **Frontend Web:** React.js, Tailwind CSS, React Router, Context API.
  - **App Móvil (Cliente/Manicurista):** React Native + Expo (Router), TypeScript, TanStack Query, React Hook Form + Zod, Luxon, expo-secure-store. Consume la misma API REST (`/api/v1`). Tokens solo en `expo-secure-store`.
  - **Backend:** Node.js (LTS) con Express.js, TypeScript/JavaScript, `node-cron`, `Nodemailer`.
  - **Base de Datos:** MySQL 8 (Relacional), `bcrypt`, JWT.
  - **Arquitectura:** Cliente-Servidor en 3 Capas (Presentación, Lógica de Negocio, Datos). La app móvil y el panel web comparten la misma API.

---

## 1. Definición del Prompt del Sistema (System Prompt)

Eres "NailStudio Tech Mentor", un agente tutor especializado en desarrollo de software y arquitectura web. Tu objetivo es guiar a la desarrolladora (Nayeli Bravo) en la programación paso a paso del sistema web "NailStudio" (React.js, Node.js + Express, MySQL).

Debes seguir RIGUROSAMENTE la Metodología DERCA (Diagnóstico, Experiencia, Reflexión, Conceptualización, Aplicación) para cada módulo o funcionalidad a programar.

Utiliza como contexto del proyecto el archivo `docs/DERCAS.md` (y `gemini-code-1793971151844.md` como referencia de la especificación técnica).

### REGLAS DE COMPORTAMIENTO:
1. Avanza estrictamente UNA fase a la vez. No entregues el código completo de golpe.
2. Espera siempre la respuesta y análisis del usuario antes de pasar a la siguiente fase.
3. Si el usuario comete un error, utiliza el método socrático en lugar de corregirlo directamente.

---

## 2. Módulos y Reglas de Negocio de NailStudio

- **Módulo 1: Autenticación, Seguridad y Perfiles** (JWT de acceso 15 min + refresh token en cookie httpOnly, bcrypt rounds=10, ficha técnica de la clienta).
- **Módulo 2: Catálogo y Cotizador Dinámico** (sistemas base + largo de uña + efectos + retiro previo; cálculo en vivo de precio total y duración estimada).
- **Módulo 3: Reserva con Depósito de Garantía ($5.00)** (estado `PENDIENTE_PAGO`, bloqueo temporal 15 min, carga de comprobante, aprobación por administradora).
- **Módulo 4: Agendamiento Anti-Solapamiento y Notificaciones Automáticas** (RN-04, cron job 1h antes por correo/WhatsApp, cita de garantía express).
- **Módulo 5: Control de Inventario por Recetario y Finanzas** (descuento automático de insumos, stock crítico, reportes de caja).
- **Módulo 6: Panel Administrativo Web** (gestión de usuarios/roles, configuración de catálogo y precios, aprobación de comprobantes, reportes avanzados de ventas/caja, configuración del estudio). Repositorio: `adminWed_nails`.

---

## 3. Roles del Sistema

| Rol | Propósito operativo | Funcionalidades clave |
|---|---|---|
| Clienta | Exploración, cotización autónoma y reserva garantizada | Catálogo visual, cotizador dinámico en vivo, carga de imágenes de inspiración, reserva con abono ($5.00), carga de comprobante, recordatorio 1h antes |
| Manicurista | Organización de jornada de trabajo e historial técnico | Agenda diaria sin solapamientos, alertas 1 hora antes de cada atención, ficha técnica de la clienta (alergias, uñas, tonos preferidos, fotos) |
| Administradora | Gestión financiera, aprobación y control de insumos | Validación y aprobación de comprobantes de $5.00, control de inventario por recetario técnico, alertas de stock bajo, reportes de caja/ventas |

---

## 4. Arquitectura del Sistema

Arquitectura Cliente-Servidor en 3 Capas para garantizar alta mantenibilidad, bajo costo operativo e integridad de datos:

- **Capa de Presentación (Frontend):** React.js con interfaz responsiva para celulares y laptops, Context API para estado global, React Router para rutas protegidas.
- **Capa de Lógica de Negocio (Backend):** Node.js + Express.js, validación de schemas Zod, JWT para tokens de sesión, `node-cron` para tareas automáticas de notificación, `Nodemailer` para correos.
- **Capa de Datos (Base de Datos):** MySQL 8 relacional con cifrado bcrypt de contraseñas y transacciones ACID para control de stock y depósitos.

---

## 5. Reglas de Negocio Críticas

- **RN-04** Sin solapamiento de citas activas por manicurista. Intervalo `[inicio, fin)`: terminar a las 10:00 y empezar a las 10:00 no se solapa.
- **Depósito $5.00:** la cita nace en estado `PENDIENTE_PAGO` y bloquea el turno temporalmente por 15 minutos. Si se cumplen 15 minutos sin comprobante, el horario se libera automáticamente.
- **Notificación 1h antes:** un servicio programado (`node-cron`) escanea la BD cada minuto y envía recordatorio automático por correo/WhatsApp a la Clienta y Manicurista exactamente 1 hora antes de la cita.
- **Inventario por recetario:** descuento automático de insumos mediante transacciones SQL al marcar la cita como completada; semáforo visual de stock crítico e informes de cierre de caja.
- **Seguridad:** tokens JWT de acceso (15 min) y Refresh Token en cookies httpOnly; contraseñas cifradas con bcrypt (rounds = 10).

---

## 6. Colores y Marca Institucional

- Primary: `#FFF59D`
- Secondary: `#3E2723`
- Logotipo: `![alt text](Logo_imagen-1.jpg)`

---

## 7. Flujo de Trabajo con Git

Después de finalizada y aprobada una tarea, realizar commit:

```bash
git add .
git commit -m "descripcion de la tarea"
git push
```

Repositorios:
- Backend: https://github.com/lamasbrava101-eng/Bakend_nails.git
- Frontend (web): https://github.com/lamasbrava101-eng/frontend_nails.git
- Admin web: https://github.com/lamasbrava101-eng/adminWed_nails.git
- Mobile (app cliente/manicurista): (por definir, sugerido `mobile_nails`)

---

## 8. Matriz Pedagógica de Ejecución DERCA

| Módulo | Fase DERCA | Enfoque práctico de aprendizaje |
|---|---|---|
| Cotizador Dinámico | D → E → R → C → A | Evalúa uso de `useState`/`useReducer`. Analiza fallas al calcular precios solo en el cliente sin validación en servidor. Concepto de sincronización. |
| Depósito $5.00 | D → E → R → C → A | Diagnóstico de estados temporales. Reflexión sobre bloqueos de agenda sin pago real. Conceptualización de timers de expiración de 15 min. |
| Notificación 1h Antes | D → E → R → C → A | Diagnóstico de `node-cron`. Reflexión sobre fallas de `setTimeout` al reiniciar servidor. Conceptualización de Cron Jobs en BD. |
| Inventario Recetario | D → E → R → C → A | Diagnóstico de Transacciones ACID. Reflexión sobre inconsistencias de stock por fallas de conexión. Conceptualización de COMMIT / ROLLBACK. |

---

## 10. App Móvil (Cliente / Manicurista)

La app móvil consume la misma API REST (`/api/v1`) que el panel web. No duplica lógica de negocio: toda la validación vive en el backend.

- **Stack:** React Native + Expo (Router), TypeScript estricto, TanStack Query, React Hook Form + Zod, Luxon, `expo-secure-store`.
- **Roles soportados:** Clienta y Manicurista (la Administradora gestiona desde el panel web).
- **Funcionalidades clave:**
  - Clienta: catálogo/cotizador, carga de imagen de inspiración, reserva con depósito, carga de comprobante, consulta de citas, recordatorios.
  - Manicurista: agenda diaria, ficha técnica de la clienta, marcar cita como completada.
- **Seguridad:** tokens solo en `expo-secure-store`; la app nunca maneja datos de tarjeta.
- **Fechas:** UTC en BD/API, zona del estudio (`America/Guayaquil` o la configurada) solo al mostrar (Luxon).

## 11. Orquestación de Agentes

El desarrollo se coordina mediante un equipo de agentes definido en `.agents/` y documentado en `docs/AGENT-ORCHESTRATION.md`:

- **Orquestador** (`.agents/orchestrator.md`): coordina, delega, valida y hace commit. Ejecuta DERCA una fase a la vez.
- **Diseño** (`.agents/design.md`): UI/UX, wireframes, specs visuales (web + móvil).
- **Backend** (`.agents/backend.md`): API REST, BD, lógica de negocio, pruebas.
- **Frontend** (`.agents/frontend.md`): panel web (React) y app móvil (Expo), consume la API.

## 9. Inicio de Tutoría Interactiva (Fase 1: Diagnóstico)

1. React.js: ¿Tienes claro cómo sumar y actualizar los precios y tiempos en tiempo real según los efectos seleccionados usando `useState` o `useReducer`?
2. MySQL: ¿Cómo mantendremos guardada la cita durante los 15 minutos en estado `PENDIENTE_PAGO` mientras la clienta transfiere los $5.00?
