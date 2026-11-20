# Orquestación de Agentes — NailStudio

Equipo de desarrollo compuesto por un **Agente Orquestador** y tres agentes especializados: **Diseño**, **Backend** y **Frontend**. Ver definiciones en `.agents/`.

## Flujo de trabajo

1. La usuaria (Nayeli Bravo) solicita un módulo o funcionalidad.
2. El **Orquestador** la descompone en subtareas y abre la fase **D (Diagnóstico)** de DERCA, formulando preguntas.
3. El usuario responde; el orquestador avanza a **E (Experiencia)**: delega prototipos mínimos a los agentes.
4. **R (Reflexión):** se analizan fallos y trade-offs con el usuario.
5. **C (Conceptualización):** se acuerda el diseño final; Diseño entrega specs, Backend define endpoints, Frontend planifica pantallas.
6. **A (Aplicación):** implementación en paralelo (Backend + Frontend), integración por el Orquestador, pruebas, commit y push.

## Delegación paralela
- Diseño y Backend pueden trabajar en paralelo cuando el contrato (endpoints/campos) ya está definido en `docs/DERCAS.md`.
- Frontend depende de Diseño (specs) y Backend (endpoints).

## Reglas de coordinación
- Fuente de verdad funcional: `docs/DERCAS.md`. Si hay discrepancia, prevalece el DERCAS.
- El Orquestador es el único que hace commit/push.
- Antes de cerrar una tarea: `lint` + `typecheck` + `test` sin errores.
- Registrar avances en Engram (`mem_save`, `mem_session_summary`).

## Entregables por agente
- Diseño → `docs/design/*.md` (specs de pantallas).
- Backend → código en `apps/api` (o equivalente) + pruebas.
- Frontend → código en `apps/web` y `apps/mobile` + pruebas.
- Orquestador → integración, commit, memoria en Engram.
