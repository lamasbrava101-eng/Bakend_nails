# DERCAS.md — NailStudio

Fuente de verdad funcional del proyecto NailStudio. RF (Requisitos Funcionales), RN (Reglas de Negocio), CU (Casos de Uso), HU (Historias de Usuario), API y errores. Si `AGENTS.md` y este documento difieren, prevalece este documento.

---

## 1. Visión General

NailStudio es un sistema web para automatizar la gestión operativa de un estudio de manicura, eliminando la desorganización por reservas informales y mitigando pérdidas por inasistencias mediante un **abono de garantía obligatorio de $5.00**.

- **Autora & Experta de Negocio:** Nayeli Bravo.
- **Stack:** React.js (frontend web), React Native + Expo (app móvil cliente/manicurista), Node.js + Express (backend), MySQL 8 (BD).
- **Arquitectura:** Cliente-Servidor en 3 Capas (Presentación, Lógica de Negocio, Datos).

---

## 2. Roles

| Rol | Propósito operativo | Funcionalidades clave |
|---|---|---|
| Clienta | Exploración, cotización autónoma y reserva garantizada | Catálogo visual, cotizador dinámico en vivo, carga de imágenes de inspiración, reserva con abono ($5.00), carga de comprobante, recordatorio 1h antes |
| Manicurista | Organización de jornada de trabajo e historial técnico | Agenda diaria sin solapamientos, alertas 1 hora antes de cada atención, ficha técnica de la clienta (alergias, uñas, tonos preferidos, fotos) |
| Administradora | Gestión financiera, aprobación y control de insumos | Validación y aprobación de comprobantes de $5.00, control de inventario por recetario técnico, alertas de stock bajo, reportes de caja/ventas |

---

## 3. Requisitos Funcionales (RF)

### RF-01 Autenticación y seguridad
- El sistema debe permitir registro e inicio de sesión de usuarios con roles (Clienta, Manicurista, Administradora).
- Las contraseñas deben cifrarse con bcrypt (rounds = 10).
- El sistema debe emitir un JWT de acceso con vigencia de 15 minutos y un Refresh Token en cookie httpOnly.
- El sistema debe permitir cerrar sesión invalidando el refresh token.

### RF-02 Perfiles y ficha técnica
- El sistema debe mantener un perfil por usuario con datos básicos.
- El sistema debe mantener una ficha técnica de la clienta: alergias, tipo de uña, tonos preferidos, fotos de referencia.

### RF-03 Catálogo y cotizador dinámico
- El sistema debe mostrar un catálogo visual de servicios y efectos.
- El cotizador debe permitir combinar: Sistemas Base (Acrílico, Gelish, Kapping, Manicura Rusa, Pedicura Spa) + Largo de Uña + Efectos (Chrome, Cat Eye, Encapsulado, Cristales) + Retiro previo.
- El sistema debe calcular en tiempo real el Precio Total ($) y la Duración Estimada (minutos).
- El sistema debe permitir cargar imágenes de inspiración (foto de referencia) por la clienta.

### RF-04 Reserva con depósito de garantía ($5.00)
- Al agendar, la cita debe nacer en estado `PENDIENTE_PAGO` y bloquear el turno temporalmente por 15 minutos.
- La clienta debe poder subir el comprobante de transferencia bancaria.
- La administradora debe poder aprobar/rechazar el comprobante; al aprobar, la cita pasa a `CONFIRMADA` y se descuentan los $5.00 del saldo final.
- Si se cumplen 15 minutos sin comprobante, el horario se libera automáticamente.

### RF-05 Agendamiento anti-solapamiento
- El sistema debe impedir el solapamiento de citas activas por manicurista (RN-04).
- El sistema debe validar que la cita esté dentro del horario de la manicurista y del estudio.

### RF-06 Notificaciones automáticas (1h antes)
- Un servicio programado (`node-cron`) debe escanear la BD cada minuto.
- El sistema debe enviar un recordatorio automático por correo/WhatsApp a la Clienta y a la Manicurista exactamente 1 hora antes de la cita.

### RF-07 Control de inventario por recetario
- Al marcar una cita como completada, el sistema debe descontar automáticamente los insumos (monómero, geles, limas, acrílicos) mediante transacciones SQL.
- El sistema debe mostrar un semáforo visual de stock crítico.
- El sistema debe generar informes de cierre de caja y ventas.

### RF-08 Agenda y gestión de citas
- La manicurista debe consultar su agenda diaria sin solapamientos.
- La administradora debe gestionar citas (confirmar, cancelar, reprogramar).

### RF-09 Panel Administrativo Web
- El sistema debe contar con un panel web administrativo (repositorio `adminWed_nails`) accesible solo para el rol Administradora.
- El panel debe permitir gestión de usuarios y roles (alta/baja/cambio de rol).
- El panel debe permitir configuración del catálogo: servicios base, efectos, precios y duraciones.
- El panel debe permitir aprobación/rechazo de comprobantes de depósito y gestión de citas.
- El panel debe mostrar reportes avanzados de ventas, caja e inventario (stock crítico).
- El panel debe permitir configuración del estudio (horarios, datos de contacto, cuentas bancarias para depósito).

### RF-10 App Móvil (Cliente / Manicurista)
- El sistema debe contar con una app móvil (repositorio `mobile_nails`) para los roles Clienta y Manicurista, conectada a la misma API REST (`/api/v1`).
- La app debe permitir a la clienta: consultar catálogo/cotizador, cargar imagen de inspiración, reservar con depósito, subir comprobante, consultar sus citas y recibir recordatorios.
- La app debe permitir a la manicurista: consultar agenda diaria, ver ficha técnica de la clienta y marcar citas como completadas.
- Los tokens de sesión deben almacenarse únicamente en `expo-secure-store`.
- La app no debe manejar datos de tarjeta; los pagos se gestionan vía comprobante de transferencia validado por la administradora.
- Las fechas se reciben en ISO 8601 (UTC) y se muestran en la zona configurada del estudio (Luxon).

---

## 4. Reglas de Negocio (RN)

- **RN-01** Toda consulta filtra por el usuario/rol autenticado. Un recurso de otro usuario o de otra manicurista → 404, no 403.
- **RN-02** Las contraseñas se almacenan con hash bcrypt (rounds = 10). Nunca en texto plano.
- **RN-03** El JWT de acceso tiene vigencia de 15 minutos; el refresh token se guarda como hash en BD y se entrega en cookie httpOnly.
- **RN-04** Sin solapamiento de citas activas (`PENDIENTE_PAGO`/`CONFIRMADA`) por manicurista. Intervalo `[inicio, fin)`: terminar a las 10:00 y empezar a las 10:00 no se solapa.
- **RN-05** La cita nace en estado `PENDIENTE_PAGO` al agendar y bloquea el turno temporalmente por 15 minutos.
- **RN-06** Si se cumplen 15 minutos sin comprobante, el horario se libera automáticamente (liberación por expiración).
- **RN-07** Al aprobar el comprobante, la cita pasa a `CONFIRMADA` y se descuentan los $5.00 del saldo final.
- **RN-08** La notificación se envía exactamente 1 hora antes de la cita, por correo y/o WhatsApp, a la Clienta y a la Manicurista.
- **RN-09** El descuento de insumos ocurre al marcar la cita como `COMPLETADA`, dentro de una transacción SQL (ACID): COMMIT si todo OK, ROLLBACK si falla.
- **RN-10** Stock crítico se señala visualmente (semáforo) cuando el insumo cae bajo el umbral configurado.
- **RN-11** Los estados de cita son: `PENDIENTE_PAGO`, `CONFIRMADA`, `COMPLETADA`, `CANCELADA`, `EXPIRADA`. Los estados finales (`COMPLETADA`, `CANCELADA`, `EXPIRADA`) no admiten transiciones.
- **RN-12** Solo la manicurista asignada o la administradora pueden marcar una cita como `COMPLETADA` o `CANCELADA`, y solo a partir de la hora de inicio.
- **RN-13** Dinero en `Decimal(10,2)`, nunca `float`. Fechas en UTC en BD, ISO 8601 en API.
- **RN-14** Borrado lógico en entidades con historial.
- **RN-15** Nada de `console.log` con datos sensibles (contraseñas, tokens, fotos).
- **RN-16** El panel administrativo web es accesible únicamente por usuarios con rol Administradora; cualquier otro rol recibe 403/404 según corresponda.

---

## 5. Estados de Cita

```
PENDIENTE_PAGO --(aprobación comprobante)--> CONFIRMADA --(atención finalizada)--> COMPLETADA
PENDIENTE_PAGO --(15 min sin comprobante)--> EXPIRADA
PENDIENTE_PAGO/CONFIRMADA --(cancelación válida)--> CANCELADA
```

Estados finales (sin transiciones): `COMPLETADA`, `CANCELADA`, `EXPIRADA`.

---

## 6. Casos de Uso (CU)

- **CU-01** Iniciar sesión (todos los roles).
- **CU-02** Registrar clienta y crear ficha técnica.
- **CU-03** Cotizar servicio (selección de sistema base, largo, efectos, retiro) con precio y duración en vivo.
- **CU-04** Cargar imagen de inspiración.
- **CU-05** Reservar cita con depósito ($5.00) → estado `PENDIENTE_PAGO`.
- **CU-06** Subir comprobante de transferencia.
- **CU-07** Aprobar/rechazar comprobante (Administradora) → `CONFIRMADA`.
- **CU-08** Consultar agenda diaria (Manicurista).
- **CU-09** Marcar cita como completada (descuento de insumos).
- **CU-10** Cancelar cita.
- **CU-11** Recibir notificación 1h antes (Clienta y Manicurista).
- **CU-12** Consultar stock crítico y reportes de caja (Administradora).
- **CU-13** Gestionar inventario (altas/bajas de insumos).
- **CU-14** Gestionar usuarios y roles (Administradora).
- **CU-15** Configurar catálogo de servicios/efectos, precios y duraciones (Administradora).
- **CU-16** Configurar datos del estudio (horarios, contacto, cuentas bancarias) (Administradora).
- **CU-17** Consultar catálogo y cotizar servicio desde la app móvil (Clienta).
- **CU-18** Reservar cita y subir comprobante desde la app móvil (Clienta).
- **CU-19** Consultar agenda y marcar cita como completada desde la app móvil (Manicurista).

---

## 7. Historias de Usuario (HU)

- **HU-01** Como clienta, quiero cotizar mi servicio en vivo para saber el precio y duración antes de reservar.
- **HU-02** Como clienta, quiero reservar con un depósito de $5.00 para garantizar mi turno.
- **HU-03** Como clienta, quiero subir el comprobante de transferencia para confirmar mi cita.
- **HU-04** Como clienta, quiero recibir un recordatorio 1 hora antes de mi cita.
- **HU-05** Como manicurista, quiero ver mi agenda diaria sin solapamientos.
- **HU-06** Como manicurista, quiero consultar la ficha técnica de la clienta antes de atenderla.
- **HU-07** Como manicurista, quiero recibir un recordatorio 1 hora antes de cada atención.
- **HU-08** Como administradora, quiero aprobar comprobantes para confirmar citas.
- **HU-09** Como administradora, quiero que el inventario se descuente automáticamente al completar una cita.
- **HU-10** Como administradora, quiero ver el stock crítico y los reportes de caja.
- **HU-11** Como administradora, quiero gestionar usuarios y roles desde el panel web.
- **HU-12** Como administradora, quiero configurar el catálogo, precios y duraciones desde el panel web.
- **HU-13** Como administradora, quiero configurar los datos del estudio (horarios, contacto, cuentas bancarias) desde el panel web.
- **HU-14** Como clienta, quiero cotizar y reservar mi cita desde la app móvil.
- **HU-15** Como clienta, quiero subir el comprobante de mi depósito desde la app móvil.
- **HU-16** Como manicurista, quiero consultar mi agenda y marcar citas como completadas desde la app móvil.

---

## 8. API (rutas bajo `/api/v1`)

Respuesta OK: `{ data, meta? }`. Error: `{ error: { code, message, details } }`.

> El panel web administrativo y la app móvil (cliente/manicurista) consumen los mismos endpoints. No existen rutas separadas por cliente; el control de acceso se basa en el rol del token.

### Autenticación
- `POST /api/v1/auth/register` — registro público; asigna siempre el rol `CLIENT` por defecto. La creación de `MANICURIST` y `ADMIN` se realiza por seed inicial o desde el panel administrativo (Módulo 6).
- `POST /api/v1/auth/login` — inicio de sesión (devuelve access token; refresh en cookie httpOnly).
- `POST /api/v1/auth/refresh` — renovar access token.
- `POST /api/v1/auth/logout` — cerrar sesión.

### Usuarios / perfiles
- `GET /api/v1/me` — perfil del usuario autenticado.
- `PUT /api/v1/me` — actualizar perfil.
- `GET /api/v1/clients/:id/tech-sheet` — ficha técnica de la clienta.
- `PUT /api/v1/clients/:id/tech-sheet` — actualizar ficha técnica.

### Catálogo y cotizador
- `GET /api/v1/catalog/services` — sistemas base.
- `GET /api/v1/catalog/effects` — efectos.
- `POST /api/v1/quote` — calcular precio y duración en vivo (body: sistema base, largo, efectos, retiro).

### Citas
- `POST /api/v1/appointments` — crear cita (nace `PENDIENTE_PAGO`, bloquea 15 min).
- `GET /api/v1/appointments/:id` — detalle de cita.
- `GET /api/v1/appointments` — listar (filtros por rol/fecha).
- `POST /api/v1/appointments/:id/voucher` — subir comprobante.
- `POST /api/v1/appointments/:id/approve` — aprobar comprobante (Administradora).
- `POST /api/v1/appointments/:id/reject` — rechazar comprobante (Administradora).
- `POST /api/v1/appointments/:id/complete` — marcar como completada (descuento de insumos).
- `POST /api/v1/appointments/:id/cancel` — cancelar cita.

### Agenda (Manicurista)
- `GET /api/v1/agenda?date=YYYY-MM-DD` — agenda diaria.

### Inventario
- `GET /api/v1/inventory` — listar insumos.
- `POST /api/v1/inventory` — alta de insumo.
- `PUT /api/v1/inventory/:id` — actualizar insumo.
- `GET /api/v1/inventory/low-stock` — stock crítico.

### Reportes
- `GET /api/v1/reports/cash?from=&to=` — cierre de caja / ventas.

### Administración (Panel Web, rol Administradora)
- `GET /api/v1/admin/users` — listar usuarios.
- `POST /api/v1/admin/users` — crear usuario.
- `PUT /api/v1/admin/users/:id` — actualizar usuario/rol.
- `DELETE /api/v1/admin/users/:id` — baja lógica de usuario.
- `GET /api/v1/admin/studio-config` — configuración del estudio.
- `PUT /api/v1/admin/studio-config` — actualizar configuración del estudio.
- `GET /api/v1/admin/reports/sales?from=&to=` — reportes avanzados de ventas.

---

## 9. Códigos de Error

| Código | HTTP | Descripción |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Credenciales incorrectas (mensaje genérico) |
| `UNAUTHORIZED` | 401 | Token ausente o inválido |
| `FORBIDDEN` | 403 | Rol sin permiso |
| `NOT_FOUND` | 404 | Recurso inexistente o de otro usuario/manicurista |
| `VALIDATION_ERROR` | 400/422 | Fallo de validación Zod (campos inválidos o no esperados) |
| `APPOINTMENT_OVERLAP` | 409 | Solapamiento de citas activas (RN-04) |
| `APPOINTMENT_EXPIRED` | 409 | La cita expiró por falta de comprobante (15 min) |
| `INVALID_STATUS_TRANSITION` | 409 | Transición de estado no permitida |
| `INSUFFICIENT_STOCK` | 409 | Stock insuficiente para completar la cita |
| `VOUCHER_NOT_FOUND` | 404 | Comprobante no encontrado |
| `RATE_LIMITED` | 429 | Límite de solicitudes excedido |

---

## 10. Modelo de Datos (tablas principales)

- `users` (id UUID, email, password_hash, role, created_at, deleted_at)
- `client_tech_sheets` (id, client_id FK, allergies, nail_type, preferred_tones, photo_url, updated_at)
- `catalog_services` (id, name, base_price DECIMAL(10,2), base_duration_min, active)
- `catalog_effects` (id, name, price DECIMAL(10,2), duration_min, active)
- `appointments` (id UUID, client_id FK, manicurist_id FK, start_at UTC, end_at UTC, status, price_total DECIMAL(10,2), duration_min, voucher_url, created_at, deleted_at)
- `inventory_items` (id, name, unit, stock DECIMAL, critical_threshold, deleted_at)
- `service_recipes` (id, service_id FK, item_id FK, quantity DECIMAL) — recetario
- `appointment_inventory_consumption` (id, appointment_id FK, item_id FK, quantity DECIMAL)
- `refresh_tokens` (id, user_id FK, token_hash, expires_at, revoked_at)

Dinero: `Decimal(10,2)`. Fechas: UTC en BD, ISO 8601 en API.

---

## 11. Configurables

- Vigencia del JWT de acceso: 15 min.
- Expiración de reserva sin comprobante: 15 min.
- Anticipación de notificación: 1 hora antes.
- Frecuencia de escaneo de `node-cron`: 1 minuto.
- Rounds de bcrypt: 10.
- Umbral de stock crítico: configurable por insumo.

---

## 12. Seguridad (no negociable)

- Toda consulta filtra por el usuario/rol autenticado. Nunca confíes en un id enviado por el cliente.
- Recurso de otro usuario o de otro manicurista → 404, no 403.
- Validar con Zod en la API siempre; rechazar campos no esperados.
- Solo MySQL vía ORM/queries parametrizadas (sin SQL concatenado).
- Contraseñas con hash; refresh tokens guardados como hash.
- Tokens de la app solo en almacenamiento seguro.
- La app nunca maneja datos de tarjeta.
- Logs sin contraseñas, tokens ni fotos.
- Auditar: creación/cancelación/cambio de estado de cita, precios, pagos, inventario, consentimiento.

---

## 13. Convenciones

- Código, tablas y campos en inglés (`camelCase` en JSON y código, `snake_case` en tablas). Textos de UI en español, centralizados.
- IDs UUID. Dinero `Decimal(10,2)`. Fechas UTC en BD, ISO 8601 en API.
- Borrado lógico en entidades con historial.
- Un cambio = una tarea pequeña. Un PR por funcionalidad, con pruebas.
- Citar el código de la regla en commits y tests (ej. `RN-04`, `RF-04`).
