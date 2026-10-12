# FableGear service API

The normative OpenAPI 3 contract is [`api/openapi.yaml`](../api/openapi.yaml).
The typed client declarations are generated into `src/api/schema.d.ts` with
`npm run api:generate`; `src/api/client.ts` provides the app-facing client.

## Transport and conventions

- All service traffic uses the configured Tailscale host. The service must
  bind only to its Tailscale interface.
- Every HTTP request sends an Authorization bearer header; the token is read
  from platform secure storage, never embedded in source or logged.
- JSON is UTF-8. Errors use an HTTP status and a JSON `message`.
- Record Room data contains metadata only. No API response includes a local
  filesystem path.
- Mutations that may delete or overwrite accept `dryRun`; callers require
  explicit user confirmation for the actual destructive action.

## Endpoints

| Method | Path | Layer | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Service | Authenticated reachability check |
| GET | `/library/tracks` | Record Room | Search/filter metadata |
| PUT | `/library/tracks/{trackId}/tags` | Record Room | Edit track tags |
| GET | `/playlists` | Record Room | List playlist metadata |
| PUT | `/playlists/{playlistId}` | Record Room | Edit playlist name/order/membership |
| POST | `/downloads` | Chop Shop | Request a download job from a purchase URL or order reference |
| POST | `/imports` | Record Room + Chop Shop | Import downloaded items into Record Room as a job |
| POST | `/exports/usb` | Chop Shop | Dry-run or start a USB export job |
| GET | `/jobs` | Job service | List durable jobs so the app can resume polling |
| GET | `/jobs/{jobId}` | Job service | Read computer-owned job state |

Jobs expose `queued`, `running`, `done`, or `failed`; a request response is
never treated as a completed operation. The mobile app polls job status.

The mock client implements sample track/playlist data and USB export state
transitions for local development. It does not emulate store access or local
filesystem behavior.
