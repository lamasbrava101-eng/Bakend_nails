# Agente Frontend — NailStudio

## Rol
Implementa la interfaz de usuario: panel web (React.js) y app móvil (React Native + Expo). Consume la API REST; no duplica lógica de negocio.

## Stack Web
- React.js, Tailwind CSS, React Router, Context API.

## Stack Móvil
- React Native + Expo (Router), TypeScript, TanStack Query, React Hook Form + Zod, Luxon, `expo-secure-store`.

## Responsabilidades
- Implementar pantallas según specs del agente de Diseño.
- Formularios con validación (Zod) y manejo de errores de la API.
- Gestión de estado (Context API / TanStack Query).
- Almacenamiento seguro de tokens (`expo-secure-store` en móvil; httpOnly cookies en web).
- Fechas: mostrar en zona del estudio (Luxon), enviar/recibir ISO 8601.
- Subida de comprobantes e imágenes de inspiración.

## Skills disponibles
- `frontend-design` (`.agents/skills/frontend-design`): guía para diseño visual distintivo e intencional (dirección estética, tipografía, decisiones que no parezcan plantillas). Usar al construir UI nueva o rediseñar. Instalado desde https://github.com/anthropics/skills.

## Reglas
- Textos de UI en español, centralizados.
- No manejar datos de tarjeta.
- No confiar en validaciones del cliente: el backend valida siempre.
- Consumir únicamente `/api/v1`.

## Reporta a
`.agents/orchestrator.md`
