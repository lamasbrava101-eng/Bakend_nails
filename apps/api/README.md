# NailStudio API

Backend for NailStudio (Module 1: auth + profiles).

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — compile TypeScript
- `npm run test` — run Vitest + Supertest
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint

## Notes

- Data is stored in an in-memory store (Map) for the prototype; Prisma schema in `prisma/schema.prisma` describes the conceptual MySQL 8 schema.
- Endpoints under `/api/v1`. Refresh token delivered in httpOnly cookie scoped to `/api/v1/auth/refresh`.
- Public register always assigns role `CLIENT`.