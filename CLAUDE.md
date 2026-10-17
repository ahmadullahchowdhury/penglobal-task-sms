# Project rules
Stack: Next.js 16 App Router, TypeScript, PostgreSQL, Prisma, Tailwind, shadcn/ui, Zod, Vitest.
Always read DECISIONS.md and prisma/schema.prisma before changing anything.

@AGENTS.md

Conventions:
- Business rules live in pure functions in lib/domain (balance, overdue, classification,
  late flag, status transitions, student ID format). Routes and UI call them. No rules in components.
- Money is integer minor units. Format only through lib/money.ts.
- Validate every API input with Zod. Return errors as { error: { code, message, fields? } }.
- Check the role on the server in every route with requireRole(). Never rely on hidden UI.
- Multi-step writes use prisma.$transaction.
- Never hard delete students, payments or grades.
- Never store balances. Never edit payments (reverse them).
- No mock data in component state. Everything reads from the database.
- Do not add dependencies or features that were not asked for in the current phase.
- Never commit .env. Keep .env.example current.
