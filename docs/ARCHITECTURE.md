# Architecture

FableGO is a React Native / Expo phone client. It sends authenticated requests
to the FableGear computer-side service over its Tailscale address. It is not a
file browser or an audio-file client.

## Layer boundary

| Capability | FableGear layer | API behavior |
| --- | --- | --- |
| Library, track metadata, tags, playlists | Record Room | Return and edit database metadata only |
| Import into the FableGear database | Record Room | Start an import job, report status |
| Download landing files, moves, USB export | Chop Shop | Start a file job, report status |

Record Room responses must not reveal filesystem paths. A download request
contains a purchase URL or order reference only; FableGO does not log in to
stores or fetch media. Imported-file movement and USB writes are performed on
the computer, by Chop Shop, and represented as jobs.

## App structure

- `src/theme/tokens.ts`: sole source of UI colors, spacing, and typography.
- `src/api/`: OpenAPI-derived types, typed service client, and mock backend.
- `src/connection/`: Tailscale host configuration, secure token storage,
  reachability, and the local library cache.
- `App.tsx`: four tab shell and placeholder/themed workflows.

The app defaults to its in-process mock API. Set
`EXPO_PUBLIC_USE_MOCK_API=false` when connecting to the service. In service
mode, the mobile client stores the last successful library snapshot in SQLite
and falls back to it for disconnected browsing. Edits and jobs require a live
connection. Job state is read from the computer, never assumed from a request
submission.

## Interaction rules

- Search and filter by received BPM, musical/Camelot key, genre, and tags.
- Keep content focused on records, tracks, playlists, and metadata.
- Keep destructive actions explicit and pass a dry-run flag before mutation.
- Use secure platform storage for the token; do not expose it in UI/log output.

See [API.md](API.md), [SECURITY.md](SECURITY.md), and
[FABLEGEAR_SERVICE.md](FABLEGEAR_SERVICE.md) for the service contract.
