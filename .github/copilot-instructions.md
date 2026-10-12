# FableGO contributor instructions

- FableGO is a remote for FableGear over Tailscale. It must never read, write,
  move, or display audio-file paths.
- Route metadata-only library, tag, playlist, and database-import operations
  through Record Room. Route downloads, file moves, and USB exports through
  Chop Shop jobs.
- Keep the UI database-first. Use the dark Record Room theme and Signal Cyan
  accent; define colors, spacing, and typography in `src/theme/tokens.ts`.
- Design for one-handed use with large touch targets and fast library search
  and BPM, key, genre, and tag filters.
- Show connection state. When disconnected, allow cached read-only browsing
  and never silently queue an operation.
- Bind service communication to the Tailscale interface and send an auth token
  on each request. Store tokens with Keychain/Keystore (`expo-secure-store`);
  never hard-code or log them.
- Ask for explicit confirmation before destructive actions and expose an API
  dry-run option.
- The computer owns job state. Poll or subscribe for status; do not infer
  success from a submitted request.
- Do not add store-scraping/login logic, key/BPM analysis, cloud services,
  user accounts, or analytics.
- Run `npm run lint`, `npm run typecheck`, and `npm test -- --runInBand` for
  code changes.
