# Repository instructions

## Product and architecture
- This is the React + TypeScript frontend for a personal, Chinese-language utilities library deployed beside `../assan-server-store`.
- Use strict TypeScript and functional React components. Keep route-level pages in `src/pages`, user workflows in `src/features`, and shared UI in `src/components`.
- The authenticated app shell protects all library routes. Authentication uses same-origin HTTP-only server sessions; keep credentials and session tokens out of browser storage.
- Use `/api` for backend requests. Preserve the API's `{data: ...}` success and `{error:{code,message}}` error envelopes.
- Keep the initial catalog honest: preview cards are not working tools unless a complete utility is implemented.

## Changes and documentation
- Inspect the working tree and nearby code before editing; preserve unrelated work.
- Keep visible UI accessible: semantic landmarks, keyboard-operable controls, associated labels, focus states, and responsive layouts.
- Update `README.md` when setup, scripts, architecture, or deployment changes. Record substantial, hard-to-reverse design tradeoffs as ADRs; keep `CONTEXT.md` a glossary only.
- Use Conventional Commit messages if commits are explicitly requested. Never commit or push unless asked.

## Verification
- Run `pnpm lint`, `pnpm test`, and `pnpm build` for frontend changes.
- For API changes, read `../assan-server-store/docs/api.md` and verify request paths, CSRF behavior, cookies, and response envelopes against the backend.
- Keep `AGENTS.md` focused on repository conventions; package scripts and config remain the source of truth for commands and tool versions.
