# Tooling

Project use regular Vite + npm.

## Commands

- `npm install` — install deps
- `npm run dev` — start dev server
- `npm run lint` — run ESLint
- `npm run typecheck` — run TypeScript checks
- `npm run build` — build production bundle
- `npm run preview` — preview production build
- `npm test` — run Vitest
- `npm run check` — run lint + typecheck + tests + build

## Notes

- Use `npm`, not `pnpm`, `yarn`, or `vp`.
- Import `defineConfig` from `vite`.
- Import test helpers from `vitest`.
- Keep config in standard Vite format only. No Vite+ fields like `staged`, `fmt`, or `lint` in `vite.config.ts`.

## Review Checklist for Agents

- [ ] Run `npm install` after pulling remote changes and before getting started.
- [ ] Run `npm run check` to validate changes.
