# NailStudio Web

Frontend web del sistema NailStudio (React + Vite + TypeScript + Tailwind).

## Requisitos
- Node.js LTS
- API corriendo en http://localhost:3000 (apps/api)

## Setup
```
cp .env.example .env
npm install
npm run dev
```

## Scripts
- `npm run dev` — dev server (proxy /api -> http://localhost:3000)
- `npm run build` — build de producción
- `npm run preview` — preview del build
- `npm run typecheck` — verificación de tipos
- `npm run lint` — lint
