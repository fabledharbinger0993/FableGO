# FableGear-side service work

This repository is the phone client only. The FableGear repository/service
must add the following before live mode is usable. Do not implement or modify
those changes here.

## Network and authentication

- Add a small HTTP service bound exclusively to the host's Tailscale interface
  and advertised using its tailnet DNS name or IP.
- Require a configured bearer token for every endpoint, including health and
  job status. Reject unauthenticated requests and do not log credentials.
- Use TLS where available in the deployment; never expose a public listener.

## Record Room

- `GET /library/tracks`: return track/record metadata and support text search
  and BPM, musical key, Camelot key, genre, and tag filters.
- `PUT /library/tracks/{trackId}/tags`: edit tags using the existing Record
  Room database layer.
- `GET /playlists`: return playlist metadata and ordered track IDs.
- `PUT /playlists/{playlistId}`: update playlist metadata/membership in the
  existing database layer.
- Keep paths, storage locations, and file operations out of these endpoints.
- Provide import orchestration that adds completed downloads to the database
  using existing Record Room import layers.

## Chop Shop and jobs

- `POST /downloads`: accept a purchase URL or order reference; leave provider
  authentication/fetching policy to FableGear. Return a job ID.
- `POST /imports`: accept completed download references and start a database
  import job; return a job ID.
- `POST /exports/usb`: support dry-run previews and confirmed export requests,
  including explicit overwrite intent. Route all USB writes through Chop Shop.
- Add a common job record/status API with computer-owned `queued`, `running`,
  `done`, and `failed` states. Expose `GET /jobs` and `GET /jobs/{jobId}` with
  durable status suitable for a phone app that is backgrounded between polls.
- Require preview/confirmation and prevent dry runs from modifying data/files.

Implementations should match [`../api/openapi.yaml`](../api/openapi.yaml) and
use FableGear's existing layers rather than duplicating their work.
