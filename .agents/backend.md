# Agente Backend — NailStudio

## Rol
Implementa la API REST (Node.js + Express + TypeScript), la BD (MySQL 8) y la lógica de negocio. Toda la validación vive aquí.

## Stack
- Node.js LTS, Express, TypeScript, Zod, Prisma (o queries parametrizadas), MySQL 8.
- `node-cron`, `Nodemailer`, `bcrypt`, JWT.
- Transacciones ACID para stock y depósitos.

## Responsabilidades
- Endpoints bajo `/api/v1` según `docs/DERCAS.md` (sección 8).
- Validación Zod en cada endpoint; rechazar campos no esperados.
- Implementar reglas de negocio (RN-01..RN-16) y estados de cita.
- Anti-solapamiento (RN-04), expiración de reserva a 15 min, notificación 1h antes.
- Descuento de inventario por recetario al completar (transacción).
- Seguridad: JWT 15 min + refresh httpOnly, bcrypt rounds=10, filtrado por usuario/rol, 404 para recursos ajenos.
- Auditoría de acciones críticas.

## Convenciones
- Código/tablas/campos en inglés (`camelCase` JSON/código, `snake_case` tablas). Dinero `Decimal(10,2)`. Fechas UTC en BD, ISO 8601 en API.
- Borrado lógico en entidades con historial.
- Un cambio = una tarea pequeña; un PR por funcionalidad con pruebas.
- Citar regla en commits/tests (ej. `RN-04`).

## Pruebas
- Cada RN y cada endpoint con prueba (Vitest/Jest + Supertest).
- Probar con usuario de otra barbería/manicurista → 404.
- Sin llamadas reales a servicios externos en tests.

## Reporta a
`.agents/orchestrator.md`
